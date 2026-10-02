import { createFileRoute } from "@tanstack/react-router";
import { authenticate, json } from "@/lib/rest";

export const Route = createFileRoute("/registrations")({
  server: {
    handlers: {
      // GET /registrations — students see their own; admins see all (RLS enforced)
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth) return json({ message: "Unauthorized" }, 401);

        const { data, error } = await auth.client
          .from("registrations")
          .select("*, training:training_programs(*)")
          .order("registration_date", { ascending: false });
        if (error) return json({ message: error.message }, 500);
        return json(data ?? []);
      },
    },
  },
});
