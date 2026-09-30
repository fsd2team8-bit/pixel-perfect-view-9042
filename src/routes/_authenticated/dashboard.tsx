import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { claimAdminRole } from "@/lib/admin.functions";
import { formatDate, toneFor, type Registration, type TrainingProgram } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Student dashboard | Training Program Portal" },
      {
        name: "description",
        content:
          "Your registered trainings, attendance status and completion records in one place.",
      },
      { property: "og:title", content: "Student dashboard" },
      {
        property: "og:description",
        content: "Registered trainings, attendance status and completion records.",
      },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, name, role, refresh } = useAuth();
  const queryClient = useQueryClient();
  const claim = useServerFn(claimAdminRole);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [regs, progs] = await Promise.all([
        supabase.from("registrations").select("*").eq("student_id", user!.id),
        supabase.from("training_programs").select("*"),
      ]);
      if (regs.error) throw regs.error;
      if (progs.error) throw progs.error;
      return {
        registrations: regs.data as Registration[],
        programs: progs.data as TrainingProgram[],
      };
    },
  });

  const registrations = data?.registrations ?? [];
  const programs = data?.programs ?? [];
  const byId = new Map(programs.map((p) => [p.id, p]));
  const completed = registrations.filter((r) => r.completion_status === "completed").length;
  const present = registrations.filter((r) => r.attendance_status === "present").length;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await claim({ data: { code } });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setCode("");
    await refresh();
    await queryClient.invalidateQueries();
  };

  const stats = [
    { icon: ClipboardList, label: "Registered trainings", value: registrations.length },
    { icon: CheckCircle2, label: "Sessions marked present", value: present },
    { icon: BookOpen, label: "Completed programs", value: completed },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Hello{name ? `, ${name.split(" ")[0]}` : ""}</h1>
        <p className="mt-2 text-muted-foreground">
          Here is your training activity for this semester.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <p className="mt-4 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Recent registrations</h2>
          <Link to="/programs">
            <Button variant="outline" size="sm">
              Browse programs
            </Button>
          </Link>
        </div>

        {registrations.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            You have not registered for any training yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {registrations.slice(0, 5).map((r) => {
              const p = byId.get(r.training_id);
              if (!p) return null;
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
                >
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneFor(p.category)}`}
                    >
                      {p.category}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                      {r.attendance_status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {role !== "admin" && (
          <div className="mt-12 rounded-xl border border-border bg-secondary/60 p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-base font-semibold">Are you a training coordinator?</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the staff access code to unlock the admin dashboard. Demo code:{" "}
              <span className="font-medium text-foreground">CAMPUS-ADMIN-2026</span>
            </p>
            <form onSubmit={handleClaim} className="mt-4 flex max-w-md gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Staff access code"
                required
              />
              <Button type="submit" disabled={busy}>
                {busy ? "Checking…" : "Unlock"}
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
