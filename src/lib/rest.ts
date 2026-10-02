import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { z } from "zod";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function supabaseFetch(key: string, token?: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    // New-format sb_ keys are opaque, not JWTs: send apikey, not a bearer.
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };
}

export function makeClient(token?: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    global: { fetch: supabaseFetch(key, token) },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

/** Validates the Authorization: Bearer <access_token> header against Supabase Auth. */
export async function authenticate(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.split(".").length !== 3) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id: string; email?: string };
  const client = makeClient(token);
  if (!client) return null;
  return { client, token, userId: user.id, user };
}

export async function isAdmin(client: ReturnType<typeof makeClient>, userId: string) {
  if (!client) return false;
  const { data } = await client.rpc("has_role", { _user_id: userId, _role: "admin" as never });
  return data === true;
}

/** Parses and validates a JSON request body with a Zod schema. Returns a 400 Response on failure. */
export async function parseBody<S extends z.ZodTypeAny>(request: Request, schema: S) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: json({ message: "Invalid JSON body" }, 400) } as const;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: json({ message: result.error.issues[0]?.message ?? "Invalid request body" }, 400) } as const;
  }
  return { body: result.data as z.infer<S> } as const;
}
