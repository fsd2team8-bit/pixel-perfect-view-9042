import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, isAdmin, json, parseBody } from "@/lib/rest";

const updateSchema = z
  .object({
    attendanceStatus: z.enum(["pending", "present", "absent"]).optional(),
    completionStatus: z.enum(["ongoing", "completed", "dropped"]).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "No fields to update" });

export const Route = createFileRoute("/registrations/$id")({
  server: {
    handlers: {
      // PUT /registrations/:id — admin marks attendance / completion status
      PUT: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (!auth) return json({ message: "Unauthorized" }, 401);
        if (!(await isAdmin(auth.client, auth.userId))) {
          return json({ message: "Forbidden: admin access required" }, 403);
        }

        const parsed = await parseBody(request, updateSchema);
        if ("error" in parsed) return parsed.error;

        const { data, error } = await auth.client
          .from("registrations")
          .update({
            ...(parsed.body.attendanceStatus !== undefined ? { attendance_status: parsed.body.attendanceStatus } : {}),
            ...(parsed.body.completionStatus !== undefined ? { completion_status: parsed.body.completionStatus } : {}),
          })
          .eq("id", params.id)
          .select()
          .single();
        if (error || !data) return json({ message: error?.message ?? "Registration not found" }, 404);
        return json({ message: "Registration updated", registration: data });
      },
    },
  },
});
