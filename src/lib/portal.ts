export interface TrainingProgram {
  id: string;
  title: string;
  trainer_name: string;
  category: string;
  description: string;
  start_date: string;
  end_date: string;
  duration: string;
  available_seats: number;
}

export interface Registration {
  id: string;
  student_id: string;
  training_id: string;
  registration_date: string;
  attendance_status: string;
  completion_status: string;
}

export function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const categoryTone: Record<string, string> = {
  "Web Development": "bg-primary/10 text-primary",
  "Data Science": "bg-success/15 text-success",
  Cloud: "bg-accent/25 text-accent-foreground",
  Security: "bg-destructive/10 text-destructive",
  Career: "bg-secondary text-secondary-foreground",
};

export function toneFor(category: string) {
  return categoryTone[category] ?? "bg-secondary text-secondary-foreground";
}
