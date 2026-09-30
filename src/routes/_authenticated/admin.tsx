import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, toneFor, type Registration, type TrainingProgram } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard | Training Program Portal" },
      {
        name: "description",
        content:
          "Create training programs, review student registrations and mark attendance and completion.",
      },
      { property: "og:title", content: "Admin dashboard" },
      {
        property: "og:description",
        content: "Manage training programs, registrations and attendance records.",
      },
    ],
  }),
  component: AdminDashboard,
});

interface ProfileRow {
  id: string;
  name: string;
  email: string;
}

const emptyForm = {
  title: "",
  trainer_name: "",
  category: "",
  description: "",
  start_date: "",
  end_date: "",
  duration: "",
  available_seats: 30,
};

function AdminDashboard() {
  const { role, loading } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = role === "admin";

  const { data } = useQuery({
    queryKey: ["admin-data"],
    enabled: isAdmin,
    queryFn: async () => {
      const [progs, regs, profs] = await Promise.all([
        supabase.from("training_programs").select("*").order("start_date"),
        supabase.from("registrations").select("*").order("registration_date", { ascending: false }),
        supabase.from("profiles").select("id, name, email"),
      ]);
      if (progs.error) throw progs.error;
      if (regs.error) throw regs.error;
      if (profs.error) throw profs.error;
      return {
        programs: progs.data as TrainingProgram[],
        registrations: regs.data as Registration[],
        profiles: profs.data as ProfileRow[],
      };
    },
  });

  const programs = data?.programs ?? [];
  const registrations = data?.registrations ?? [];
  const profiles = new Map((data?.profiles ?? []).map((p) => [p.id, p]));
  const programById = new Map(programs.map((p) => [p.id, p]));

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const saveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      category: form.category || "General",
      available_seats: Number(form.available_seats) || 0,
    };
    const { error } = editingId
      ? await supabase.from("training_programs").update(payload).eq("id", editingId)
      : await supabase.from("training_programs").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Program updated" : "Program added");
    resetForm();
    await queryClient.invalidateQueries();
  };

  const editProgram = (p: TrainingProgram) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      trainer_name: p.trainer_name,
      category: p.category,
      description: p.description,
      start_date: p.start_date,
      end_date: p.end_date,
      duration: p.duration,
      available_seats: p.available_seats,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProgram = async (id: string) => {
    const { error } = await supabase.from("training_programs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Program removed");
    await queryClient.invalidateQueries();
  };

  const updateRegistration = async (id: string, patch: Partial<Registration>) => {
    const { error } = await supabase.from("registrations").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Record updated");
    await queryClient.invalidateQueries();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Coordinator access only</h1>
          <p className="mt-3 text-muted-foreground">
            Unlock the admin dashboard from your student dashboard using the staff access code.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block">
            <Button>Go to dashboard</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          {programs.length} programs · {registrations.length} registrations
        </p>

        <Tabs defaultValue="programs" className="mt-8">
          <TabsList>
            <TabsTrigger value="programs">Manage programs</TabsTrigger>
            <TabsTrigger value="registrations">Registrations &amp; attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="mt-6 space-y-8">
            <form
              onSubmit={saveProgram}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Plus className="size-5 text-primary" />
                {editingId ? "Update training program" : "Add training program"}
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Program title</Label>
                  <Input
                    id="title"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainer">Trainer name</Label>
                  <Input
                    id="trainer"
                    value={form.trainer_name}
                    onChange={(e) => setForm({ ...form, trainer_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="Web Development"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start">Start date</Label>
                  <Input
                    id="start"
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End date</Label>
                  <Input
                    id="end"
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    placeholder="2 Weeks"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">Available seats</Label>
                  <Input
                    id="seats"
                    type="number"
                    min={0}
                    value={form.available_seats}
                    onChange={(e) =>
                      setForm({ ...form, available_seats: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button type="submit" disabled={busy}>
                  {editingId ? "Save changes" : "Add program"}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              {programs.map((p) => {
                const count = registrations.filter((r) => r.training_id === p.id).length;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-card"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneFor(p.category)}`}
                        >
                          {p.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3.5" /> {count} registered
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">{p.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.trainer_name} · {formatDate(p.start_date)} – {formatDate(p.end_date)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editProgram(p)}>
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteProgram(p.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="registrations" className="mt-6">
            {registrations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No student registrations yet.
              </p>
            ) : (
              <div className="space-y-3">
                {registrations.map((r) => {
                  const student = profiles.get(r.student_id);
                  const program = programById.get(r.training_id);
                  return (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-card"
                    >
                      <div>
                        <p className="font-semibold">{student?.name || student?.email || "Student"}</p>
                        <p className="text-sm text-muted-foreground">
                          {program?.title ?? "Program"} ·{" "}
                          {new Date(r.registration_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={r.attendance_status}
                          onValueChange={(v) => updateRegistration(r.id, { attendance_status: v })}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={r.completion_status}
                          onValueChange={(v) => updateRegistration(r.id, { completion_status: v })}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
