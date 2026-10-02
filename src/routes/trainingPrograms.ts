import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { makeClient, authenticate, isAdmin, json, parseBody } from "@/lib/rest";

export const Route = createFileRoute("/trainingPrograms")({
  server: {
    handlers: {
      // GET /trainingPrograms — public list of all programs
      GET: async () => {
        const client = makeClient();
        if (!client) return json({ message: "Server not configured" }, 500);
        const { data, error } = await client
          .from("training_programs")
          .select("*")
          .order("start_date", { ascending: true });
        if (error) return json({ message: error.message }, 500);
        return json(data ?? []);
      },

      // POST /trainingPrograms — admin only, adds a program
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth) return json({ message: "Unauthorized" }, 401);
        if (!(await isAdmin(auth.client, auth.userId))) {
          return json({ message: "Forbidden: admin access required" }, 403);
        }

        const parsed = await parseBody(
          request,
          z.object({
            trainingTitle: z.string().min(1, "trainingTitle is required"),
            trainerName: z.string().default(""),
            trainingCategory: z.string().default("General"),
            description: z.string().default(""),
            startDate: z.string().min(1, "startDate is required"),
            endDate: z.string().min(1, "endDate is required"),
            duration: z.string().default(""),
            availableSeats: z.coerce.number().int().min(0).default(30),
          }),
        );
        if ("error" in parsed) return parsed.error;

        const { data, error } = await auth.client
          .from("training_programs")
          .insert({
            title: parsed.body.trainingTitle,
            trainer_name: parsed.body.trainerName,
            category: parsed.body.trainingCategory,
            description: parsed.body.description,
            start_date: parsed.body.startDate,
            end_date: parsed.body.endDate,
            duration: parsed.body.duration,
            available_seats: parsed.body.availableSeats,
          })
          .select()
          .single();
        if (error) return json({ message: error.message }, 400);
        return json({ message: "Training program added", program: data }, 201);
      },
    },
  },
});
