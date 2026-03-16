import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppData, AppSettings, Split, WeekSchedule, WorkoutLog, PR, User, WeighIn } from './types';
import { format } from 'date-fns';

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
  settings: {
    weightUnit: 'kg',
    users: DEFAULT_USERS,
    activeScheduleId: 'default',
  },
  splits: DEFAULT_SPLITS,
  schedules: [DEFAULT_SCHEDULE],
  workoutLogs: [],
  prs: [],
  weighIns: [],
};

// ─── Reducer ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_DATA'; payload: AppData }
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
        return {
          ...state,
          workoutLogs: state.workoutLogs.map(w =>
            w.userId === userId && w.date === date
              ? { ...w, attended: true, splitId }
              : w
          ),
        };
      }
      const newLog: WorkoutLog = {
        id: crypto.randomUUID(),
        userId,
        date,
        splitId,
        exercises: [],
        attended: true,
      };
      return { ...state, workoutLogs: [...state.workoutLogs, newLog] };
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
      return {
        ...state,
        settings: { ...state.settings, users: [...state.settings.users, action.payload] },
      };
    case 'UPDATE_USER':
      return {
        ...state,
        settings: {
          ...state.settings,
          users: state.settings.users.map(u => u.id === action.payload.id ? action.payload : u),
        },
      };
    case 'DELETE_USER': {
      const userId = action.payload;
      return {
        ...state,
        settings: {
          ...state.settings,
          users: state.settings.users.filter(u => u.id !== userId),
        },
        workoutLogs: state.workoutLogs.filter(l => l.userId !== userId),
        prs: state.prs.filter(p => p.userId !== userId),
        weighIns: (state.weighIns || []).filter(w => w.userId !== userId),
      };
    }

    case 'LOG_WEIGH_IN': {
      const existing = (state.weighIns || []).find(
        w => w.userId === action.payload.userId && w.date === action.payload.date
      );
      if (existing) {
        return {
          ...state,
          weighIns: state.weighIns.map(w => w.id === existing.id ? action.payload : w),
        };
      }
      return { ...state, weighIns: [...(state.weighIns || []), action.payload] };
    }

    case 'DELETE_WEIGH_IN':
      return { ...state, weighIns: state.weighIns.filter(w => w.id !== action.payload) };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface AppContextType {
  data: AppData;
  dispatch: React.Dispatch<Action>;
  today: string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const stored = localStorage.getItem('fitness-tracker-v1');
  const parsed = stored ? JSON.parse(stored) : null;
  const initialState: AppData = parsed
    ? { weighIns: [], ...parsed }
    : INITIAL_DATA;

  const [data, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    localStorage.setItem('fitness-tracker-v1', JSON.stringify(data));
  }, [data]);

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <AppContext.Provider value={{ data, dispatch, today }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
