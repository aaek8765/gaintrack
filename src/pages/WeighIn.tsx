import { useState, useMemo } from 'react';
import { useApp } from '../store';
import type { WeighIn } from '../types';
import { Card, Button, Input, Select, UserAvatar } from '../components/ui';
import { format, subDays, subWeeks, subMonths } from 'date-fns'; // subDays used in sparkline

type Period = 'week' | 'month' | 'year';

function SparkLine({
  points,
  color,
  height = 60,
}: {
  points: number[];
  color: string;
  height?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100 / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * w;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const fillD = `M 0,${height} L ${coords.join(' L ')} L 100,${height} Z`;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Latest dot */}
      <circle cx={coords[coords.length - 1].split(',')[0]} cy={coords[coords.length - 1].split(',')[1]} r="2.5" fill={color} />
    </svg>
  );
}

function MultiLineChart({
  series,
  height = 180,
  unit,
}: {
  series: { label: string; color: string; points: { date: string; weight: number }[] }[];
  height: number;
  unit: string;
}) {
  const allWeights = series.flatMap(s => s.points.map(p => p.weight)).filter(Boolean);
  if (allWeights.length === 0) return (
    <div className="flex items-center justify-center text-slate-600 text-sm" style={{ height }}>
      No data for this period
    </div>
  );

  // Collect all unique dates across all series, sorted
  const allDates = Array.from(new Set(series.flatMap(s => s.points.map(p => p.date)))).sort();
  if (allDates.length < 1) return null;

  const min = Math.min(...allWeights) - 1;
  const max = Math.max(...allWeights) + 1;
  const range = max - min || 1;
  const w = allDates.length > 1 ? 100 / (allDates.length - 1) : 50;

  const getY = (v: number) => height - ((v - min) / range) * (height - 20) - 10;

  return (
    <div>
      {/* Y axis labels */}
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = height - t * (height - 20) - 10;
            return <line key={t} x1="0" y1={y} x2="100" y2={y} stroke="white" strokeOpacity="0.04" strokeWidth="0.5" />;
          })}

          {series.map(s => {
            const pts = allDates.map(d => {
              const entry = s.points.find(p => p.date === d);
              return entry ? { x: allDates.indexOf(d) * w, y: getY(entry.weight), v: entry.weight } : null;
            });
            const validPts = pts.filter(Boolean) as { x: number; y: number; v: number }[];
            if (validPts.length < 1) return null;

            const pathD = validPts.length > 1
              ? `M ${validPts.map(p => `${p.x},${p.y}`).join(' L ')}`
              : '';

            return (
              <g key={s.label}>
                {pathD && (
                  <path d={pathD} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                )}
                {validPts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="2" fill={s.color} />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Y labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none">
          <span className="text-slate-600 text-[9px]">{max.toFixed(1)}{unit}</span>
          <span className="text-slate-600 text-[9px]">{((min + max) / 2).toFixed(1)}</span>
          <span className="text-slate-600 text-[9px]">{min.toFixed(1)}</span>
        </div>
      </div>

      {/* X labels */}
      <div className="flex justify-between mt-1 px-0">
        {allDates.filter((_, i) => {
          // Show at most ~6 labels
          const step = Math.max(1, Math.floor(allDates.length / 6));
          return i % step === 0 || i === allDates.length - 1;
        }).map(d => (
          <span key={d} className="text-slate-600 text-[9px]">{format(new Date(d), 'MMM d')}</span>
        ))}
      </div>
    </div>
  );
}

export default function WeighIn() {
  const { data, dispatch, today } = useApp();
  const { settings, weighIns } = data;
  const users = settings.users;
  const unit = settings.weightUnit;

  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [weightInput, setWeightInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriod] = useState<Period>('month');

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Today's existing entry for selected user
  const existingToday = weighIns.find(w => w.userId === selectedUserId && w.date === selectedDate);

  const handleLog = () => {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    dispatch({
      type: 'LOG_WEIGH_IN',
      payload: {
        id: existingToday?.id || crypto.randomUUID(),
        userId: selectedUserId,
        date: selectedDate,
        weight: val,
      },
    });
    setWeightInput('');
  };

  // Build chart series per period
  const chartSeries = useMemo(() => {
    const now = new Date(today);
    let startDate: Date;
    if (period === 'week') startDate = subWeeks(now, 1);
    else if (period === 'month') startDate = subMonths(now, 1);
    else startDate = subMonths(now, 12);

    return users.map(user => {
      const points = weighIns
        .filter(w => w.userId === user.id && new Date(w.date) >= startDate)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(w => ({ date: w.date, weight: w.weight }));
      return { label: user.name, color: user.color, points };
    }).filter(s => s.points.length > 0);
  }, [users, weighIns, period, today]);

  // Per-user stats
  const userStats = useMemo(() => {
    return users.map(user => {
      const sorted = weighIns
        .filter(w => w.userId === user.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const first = sorted[0];
      const change = latest && prev ? latest.weight - prev.weight : null;
      const totalChange = latest && first && first.id !== latest.id ? latest.weight - first.weight : null;

      // Weekly avg change
      const lastWeek = weighIns.filter(w => w.userId === user.id && new Date(w.date) >= subWeeks(new Date(today), 1));
      const prevWeek = weighIns.filter(w => {
        const d = new Date(w.date);
        return w.userId === user.id && d >= subWeeks(new Date(today), 2) && d < subWeeks(new Date(today), 1);
      });
      const weekAvg = lastWeek.length ? lastWeek.reduce((a, b) => a + b.weight, 0) / lastWeek.length : null;
      const prevWeekAvg = prevWeek.length ? prevWeek.reduce((a, b) => a + b.weight, 0) / prevWeek.length : null;
      const weekChange = weekAvg && prevWeekAvg ? weekAvg - prevWeekAvg : null;

      // Sparkline (last 14 days)
      const sparkPoints = Array.from({ length: 14 }, (_, i) => {
        const d = format(subDays(new Date(today), 13 - i), 'yyyy-MM-dd');
        const entry = weighIns.find(w => w.userId === user.id && w.date === d);
        return entry?.weight || 0;
      });

      return { user, latest, change, totalChange, weekChange, sparkPoints };
    });
  }, [users, weighIns, today]);

  // Recent log for selected user (last 10)
  const recentLogs = useMemo(() => {
    return weighIns
      .filter(w => w.userId === selectedUserId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);
  }, [weighIns, selectedUserId]);


  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div>
        <p className="text-slate-400 text-sm">Daily tracking</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Weigh In</h1>
      </div>

      {/* Log weight */}
      <Card className="p-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Log Weight</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">Athlete</label>
            <Select
              value={selectedUserId}
              onChange={setSelectedUserId}
              options={users.map(u => ({ value: u.id, label: `${u.avatar} ${u.name}` }))}
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">Date</label>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 w-full"
            />
          </div>
        </div>

        {existingToday && (
          <div className="mb-3 flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
            <span className="text-orange-400 text-xs">Already logged: <strong>{existingToday.weight}{unit}</strong></span>
            <span className="text-slate-500 text-xs ml-1">— entering a new value will update it</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="number"
              value={weightInput}
              onChange={setWeightInput}
              placeholder={existingToday ? String(existingToday.weight) : `Weight in ${unit}`}
              min={0}
              step={0.1}
              onKeyDown={e => e.key === 'Enter' && handleLog()}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{unit}</span>
          </div>
          <Button onClick={handleLog} disabled={!weightInput}>
            {existingToday ? 'Update' : 'Log'}
          </Button>
        </div>
      </Card>

      {/* User stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {userStats.map(({ user, latest, change, totalChange, weekChange, sparkPoints }) => {
          const hasData = sparkPoints.some(v => v > 0);
          return (
            <Card key={user.id} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <UserAvatar user={user} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{user.name}</p>
                  {latest ? (
                    <p className="text-2xl font-bold" style={{ color: user.color }}>
                      {latest.weight}<span className="text-sm font-normal text-slate-400">{unit}</span>
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  )}
                </div>
                {change !== null && (
                  <div className={`text-right ${change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    <p className="text-sm font-bold">{change > 0 ? '+' : ''}{change.toFixed(1)}{unit}</p>
                    <p className="text-[10px] text-slate-500">vs last</p>
                  </div>
                )}
              </div>

              {hasData && (
                <SparkLine
                  points={sparkPoints.map((v, i) => v === 0 ? (sparkPoints.find((x, j) => x > 0 && j < i) || sparkPoints.find(x => x > 0) || 0) : v)}
                  color={user.color}
                  height={50}
                />
              )}

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white/4 rounded-xl p-2 text-center">
                  <p className={`text-sm font-bold ${weekChange === null ? 'text-slate-500' : weekChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {weekChange === null ? '—' : `${weekChange >= 0 ? '+' : ''}${weekChange.toFixed(1)}${unit}`}
                  </p>
                  <p className="text-slate-600 text-[10px]">This week</p>
                </div>
                <div className="bg-white/4 rounded-xl p-2 text-center">
                  <p className={`text-sm font-bold ${totalChange === null ? 'text-slate-500' : totalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalChange === null ? '—' : `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}${unit}`}
                  </p>
                  <p className="text-slate-600 text-[10px]">All time</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      {chartSeries.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Weight Over Time</p>
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {(['week', 'month', 'year'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                    period === p ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {p === 'week' ? '1W' : p === 'month' ? '1M' : '1Y'}
                </button>
              ))}
            </div>
          </div>
          <MultiLineChart series={chartSeries} height={180} unit={unit} />
          <div className="flex gap-4 mt-3 flex-wrap">
            {chartSeries.map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-400 text-xs">{s.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent log history */}
      {recentLogs.length > 0 && (
        <Card className="p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
            {selectedUser?.name}'s History
          </p>
          <div className="space-y-1">
            {recentLogs.map((log, i) => {
              const prev = recentLogs[i + 1];
              const diff = prev ? log.weight - prev.weight : null;
              return (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-white/4 last:border-0">
                  <span className="text-slate-500 text-xs w-24 flex-shrink-0">
                    {log.date === today ? 'Today' : format(new Date(log.date), 'EEE, MMM d')}
                  </span>
                  <span className="text-white font-semibold flex-1">{log.weight}{unit}</span>
                  {diff !== null && (
                    <span className={`text-xs font-medium ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}
                    </span>
                  )}
                  <button
                    onClick={() => dispatch({ type: 'DELETE_WEIGH_IN', payload: log.id })}
                    className="text-slate-700 hover:text-red-400 transition-colors text-lg leading-none ml-1"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {weighIns.length === 0 && (
        <Card className="p-8 text-center border-dashed border-white/8">
          <p className="text-3xl mb-2">⚖️</p>
          <p className="text-slate-400 font-medium">No weigh-ins yet</p>
          <p className="text-slate-600 text-sm mt-1">Log your first weight above</p>
        </Card>
      )}
    </div>
  );
}
