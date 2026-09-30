import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { user, role, name, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-base font-semibold leading-tight">
            Training Portal
            <span className="block text-[11px] font-normal text-muted-foreground">
              Skill Development Cell
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/programs">
            <Button variant="ghost" size="sm">
              Programs
            </Button>
          </Link>
          {user && role === "student" && (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link to="/my-trainings">
                <Button variant="ghost" size="sm">
                  My Trainings
                </Button>
              </Link>
            </>
          )}
          {user && role === "admin" && (
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {name || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
