import { createClient } from '@supabase/supabase-js';
import type { AppData, AppSettings, Split, WeekSchedule, WorkoutLog, PR, WeighIn } from './types';

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(URL, KEY);

// ─── Fetch all data from Supabase ────────────────────────────────────────────

export async function fetchAll(): Promise<Partial<AppData> | null> {
  const [splits, schedules, workoutLogs, prs, weighIns, config] = await Promise.all([
    supabase.from('splits').select('*'),
    supabase.from('schedules').select('*'),
    supabase.from('workout_logs').select('*'),
    supabase.from('prs').select('*'),
    supabase.from('weigh_ins').select('*'),
    supabase.from('app_config').select('*'),
  ]);

  // If any critical fetch fails, return null to fall back to localStorage
  if (splits.error || schedules.error || workoutLogs.error) return null;

  const settingsRow = config.data?.find(r => r.key === 'settings');
  const settings: AppSettings | undefined = settingsRow?.value;

  return {
    splits: (splits.data || []).map(dbToSplit),
    schedules: (schedules.data || []).map(dbToSchedule),
    workoutLogs: (workoutLogs.data || []).map(dbToWorkoutLog),
    prs: (prs.data || []).map(dbToPR),
    weighIns: (weighIns.data || []).map(dbToWeighIn),
    settings,
  };
}

// ─── Sync settings ────────────────────────────────────────────────────────────

export async function syncSettings(settings: AppSettings) {
  await supabase.from('app_config').upsert({ key: 'settings', value: settings, updated_at: new Date().toISOString() });
}

// ─── Splits ──────────────────────────────────────────────────────────────────

export async function upsertSplit(s: Split) {
  await supabase.from('splits').upsert({ id: s.id, name: s.name, color: s.color, exercises: s.exercises, updated_at: new Date().toISOString() });
}
export async function deleteSplit(id: string) {
  await supabase.from('splits').delete().eq('id', id);
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function upsertSchedule(s: WeekSchedule) {
  await supabase.from('schedules').upsert({ id: s.id, name: s.name, days: s.days, updated_at: new Date().toISOString() });
}
export async function deleteSchedule(id: string) {
  await supabase.from('schedules').delete().eq('id', id);
}

// ─── Workout logs ────────────────────────────────────────────────────────────

export async function upsertWorkoutLog(w: WorkoutLog) {
  await supabase.from('workout_logs').upsert({
    id: w.id, user_id: w.userId, date: w.date, split_id: w.splitId,
    exercises: w.exercises, attended: w.attended, updated_at: new Date().toISOString(),
  });
}
export async function deleteWorkoutLog(id: string) {
  await supabase.from('workout_logs').delete().eq('id', id);
}

// ─── PRs ─────────────────────────────────────────────────────────────────────

export async function upsertPR(p: PR) {
  await supabase.from('prs').upsert({
    id: p.id, user_id: p.userId, exercise_name: p.exerciseName,
    weight: p.weight, reps: p.reps, date: p.date, notes: p.notes ?? null,
    updated_at: new Date().toISOString(),
  });
}
export async function deletePR(id: string) {
  await supabase.from('prs').delete().eq('id', id);
}

// ─── Weigh-ins ───────────────────────────────────────────────────────────────

export async function upsertWeighIn(w: WeighIn) {
  await supabase.from('weigh_ins').upsert({
    id: w.id, user_id: w.userId, date: w.date, weight: w.weight,
    updated_at: new Date().toISOString(),
  });
}
export async function deleteWeighIn(id: string) {
  await supabase.from('weigh_ins').delete().eq('id', id);
}

// ─── DB → App type mappers ───────────────────────────────────────────────────

function dbToSplit(r: Record<string, unknown>): Split {
  return { id: r.id as string, name: r.name as string, color: r.color as string, exercises: r.exercises as Split['exercises'] };
}
function dbToSchedule(r: Record<string, unknown>): WeekSchedule {
  return { id: r.id as string, name: r.name as string, days: r.days as WeekSchedule['days'] };
}
function dbToWorkoutLog(r: Record<string, unknown>): WorkoutLog {
  return { id: r.id as string, userId: r.user_id as string, date: r.date as string, splitId: r.split_id as string, exercises: r.exercises as WorkoutLog['exercises'], attended: r.attended as boolean };
}
function dbToPR(r: Record<string, unknown>): PR {
  return { id: r.id as string, userId: r.user_id as string, exerciseName: r.exercise_name as string, weight: r.weight as number, reps: r.reps as number, date: r.date as string, notes: r.notes as string | undefined };
}
function dbToWeighIn(r: Record<string, unknown>): WeighIn {
  return { id: r.id as string, userId: r.user_id as string, date: r.date as string, weight: r.weight as number };
}
