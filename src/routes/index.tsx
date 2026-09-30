import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ClipboardList, Users, BarChart3, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { formatDate, toneFor, type TrainingProgram } from "@/lib/portal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Training Program Management Portal | Skill Development Cell" },
      {
        name: "description",
        content:
          "Browse workshops, bootcamps and certification courses, register online and track your attendance and completion records.",
      },
      { property: "og:title", content: "Training Program Management Portal" },
      {
        property: "og:description",
        content:
          "Browse workshops, bootcamps and certification courses, register online and track attendance.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: ClipboardList,
    title: "Program catalogue",
    text: "Every workshop, bootcamp and certification course in one place with dates, trainer and seats.",
  },
  {
    icon: CalendarCheck,
    title: "One-click registration",
    text: "Students reserve a seat instantly and see their registration status update live.",
  },
  {
    icon: Users,
    title: "Attendance marking",
    text: "Coordinators mark attendance per participant after each session.",
  },
  {
    icon: BarChart3,
    title: "Completion records",
    text: "Completed trainings stay on the student record for placement files.",
  },
];

function Home() {
  const { user, role } = useAuth();

  const { data: programs } = useQuery({
    queryKey: ["programs", "preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_programs")
        .select("*")
        .order("start_date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data as TrainingProgram[];
    },
  });

  const primaryTo = !user ? "/auth" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <section className="hero-gradient relative overflow-hidden">
        <div className="surface-grid absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-4 inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent">
            Skill Development &amp; Training Management
          </p>
          <h1 className="max-w-3xl text-4xl font-bold text-primary-foreground md:text-6xl">
            Run every campus training program from one portal.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-primary-foreground/75 md:text-lg">
            No more Google Forms and spreadsheets. Publish programs, let students register
            online, mark attendance session by session and keep completion records safe.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={primaryTo}>
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                {user ? "Go to dashboard" : "Get started"}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/programs">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                Browse programs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Upcoming programs</h2>
          <Link to="/programs" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {(programs ?? []).map((p) => (
            <article
              key={p.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${toneFor(p.category)}`}
              >
                {p.category}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
                {p.description}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {formatDate(p.start_date)} – {formatDate(p.end_date)} · {p.duration}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Training Program Management Portal · Skill Development Cell
      </footer>
    </div>
  );
}
