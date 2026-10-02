import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, isAdmin, json, parseBody } from "@/lib/rest";

const updateSchema = z
  .object({
    trainingTitle: z.string().min(1).optional(),
    trainerName: z.string().optional(),
    trainingCategory: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    duration: z.string().optional(),
    availableSeats: z.coerce.number().int().min(0).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "No fields to update" });

export const Route = createFileRoute("/trainingPrograms/$id")({
  server: {
    handlers: {
      // PUT /trainingPrograms/:id — admin only, updates a program
      PUT: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (!auth) return json({ message: "Unauthorized" }, 401);
        if (!(await isAdmin(auth.client, auth.userId))) {
          return json({ message: "Forbidden: admin access required" }, 403);
        }

        const parsed = await parseBody(request, updateSchema);
        if ("error" in parsed) return parsed.error;

        const { data, error } = await auth.client
          .from("training_programs")
          .update({
            ...(parsed.body.trainingTitle !== undefined ? { title: parsed.body.trainingTitle } : {}),
            ...(parsed.body.trainerName !== undefined ? { trainer_name: parsed.body.trainerName } : {}),
            ...(parsed.body.trainingCategory !== undefined ? { category: parsed.body.trainingCategory } : {}),
            ...(parsed.body.description !== undefined ? { description: parsed.body.description } : {}),
            ...(parsed.body.startDate !== undefined ? { start_date: parsed.body.startDate } : {}),
            ...(parsed.body.endDate !== undefined ? { end_date: parsed.body.endDate } : {}),
            ...(parsed.body.duration !== undefined ? { duration: parsed.body.duration } : {}),
            ...(parsed.body.availableSeats !== undefined ? { available_seats: parsed.body.availableSeats } : {}),
          })
          .eq("id", params.id)
          .select()
          .single();
        if (error || !data) return json({ message: error?.message ?? "Program not found" }, 404);
        return json({ message: "Training program updated", program: data });
      },

      // DELETE /trainingPrograms/:id — admin only, removes a program and its registrations
      DELETE: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (!auth) return json({ message: "Unauthorized" }, 401);
        if (!(await isAdmin(auth.client, auth.userId))) {
          return json({ message: "Forbidden: admin access required" }, 403);
        }

        // Registrations reference the program; clear them first (admin bypasses RLS).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("registrations").delete().eq("training_id", params.id);

        const { data, error } = await auth.client
          .from("training_programs")
          .delete()
          .eq("id", params.id)
          .select()
          .single();
        if (error || !data) return json({ message: error?.message ?? "Program not found" }, 404);
        return json({ message: "Training program deleted", program: data });
      },
    },
  },
});
