import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, User2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { formatDate, toneFor, type Registration, type TrainingProgram } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/my-trainings")({
  head: () => ({
    meta: [
      { title: "My trainings | Training Program Portal" },
      {
        name: "description",
        content:
          "Track every training you registered for, your attendance status and completed programs.",
      },
      { property: "og:title", content: "My trainings" },
      {
        property: "og:description",
        content: "Registered trainings, attendance status and completed programs.",
      },
    ],
  }),
  component: MyTrainings,
});

const statusTone: Record<string, string> = {
  present: "bg-success/15 text-success",
  absent: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success",
  ongoing: "bg-accent/25 text-accent-foreground",
};

function MyTrainings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-trainings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [regs, progs] = await Promise.all([
        supabase
          .from("registrations")
          .select("*")
          .eq("student_id", user!.id)
          .order("registration_date", { ascending: false }),
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
  const byId = new Map((data?.programs ?? []).map((p) => [p.id, p]));

  const cancel = async (id: string) => {
    const { error } = await supabase.from("registrations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Registration cancelled");
    await queryClient.invalidateQueries();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold">My trainings</h1>
        <p className="mt-2 text-muted-foreground">
          Attendance and completion status for every program you joined.
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : registrations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
            <Link to="/programs" className="mt-4 inline-block">
              <Button>Browse programs</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {registrations.map((r) => {
              const p = byId.get(r.training_id);
              if (!p) return null;
              return (
                <article
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-6 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneFor(p.category)}`}
                      >
                        {p.category}
                      </span>
                      <h2 className="mt-3 text-lg font-semibold">{p.title}</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>
                      <X className="size-4" />
                      Cancel
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <User2 className="size-4" /> {p.trainer_name}
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-4" />
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                    <span
                      className={`rounded-full px-2.5 py-1 capitalize ${statusTone[r.attendance_status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      Attendance: {r.attendance_status}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 capitalize ${statusTone[r.completion_status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {r.completion_status}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
