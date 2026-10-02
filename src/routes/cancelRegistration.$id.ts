import { createFileRoute } from "@tanstack/react-router";
import { authenticate, json } from "@/lib/rest";

export const Route = createFileRoute("/cancelRegistration/$id")({
  server: {
    handlers: {
      // DELETE /cancelRegistration/:id — student cancels their own registration
      DELETE: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (!auth) return json({ message: "Unauthorized" }, 401);

        const { data: registration } = await auth.client
          .from("registrations")
          .select("id, training_id")
          .eq("id", params.id)
          .single();
        if (!registration) return json({ message: "Registration not found" }, 404);

        const { error, count } = await auth.client
          .from("registrations")
          .delete({ count: "exact" })
          .eq("id", params.id);
        if (error) return json({ message: error.message }, 400);
        if (!count) return json({ message: "You can only cancel your own registration" }, 403);

        // Give the seat back.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: program } = await supabaseAdmin
          .from("training_programs")
          .select("available_seats")
          .eq("id", registration.training_id)
          .single();
        if (program) {
          await supabaseAdmin
            .from("training_programs")
            .update({ available_seats: program.available_seats + 1 })
            .eq("id", registration.training_id);
        }

        return json({ message: "Registration cancelled" });
      },
    },
  },
});
