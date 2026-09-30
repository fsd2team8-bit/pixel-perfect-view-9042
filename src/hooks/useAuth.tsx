import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "student";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  name: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  role: null,
  name: "",
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDetails = async (uid: string | undefined) => {
    if (!uid) {
      setRole(null);
      setName("");
      return;
    }
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("name").eq("id", uid).maybeSingle(),
    ]);
    const list = (roles ?? []).map((r) => r.role as AppRole);
    setRole(list.includes("admin") ? "admin" : list.length > 0 ? "student" : null);
    setName(profile?.name ?? "");
  };

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setTimeout(() => {
        void loadDetails(nextSession?.user.id);
      }, 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadDetails(data.session?.user.id);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    role,
    name,
    loading,
    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadDetails(data.session?.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
