import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { makeClient, json, parseBody } from "@/lib/rest";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const Route = createFileRoute("/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = await parseBody(request, schema);
        if ("error" in parsed) return parsed.error;

        const client = makeClient();
        if (!client) return json({ message: "Server not configured" }, 500);

        const { data, error } = await client.auth.signUp({
          email: parsed.body.email,
          password: parsed.body.password,
          options: { data: { name: parsed.body.name } },
        });
        if (error) return json({ message: error.message }, 400);

        const session = data.session;
        if (!session) {
          return json(
            { message: "Registration successful. Please verify your email and sign in." },
            201,
          );
        }
        return json(
          {
            message: "Registration successful",
            token: session.access_token,
            user: { id: data.user?.id, name: parsed.body.name, email: parsed.body.email, role: "student" },
          },
          201,
        );
      },
    },
  },
});
