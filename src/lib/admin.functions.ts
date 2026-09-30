import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ACCESS_CODE = "CAMPUS-ADMIN-2026";

export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.code.trim() !== ADMIN_ACCESS_CODE) {
      return { ok: false as const, message: "Invalid staff access code." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });

    if (error) {
      return { ok: false as const, message: "Could not grant staff access." };
    }
    return { ok: true as const, message: "Staff access granted." };
  });
