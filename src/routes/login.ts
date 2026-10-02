import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { makeClient, json, parseBody } from "@/lib/rest";

const schema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const Route = createFileRoute("/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = await parseBody(request, schema);
        if ("error" in parsed) return parsed.error;

        const client = makeClient();
        if (!client) return json({ message: "Server not configured" }, 500);

        const { data, error } = await client.auth.signInWithPassword({
          email: parsed.body.email,
          password: parsed.body.password,
        });
        if (error || !data.session) return json({ message: error?.message ?? "Invalid credentials" }, 401);

        const [{ data: roles }, { data: profile }] = await Promise.all([
          client.from("user_roles").select("role").eq("user_id", data.user.id),
          client.from("profiles").select("name").eq("id", data.user.id).maybeSingle(),
        ]);
        const role = (roles ?? []).some((r) => r.role === "admin") ? "admin" : "student";

        return json({
          message: "Login successful",
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            name: profile?.name ?? "",
            role,
          },
        });
      },
    },
  },
});
