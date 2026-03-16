import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { Card, Select } from '../components/ui';
import { format, startOfWeek, endOfWeek, subWeeks, subMonths, startOfMonth } from 'date-fns';

type Period = 'week' | 'month' | 'year';

interface ChartPoint {
  label: string;
  values: number[];
}

function LineChart({
  points,
  colors,
  labels,
  unit: _unit,
  height = 160,
}: {
  points: ChartPoint[];
  colors: string[];
  labels: string[];
  unit: string;
  height?: number;
}) {
  if (points.length === 0) return null;

  const allVals = points.flatMap(p => p.values).filter(v => v > 0);
  if (allVals.length === 0) return <div className="text-slate-500 text-sm text-center py-8">No data yet</div>;

  const max = Math.max(...allVals);
  const min = Math.min(...allVals);
  const range = max - min || 1;

  const w = 100 / (points.length - 1 || 1);

  const getPath = (userIdx: number) => {
    const pts = points
      .map((p, i) => {
        const v = p.values[userIdx];
        if (v === 0) return null;
        const x = i * w;
        const y = height - ((v - min) / range) * (height - 20) - 10;
        return `${x},${y}`;
      })
      .filter(Boolean);
    if (pts.length < 2) return '';
    return `M ${pts.join(' L ')}`;
  };

  return (
    <div className="relative">
      <svg viewBox={`0 ${-5} 100 ${height + 10}`} className="w-full" style={{ height }}>
        {labels.map((_, userIdx) => {
          const path = getPath(userIdx);
          if (!path) return null;
          return (
            <g key={userIdx}>
              <path
                d={path}
                fill="none"
                stroke={colors[userIdx]}
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              {points.map((p, i) => {
                const v = p.values[userIdx];
                if (v === 0) return null;
                const x = i * w;
                const y = height - ((v - min) / range) * (height - 20) - 10;
                return (
                  <circle key={i} cx={x} cy={y} r="1.5" fill={colors[userIdx]} />
                );
              })}
            </g>
          );
        })}
      </svg>
      {/* X labels */}
      <div className="flex justify-between mt-1">
        {points.map((p, i) => (
          <span key={i} className="text-slate-600 text-[9px]">{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function BarChart({
  data,
  colors,
  labels,
  max: maxOverride,
}: {
  data: { label: string; values: number[] }[];
  colors: string[];
  labels: string[];
  max?: number;
}) {
  const allVals = data.flatMap(d => d.values);
  const max = maxOverride || Math.max(...allVals, 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-400 text-xs w-12 flex-shrink-0">{d.label}</span>
            <div className="flex-1 space-y-0.5">
              {labels.map((_label, ui) => (
                <div key={ui} className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(d.values[ui] / max) * 100}%`,
                      backgroundColor: colors[ui],
                      opacity: 0.8,
                    }}
                  />
                </div>
              ))}
            </div>
            <span className="text-slate-400 text-xs w-8 text-right">{Math.max(...d.values)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Progress() {
  const { data, today } = useApp();
  const { settings, workoutLogs } = data;
  const users = settings.users;
  const unit = settings.weightUnit;

  const [period, setPeriod] = useState<Period>('week');
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [viewMode, setViewMode] = useState<'volume' | 'attendance' | 'strength'>('attendance');

  // All exercise names across all logs
  const allExercises = useMemo(() => {
    const names = new Set<string>();
    workoutLogs.forEach(l => l.exercises.forEach(e => names.add(e.name)));
    return Array.from(names).sort();
  }, [workoutLogs]);

  useEffect(() => {
    if (allExercises.length > 0 && !exerciseFilter) {
      setExerciseFilter(allExercises[0]);
    }
  }, [allExercises]);

  // Generate time points
  const timePoints = useMemo(() => {
    const now = new Date(today);
    if (period === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return format(d, 'yyyy-MM-dd');
      });
    }
    if (period === 'month') {
      return Array.from({ length: 4 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(now, 3 - i), { weekStartsOn: 1 });
        return format(weekStart, 'yyyy-MM-dd');
      });
    }
    // year: last 12 months
    return Array.from({ length: 12 }, (_, i) => {
      const m = subMonths(now, 11 - i);
      return format(startOfMonth(m), 'yyyy-MM-dd');
    });
  }, [period, today]);

  // Attendance chart data
  const attendancePoints = useMemo((): ChartPoint[] => {
    return timePoints.map(dateKey => {
      const label = period === 'week'
        ? format(new Date(dateKey), 'EEE')
        : period === 'month'
          ? `W${format(new Date(dateKey), 'w')}`
          : format(new Date(dateKey), 'MMM');

      const values = users.map(user => {
        if (period === 'week') {
          return workoutLogs.some(l => l.userId === user.id && l.date === dateKey && l.attended) ? 1 : 0;
        }
        // For week/month buckets, count sessions
        const start = new Date(dateKey);
        const end = period === 'month'
          ? new Date(start.getTime() + 7 * 86400000)
          : new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return workoutLogs.filter(l => {
          const d = new Date(l.date);
          return l.userId === user.id && l.attended && d >= start && d < end;
        }).length;
      });

      return { label, values };
    });
  }, [timePoints, period, users, workoutLogs]);

  // Volume / strength for selected exercise
  const exercisePoints = useMemo((): ChartPoint[] => {
    if (!exerciseFilter) return [];
    return timePoints.map(dateKey => {
      const label = period === 'week'
        ? format(new Date(dateKey), 'EEE')
        : period === 'month'
          ? `W${format(new Date(dateKey), 'w')}`
          : format(new Date(dateKey), 'MMM');

      const values = users.map(user => {
        let logs: typeof workoutLogs;
        if (period === 'week') {
          logs = workoutLogs.filter(l => l.userId === user.id && l.date === dateKey);
        } else {
          const start = new Date(dateKey);
          const end = period === 'month'
            ? new Date(start.getTime() + 7 * 86400000)
            : new Date(start.getFullYear(), start.getMonth() + 1, 1);
          logs = workoutLogs.filter(l => {
            const d = new Date(l.date);
            return l.userId === user.id && d >= start && d < end;
          });
        }
        const exLogs = logs.flatMap(l => l.exercises.filter(e => e.name === exerciseFilter));
        if (exLogs.length === 0) return 0;
        if (viewMode === 'volume') {
          return exLogs.reduce((acc, e) => acc + e.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0);
        } else {
          // Max weight lifted (1RM estimate = weight * (1 + reps/30))
          return Math.max(...exLogs.flatMap(e => e.sets.map(s => s.weight * (1 + s.reps / 30))));
        }
      });
      return { label, values };
    });
  }, [timePoints, period, users, workoutLogs, exerciseFilter, viewMode]);

  // Weekly summary table
  const weeklySummary = useMemo(() => {
    return users.map(user => {
      const weeks = Array.from({ length: 4 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(new Date(today), 3 - i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = workoutLogs.filter(l => {
          const d = new Date(l.date);
          return l.userId === user.id && l.attended && d >= weekStart && d <= weekEnd;
        }).length;
        return { label: `W${format(weekStart, 'w')}`, count };
      });
      return { user, weeks };
    });
  }, [users, workoutLogs, today]);

  const colors = users.map(u => u.color);
  const userLabels = users.map(u => u.name);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div>
        <p className="text-slate-400 text-sm">Track your gains</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Progress</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {(['week', 'month', 'year'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              period === p ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
          </button>
        ))}
      </div>

      {/* Attendance chart */}
      <Card className="p-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Gym Attendance</p>
        <div className="flex items-center gap-3 mb-4">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }} />
              <span className="text-slate-400 text-xs">{u.name}</span>
            </div>
          ))}
        </div>
        {period === 'week' ? (
          <BarChart
            data={attendancePoints.map(p => ({ label: p.label, values: p.values }))}
            colors={colors}
            labels={userLabels}
            max={1}
          />
        ) : (
          <LineChart
            points={attendancePoints}
            colors={colors}
            labels={userLabels}
            unit="sessions"
          />
        )}
      </Card>

      {/* Weekly attendance table */}
      <Card className="p-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Last 4 Weeks</p>
        <div className="space-y-3">
          {weeklySummary.map(({ user, weeks }) => (
            <div key={user.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{user.avatar}</span>
                <span className="text-white text-sm font-medium">{user.name}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {weeks.map((w, i) => (
                  <div key={i} className="bg-white/4 rounded-xl p-2 text-center">
                    <p className="text-slate-500 text-[10px]">{w.label}</p>
                    <p className="text-white font-bold text-lg">{w.count}</p>
                    <div className="flex justify-center gap-0.5 mt-1">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div
                          key={j}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: j < w.count ? user.color : '#333' }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Exercise progress */}
      {allExercises.length > 0 && (
        <Card className="p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Exercise Progress</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Select
              value={exerciseFilter}
              onChange={setExerciseFilter}
              options={allExercises.map(e => ({ value: e, label: e }))}
            />
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {(['volume', 'strength'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    viewMode === m ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'volume' ? 'Volume' : 'Est. 1RM'}
                </button>
              ))}
            </div>
          </div>
          <LineChart
            points={exercisePoints}
            colors={colors}
            labels={userLabels}
            unit={viewMode === 'volume' ? `${unit} total` : `${unit} 1RM`}
          />
          <div className="flex items-center gap-3 mt-3">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }} />
                <span className="text-slate-400 text-xs">{u.name}</span>
              </div>
            ))}
          </div>
          {viewMode === 'strength' && (
            <p className="text-slate-600 text-xs mt-2">
              Estimated 1RM using Epley formula: weight × (1 + reps/30)
            </p>
          )}
        </Card>
      )}

      {allExercises.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-slate-400">Log some workouts to see progress charts</p>
        </Card>
      )}
    </div>
  );
}

