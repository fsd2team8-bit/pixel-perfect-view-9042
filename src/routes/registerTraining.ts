import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, json, parseBody } from "@/lib/rest";

export const Route = createFileRoute("/registerTraining")({
  server: {
    handlers: {
      // POST /registerTraining — signed-in student reserves a seat in a program
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth) return json({ message: "Unauthorized" }, 401);

        const parsed = await parseBody(request, z.object({
          trainingId: z.string().uuid("trainingId must be a valid id"),
        }));
        if ("error" in parsed) return parsed.error;

        // Load the program and check for an existing registration first.
        const { data: program, error: programError } = await auth.client
          .from("training_programs")
          .select("id, title, available_seats")
          .eq("id", parsed.body.trainingId)
          .single();
        if (programError || !program) return json({ message: "Training program not found" }, 404);

        const { data: existing } = await auth.client
          .from("registrations")
          .select("id")
          .eq("student_id", auth.userId)
          .eq("training_id", parsed.body.trainingId)
          .maybeSingle();
        if (existing) return json({ message: "You are already registered for this training" }, 409);

        if (program.available_seats <= 0) {
          return json({ message: "No seats available for this training" }, 400);
        }

        // Seat decrement needs privileges the student's RLS context doesn't have,
        // so the verified write runs with the admin client (student_id = verified caller).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: registration, error } = await supabaseAdmin
          .from("registrations")
          .insert({ student_id: auth.userId, training_id: parsed.body.trainingId })
          .select()
          .single();
        if (error) return json({ message: error.message }, 400);

        await supabaseAdmin
          .from("training_programs")
          .update({ available_seats: program.available_seats - 1 })
          .eq("id", parsed.body.trainingId);

        return json({ message: "Registered successfully", registration }, 201);
      },
    },
  },
});
