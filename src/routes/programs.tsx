import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, User2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { formatDate, toneFor, type Registration, type TrainingProgram } from "@/lib/portal";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Training programs | Skill Development Cell" },
      {
        name: "description",
        content:
          "All upcoming workshops, bootcamps and certification courses with dates, trainers and available seats.",
      },
      { property: "og:title", content: "Training programs" },
      {
        property: "og:description",
        content: "Upcoming workshops, bootcamps and certification courses open for registration.",
      },
    ],
  }),
  component: ProgramsPage,
});

function ProgramsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: programs, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_programs")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as TrainingProgram[];
    },
  });

  const { data: myRegistrations } = useQuery({
    queryKey: ["registrations", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .eq("student_id", user!.id);
      if (error) throw error;
      return data as Registration[];
    },
  });

  const registeredIds = new Set((myRegistrations ?? []).map((r) => r.training_id));

  const handleRegister = async (program: TrainingProgram) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const { error } = await supabase
      .from("registrations")
      .insert({ student_id: user.id, training_id: program.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Registered for ${program.title}`);
    await queryClient.invalidateQueries({ queryKey: ["registrations"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Training programs</h1>
        <p className="mt-2 text-muted-foreground">
          Workshops, bootcamps and certification courses offered this semester.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading programs…</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {(programs ?? []).map((p) => {
              const registered = registeredIds.has(p.id);
              return (
                <article
                  key={p.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-card"
                >
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${toneFor(p.category)}`}
                  >
                    {p.category}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold">{p.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>

                  <dl className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User2 className="size-4" /> {p.trainer_name}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-4" /> {p.available_seats} seats
                    </div>
                    <div className="col-span-full flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-4" />
                      {formatDate(p.start_date)} – {formatDate(p.end_date)} · {p.duration}
                    </div>
                  </dl>

                  <div className="mt-6">
                    {role === "admin" ? (
                      <Link to="/admin">
                        <Button variant="outline" className="w-full">
                          Manage in admin
                        </Button>
                      </Link>
                    ) : registered ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Already registered
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => handleRegister(p)}>
                        {user ? "Register for this training" : "Sign in to register"}
                      </Button>
                    )}
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
