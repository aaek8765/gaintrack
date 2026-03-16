export interface User {
  id: string;
  name: string;
  color: string; // accent color
  avatar: string; // emoji
  avatarUrl?: string; // base64 uploaded photo (overrides emoji)
}

export interface SetEntry {
  reps: number;
  weight: number; // kg or lbs
}

export interface ExerciseLog {
  id: string;
  name: string;
  sets: SetEntry[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  date: string; // ISO date string YYYY-MM-DD
  splitId: string;
  exercises: ExerciseLog[];
  attended: boolean;
}

export interface Exercise {
  id: string;
  name: string;
}

export interface Split {
  id: string;
  name: string; // e.g. "Push", "Arms", "Legs"
  color: string;
  exercises: Exercise[];
}

export interface WeekScheduleDay {
  dayIndex: number; // 0=Mon, 6=Sun
  splitId: string | null;
}

export interface WeekSchedule {
  id: string;
  name: string;
  days: WeekScheduleDay[]; // 7 entries
}

export interface PR {
  id: string;
  userId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  notes?: string;
}

export type WeightUnit = 'kg' | 'lbs';

export interface AppSettings {
  weightUnit: WeightUnit;
  users: User[];
  activeScheduleId: string | null;
}

export interface WeighIn {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  weight: number; // in settings.weightUnit
}

export interface AppData {
  settings: AppSettings;
  splits: Split[];
  schedules: WeekSchedule[];
  workoutLogs: WorkoutLog[];
  prs: PR[];
  weighIns: WeighIn[];
}
