import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import type { AppData, AppSettings, Split, WeekSchedule, WorkoutLog, PR, User, WeighIn } from './types';
import { format } from 'date-fns';
import {
  supabase, fetchAll,
  syncSettings, upsertSplit, deleteSplit, upsertSchedule, deleteSchedule,
  upsertWorkoutLog, deleteWorkoutLog, upsertPR, deletePR, upsertWeighIn, deleteWeighIn,
} from './supabase';

const DEFAULT_USERS: User[] = [
  { id: 'user1', name: 'Alex', color: '#f97316', avatar: '🦁' },
  { id: 'user2', name: 'Jordan', color: '#fb923c', avatar: '🐺' },
];

const DEFAULT_SPLITS: Split[] = [
  {
    id: 'push', name: 'Push', color: '#f97316',
    exercises: [
      { id: 'bench', name: 'Bench Press' },
      { id: 'ohp', name: 'Overhead Press' },
      { id: 'incline', name: 'Incline Dumbbell Press' },
      { id: 'laterals', name: 'Lateral Raises' },
      { id: 'tricepdown', name: 'Tricep Pushdown' },
    ],
  },
  {
    id: 'pull', name: 'Pull', color: '#ea580c',
    exercises: [
      { id: 'pullup', name: 'Pull Ups' },
      { id: 'row', name: 'Barbell Row' },
      { id: 'lat', name: 'Lat Pulldown' },
      { id: 'curl', name: 'Barbell Curl' },
      { id: 'hammer', name: 'Hammer Curl' },
    ],
  },
  {
    id: 'legs', name: 'Legs', color: '#10b981',
    exercises: [
      { id: 'squat', name: 'Squat' },
      { id: 'rdl', name: 'Romanian Deadlift' },
      { id: 'legpress', name: 'Leg Press' },
      { id: 'legcurl', name: 'Leg Curl' },
      { id: 'calf', name: 'Calf Raises' },
    ],
  },
  {
    id: 'arms', name: 'Arms', color: '#fbbf24',
    exercises: [
      { id: 'bicurl', name: 'Bicep Curl' },
      { id: 'skullcrusher', name: 'Skull Crushers' },
      { id: 'preacher', name: 'Preacher Curl' },
      { id: 'dips', name: 'Dips' },
    ],
  },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  id: 'default',
  name: 'PPL Split',
  days: [
    { dayIndex: 0, splitId: 'push' },
    { dayIndex: 1, splitId: 'pull' },
    { dayIndex: 2, splitId: 'legs' },
    { dayIndex: 3, splitId: 'push' },
    { dayIndex: 4, splitId: 'pull' },
    { dayIndex: 5, splitId: 'legs' },
    { dayIndex: 6, splitId: null },
  ],
};

const INITIAL_DATA: AppData = {
  settings: { weightUnit: 'kg', users: DEFAULT_USERS, activeScheduleId: 'default' },
  splits: DEFAULT_SPLITS,
  schedules: [DEFAULT_SCHEDULE],
  workoutLogs: [],
  prs: [],
  weighIns: [],
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_DATA'; payload: AppData }
  | { type: 'MERGE_REMOTE'; payload: Partial<AppData> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'ADD_SPLIT'; payload: Split }
  | { type: 'UPDATE_SPLIT'; payload: Split }
  | { type: 'DELETE_SPLIT'; payload: string }
  | { type: 'ADD_SCHEDULE'; payload: WeekSchedule }
  | { type: 'UPDATE_SCHEDULE'; payload: WeekSchedule }
  | { type: 'DELETE_SCHEDULE'; payload: string }
  | { type: 'LOG_ATTENDANCE'; payload: { userId: string; date: string; splitId: string } }
  | { type: 'LOG_WORKOUT'; payload: WorkoutLog }
  | { type: 'UPDATE_WORKOUT'; payload: WorkoutLog }
  | { type: 'DELETE_WORKOUT'; payload: string }
  | { type: 'ADD_PR'; payload: PR }
  | { type: 'UPDATE_PR'; payload: PR }
  | { type: 'DELETE_PR'; payload: string }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'LOG_WEIGH_IN'; payload: WeighIn }
  | { type: 'DELETE_WEIGH_IN'; payload: string };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'SET_DATA':
      return action.payload;

    case 'MERGE_REMOTE':
      return { ...state, ...action.payload };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'ADD_SPLIT':
      return { ...state, splits: [...state.splits, action.payload] };
    case 'UPDATE_SPLIT':
      return { ...state, splits: state.splits.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SPLIT':
      return { ...state, splits: state.splits.filter(s => s.id !== action.payload) };

    case 'ADD_SCHEDULE':
      return { ...state, schedules: [...state.schedules, action.payload] };
    case 'UPDATE_SCHEDULE':
      return { ...state, schedules: state.schedules.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SCHEDULE':
      return { ...state, schedules: state.schedules.filter(s => s.id !== action.payload) };

    case 'LOG_ATTENDANCE': {
      const { userId, date, splitId } = action.payload;
      const existing = state.workoutLogs.find(w => w.userId === userId && w.date === date);
      if (existing) {
        return { ...state, workoutLogs: state.workoutLogs.map(w => w.userId === userId && w.date === date ? { ...w, attended: true, splitId } : w) };
      }
      return { ...state, workoutLogs: [...state.workoutLogs, { id: crypto.randomUUID(), userId, date, splitId, exercises: [], attended: true }] };
    }

    case 'LOG_WORKOUT':
      return { ...state, workoutLogs: [...state.workoutLogs, action.payload] };
    case 'UPDATE_WORKOUT':
      return { ...state, workoutLogs: state.workoutLogs.map(w => w.id === action.payload.id ? action.payload : w) };
    case 'DELETE_WORKOUT':
      return { ...state, workoutLogs: state.workoutLogs.filter(w => w.id !== action.payload) };

    case 'ADD_PR':
      return { ...state, prs: [...state.prs, action.payload] };
    case 'UPDATE_PR':
      return { ...state, prs: state.prs.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PR':
      return { ...state, prs: state.prs.filter(p => p.id !== action.payload) };

    case 'ADD_USER':
      return { ...state, settings: { ...state.settings, users: [...state.settings.users, action.payload] } };
    case 'UPDATE_USER':
      return { ...state, settings: { ...state.settings, users: state.settings.users.map(u => u.id === action.payload.id ? action.payload : u) } };
    case 'DELETE_USER': {
      const uid = action.payload;
      return {
        ...state,
        settings: { ...state.settings, users: state.settings.users.filter(u => u.id !== uid) },
        workoutLogs: state.workoutLogs.filter(l => l.userId !== uid),
        prs: state.prs.filter(p => p.userId !== uid),
        weighIns: (state.weighIns || []).filter(w => w.userId !== uid),
      };
    }

    case 'LOG_WEIGH_IN': {
      const existing = (state.weighIns || []).find(w => w.userId === action.payload.userId && w.date === action.payload.date);
      if (existing) {
        return { ...state, weighIns: state.weighIns.map(w => w.id === existing.id ? action.payload : w) };
      }
      return { ...state, weighIns: [...(state.weighIns || []), action.payload] };
    }
    case 'DELETE_WEIGH_IN':
      return { ...state, weighIns: state.weighIns.filter(w => w.id !== action.payload) };

    default:
      return state;
  }
}

// ─── Supabase sync per action ─────────────────────────────────────────────────

async function syncAction(action: Action, state: AppData) {
  try {
    switch (action.type) {
      case 'UPDATE_SETTINGS':
        await syncSettings({ ...state.settings, ...action.payload });
        break;
      case 'ADD_USER':
      case 'UPDATE_USER':
      case 'DELETE_USER':
        // settings already updated in reducer by the time this runs — re-read from next state
        // handled via a separate effect watching settings
        break;

      case 'ADD_SPLIT':
      case 'UPDATE_SPLIT':
        await upsertSplit(action.payload);
        break;
      case 'DELETE_SPLIT':
        await deleteSplit(action.payload);
        break;

      case 'ADD_SCHEDULE':
      case 'UPDATE_SCHEDULE':
        await upsertSchedule(action.payload);
        break;
      case 'DELETE_SCHEDULE':
        await deleteSchedule(action.payload);
        break;

      case 'LOG_ATTENDANCE': {
        const { userId, date, splitId } = action.payload;
        const existing = state.workoutLogs.find(w => w.userId === userId && w.date === date);
        if (existing) {
          await upsertWorkoutLog({ ...existing, attended: true, splitId });
        } else {
          // will be upserted after reducer creates it — handled by LOG_WORKOUT path
          // We need the generated ID — just upsert with a known ID
          const newLog: WorkoutLog = { id: crypto.randomUUID(), userId, date, splitId, exercises: [], attended: true };
          await upsertWorkoutLog(newLog);
        }
        break;
      }
      case 'LOG_WORKOUT':
      case 'UPDATE_WORKOUT':
        await upsertWorkoutLog(action.payload);
        break;
      case 'DELETE_WORKOUT':
        await deleteWorkoutLog(action.payload);
        break;

      case 'ADD_PR':
      case 'UPDATE_PR':
        await upsertPR(action.payload);
        break;
      case 'DELETE_PR':
        await deletePR(action.payload);
        break;

      case 'LOG_WEIGH_IN':
        await upsertWeighIn(action.payload);
        break;
      case 'DELETE_WEIGH_IN':
        await deleteWeighIn(action.payload);
        break;
    }
  } catch (e) {
    console.error('Supabase sync error:', e);
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppContextType {
  data: AppData;
  dispatch: (action: Action) => void;
  today: string;
  loading: boolean;
  syncing: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const stored = localStorage.getItem('fitness-tracker-v1');
  const parsed = stored ? JSON.parse(stored) : null;
  const initialState: AppData = parsed ? { weighIns: [], ...parsed } : INITIAL_DATA;

  const [data, localDispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem('fitness-tracker-v1', JSON.stringify(data));
  }, [data]);

  // Sync settings (users) when they change
  const settingsRef = useRef(data.settings);
  useEffect(() => {
    if (!loading && data.settings !== settingsRef.current) {
      settingsRef.current = data.settings;
      syncSettings(data.settings).catch(console.error);
    }
  }, [data.settings, loading]);

  // Initial load from Supabase
  useEffect(() => {
    let cancelled = false;
    fetchAll().then(remote => {
      if (cancelled) return;
      if (remote) {
        // Supabase is source of truth if it has data
        const hasRemoteData = (remote.workoutLogs?.length || 0) > 0 ||
          (remote.prs?.length || 0) > 0 ||
          (remote.splits?.length || 0) > 0 ||
          remote.settings != null;

        if (hasRemoteData) {
          localDispatch({ type: 'MERGE_REMOTE', payload: remote });
        } else {
          // First time — migrate localStorage data to Supabase
          const local = dataRef.current;
          local.splits.forEach(s => upsertSplit(s));
          local.schedules.forEach(s => upsertSchedule(s));
          local.workoutLogs.forEach(w => upsertWorkoutLog(w));
          local.prs.forEach(p => upsertPR(p));
          (local.weighIns || []).forEach(w => upsertWeighIn(w));
          syncSettings(local.settings);
        }
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'splits' }, () => {
        supabase.from('splits').select('*').then(({ data: rows }) => {
          if (rows) localDispatch({ type: 'MERGE_REMOTE', payload: { splits: rows.map(r => ({ id: r.id, name: r.name, color: r.color, exercises: r.exercises })) } });
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        supabase.from('schedules').select('*').then(({ data: rows }) => {
          if (rows) localDispatch({ type: 'MERGE_REMOTE', payload: { schedules: rows.map(r => ({ id: r.id, name: r.name, days: r.days })) } });
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_logs' }, () => {
        supabase.from('workout_logs').select('*').then(({ data: rows }) => {
          if (rows) localDispatch({ type: 'MERGE_REMOTE', payload: { workoutLogs: rows.map(r => ({ id: r.id, userId: r.user_id, date: r.date, splitId: r.split_id, exercises: r.exercises, attended: r.attended })) } });
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prs' }, () => {
        supabase.from('prs').select('*').then(({ data: rows }) => {
          if (rows) localDispatch({ type: 'MERGE_REMOTE', payload: { prs: rows.map(r => ({ id: r.id, userId: r.user_id, exerciseName: r.exercise_name, weight: r.weight, reps: r.reps, date: r.date, notes: r.notes })) } });
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weigh_ins' }, () => {
        supabase.from('weigh_ins').select('*').then(({ data: rows }) => {
          if (rows) localDispatch({ type: 'MERGE_REMOTE', payload: { weighIns: rows.map(r => ({ id: r.id, userId: r.user_id, date: r.date, weight: r.weight })) } });
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => {
        supabase.from('app_config').select('*').then(({ data: rows }) => {
          const settingsRow = rows?.find(r => r.key === 'settings');
          if (settingsRow?.value) localDispatch({ type: 'MERGE_REMOTE', payload: { settings: settingsRow.value } });
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Public dispatch — optimistic local update + background Supabase sync
  const dispatch = useCallback((action: Action) => {
    localDispatch(action);
    setSyncing(true);
    syncAction(action, dataRef.current).finally(() => setSyncing(false));
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');

  if (loading) {
    return (
      <div className="min-h-svh bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-2xl mx-auto">💪</div>
          <p className="text-white font-semibold">GainTrack</p>
          <p className="text-slate-500 text-sm">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ data, dispatch, today, loading, syncing }}>
      {children}
      {syncing && (
        <div className="fixed top-14 right-3 z-50 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-slate-400 text-[10px]">Syncing</span>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
