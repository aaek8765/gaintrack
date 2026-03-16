import { useMemo } from 'react';
import { useApp } from '../store';
import { Card, UserAvatar } from '../components/ui';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, subDays } from 'date-fns';
import type { WorkoutLog } from '../types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getStreak(logs: WorkoutLog[], userId: string, today: string): number {
  const attended = new Set(logs.filter(l => l.userId === userId && l.attended).map(l => l.date));
  let streak = 0;
  let d = new Date(today);
  while (true) {
    const key = format(d, 'yyyy-MM-dd');
    if (attended.has(key)) {
      streak++;
      d = new Date(d.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

export default function Dashboard() {
  const { data, today } = useApp();
  const { settings, workoutLogs, splits, schedules, prs, weighIns } = data;
  const users = settings.users;
  const unit = settings.weightUnit;

  const thisWeekDays = eachDayOfInterval({
    start: startOfWeek(new Date(today), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(today), { weekStartsOn: 1 }),
  });

  const stats = useMemo(() => {
    return users.map(user => {
      const userLogs = workoutLogs.filter(l => l.userId === user.id && l.attended);
      const thisWeek = userLogs.filter(l => {
        const d = new Date(l.date);
        return d >= startOfWeek(new Date(today), { weekStartsOn: 1 }) && d <= endOfWeek(new Date(today), { weekStartsOn: 1 });
      }).length;
      const thisMonth = userLogs.filter(l => {
        const d = new Date(l.date);
        return d >= startOfMonth(new Date(today)) && d <= endOfMonth(new Date(today));
      }).length;
      const total = userLogs.length;
      const streak = getStreak(workoutLogs, user.id, today);
      return { user, thisWeek, thisMonth, total, streak };
    });
  }, [users, workoutLogs, today]);

  // PR leaderboard — per exercise, best estimated 1RM per user
  const prLeaderboard = useMemo(() => {
    const exercises = Array.from(new Set(prs.map(p => p.exerciseName)));
    return exercises.map(exName => {
      const perUser = users.map(user => {
        const userPRs = prs.filter(p => p.userId === user.id && p.exerciseName === exName);
        const best = userPRs.reduce<typeof userPRs[0] | null>((acc, p) => {
          const est = p.weight * (1 + p.reps / 30);
          const accEst = acc ? acc.weight * (1 + acc.reps / 30) : 0;
          return est > accEst ? p : acc;
        }, null);
        return { user, best, est: best ? best.weight * (1 + best.reps / 30) : 0 };
      });
      const ranked = [...perUser].sort((a, b) => b.est - a.est);
      return { exName, ranked };
    }).sort((a, b) => b.ranked.filter(r => r.best).length - a.ranked.filter(r => r.best).length);
  }, [prs, users]);

  // Overall ranking: sort by monthly sessions, then total, then PRs, then streak
  const overallRanking = useMemo(() => {
    return stats.map(s => {
      const prCount = prs.filter(p => p.userId === s.user.id).length;
      return { ...s, prCount };
    }).sort((a, b) =>
      b.thisMonth - a.thisMonth ||
      b.total - a.total ||
      b.prCount - a.prCount ||
      b.streak - a.streak
    );
  }, [stats, prs]);

  const leader = overallRanking[0];
  const activeSchedule = schedules.find(s => s.id === settings.activeScheduleId);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div>
        <p className="text-slate-400 text-sm">{format(new Date(today), 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Dashboard</h1>
      </div>

      {/* ─── OVERALL LEADERBOARD ─── */}
      {users.length >= 1 && (
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0d0d0d 0%, ${leader?.user.color}15 60%, #0d0d0d 100%)`,
            border: `1px solid ${leader?.user.color}25`,
          }}
        >
          <div
            className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ backgroundColor: leader?.user.color }}
          />
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-4">🏆 Overall Leaderboard</p>

          <div className="space-y-2">
            {overallRanking.map((entry, rank) => {
              const isLeader = rank === 0;
              return (
                <div
                  key={entry.user.id}
                  className={`flex items-center gap-3 rounded-xl p-3 ${isLeader ? 'bg-white/6' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isLeader ? 'bg-amber-500/25 text-amber-400' : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {isLeader ? '🥇' : `#${rank + 1}`}
                  </div>
                  <UserAvatar user={entry.user} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold ${isLeader ? 'text-white text-lg' : 'text-slate-300'}`}>
                        {entry.user.name}
                      </span>
                      {isLeader && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${entry.user.color}30`, color: entry.user.color }}>
                          Leading
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-slate-500 text-xs">{entry.total} sessions</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-slate-500 text-xs">{entry.prCount} PRs</span>
                      {entry.streak > 0 && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span className="text-orange-400 text-xs">🔥 {entry.streak}d streak</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold text-2xl">{entry.thisMonth}</p>
                    <p className="text-slate-600 text-xs">this month</p>
                  </div>
                </div>
              );
            })}
          </div>

          {overallRanking.length >= 2 && overallRanking[1].thisMonth < leader.thisMonth && (
            <div className="mt-4 pt-4 border-t border-white/6 text-center">
              <p className="text-red-400 text-sm font-semibold">
                Pure wussy behavior from{' '}
                <span style={{ color: overallRanking[1].user.color }}>{overallRanking[1].user.name}</span>
                {' '}—{' '}
                {leader.thisMonth - overallRanking[1].thisMonth} session{leader.thisMonth - overallRanking[1].thisMonth !== 1 ? 's' : ''} behind this month. Get to the gym.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Weekly calendar */}
      <Card className="p-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">This Week</p>
        <div className="grid grid-cols-7 gap-1.5">
          {thisWeekDays.map((day, i) => {
            const key = format(day, 'yyyy-MM-dd');
            const isToday = key === today;
            const splitId = activeSchedule?.days[i]?.splitId;
            const split = splits.find(s => s.id === splitId);
            return (
              <div
                key={key}
                className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                  isToday ? 'border-orange-500/50 bg-orange-500/8' : 'border-white/5 bg-white/2'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-orange-400' : 'text-slate-500'}`}>
                  {DAY_NAMES[i]}
                </span>
                <span className={`text-sm font-bold mt-0.5 ${isToday ? 'text-white' : 'text-slate-300'}`}>
                  {format(day, 'd')}
                </span>
                {split ? (
                  <span className="text-[9px] mt-1 font-medium px-1 py-0.5 rounded leading-tight text-center" style={{ backgroundColor: `${split.color}30`, color: split.color }}>
                    {split.name.slice(0, 4)}
                  </span>
                ) : (
                  <span className="text-[9px] mt-1 text-slate-700">Rest</span>
                )}
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                  {users.map(u => {
                    const attended = workoutLogs.some(l => l.userId === u.id && l.date === key && l.attended);
                    return (
                      <div
                        key={u.id}
                        className="w-2 h-2 rounded-full border"
                        style={{ backgroundColor: attended ? u.color : 'transparent', borderColor: attended ? u.color : '#2a2a2a' }}
                        title={`${u.name}: ${attended ? 'attended' : 'skipped'}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 flex-wrap">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
              <span className="text-slate-400 text-xs">{u.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-user stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ user, thisWeek, thisMonth, total, streak }) => (
          <Card key={user.id} className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{user.name}</p>
                <p className="text-slate-600 text-[10px]">{streak > 0 ? `🔥 ${streak}d` : '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[['Wk', thisWeek], ['Mo', thisMonth], ['All', total]].map(([l, v]) => (
                <div key={l} className="bg-white/4 rounded-lg p-1.5 text-center">
                  <p className="text-white font-bold text-base">{v}</p>
                  <p className="text-slate-600 text-[9px]">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 h-1 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min((thisWeek / 6) * 100, 100)}%`, backgroundColor: user.color }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* PR Battle Leaderboard */}
      {prLeaderboard.length > 0 && (
        <Card className="p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">⚔️ PR Battles</p>
          <div className="space-y-5">
            {prLeaderboard.slice(0, 6).map(({ exName, ranked }) => {
              const withPR = ranked.filter(r => r.best);
              if (withPR.length === 0) return null;
              const maxEst = withPR[0].est;
              const gap = withPR.length >= 2 ? withPR[0].est - withPR[1].est : 0;

              return (
                <div key={exName}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-semibold">{exName}</p>
                    {withPR.length >= 2 && gap > 0 && (
                      <span className="text-[10px] text-slate-500">
                        <span style={{ color: withPR[0].user.color }}>{withPR[0].user.name}</span>
                        {' '}leads by {gap.toFixed(1)}{unit} est.
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {withPR.map(({ user, best, est }, i) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {i === 0 && withPR.length > 1 ? (
                            <span className="text-sm">🥇</span>
                          ) : (
                            <span className="text-slate-600 text-xs">#{i + 1}</span>
                          )}
                        </div>
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                          <span className="text-sm flex-shrink-0">{user.avatar}</span>
                        )}
                        <span className="text-xs text-slate-300 w-16 truncate flex-shrink-0">{user.name}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(est / maxEst) * 100}%`, backgroundColor: user.color }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 text-right w-20 flex-shrink-0">
                          {best!.weight}{unit} × {best!.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {prs.length === 0 && (
        <Card className="p-6 text-center border-dashed border-white/10">
          <p className="text-2xl mb-2">🏆</p>
          <p className="text-slate-400 text-sm font-medium">No PRs logged yet</p>
          <p className="text-slate-600 text-xs mt-1">Go to the PRs tab and start tracking your bests</p>
        </Card>
      )}

      {/* Weight snapshot */}
      {weighIns.length > 0 && (
        <Card className="p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">⚖️ Weight</p>
          <div className="space-y-3">
            {users.map(user => {
              const sorted = weighIns
                .filter(w => w.userId === user.id)
                .sort((a, b) => b.date.localeCompare(a.date));
              const latest = sorted[0];
              const prev = sorted[1];
              if (!latest) return null;
              const diff = prev ? latest.weight - prev.weight : null;

              // 7-day spark
              const spark = Array.from({ length: 7 }, (_, i) => {
                const d = format(subDays(new Date(today), 6 - i), 'yyyy-MM-dd');
                return weighIns.find(w => w.userId === user.id && w.date === d)?.weight || null;
              });
              // fill nulls with nearest available
              let last = spark.find(v => v !== null) || 0;
              const filled = spark.map(v => { if (v !== null) { last = v; return v; } return last; });

              return (
                <div key={user.id} className="flex items-center gap-3">
                  <UserAvatar user={user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{latest.weight}{unit}</span>
                      {diff !== null && (
                        <span className={`text-xs font-medium ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}
                        </span>
                      )}
                      <span className="text-slate-600 text-xs">{user.name}</span>
                    </div>
                    <p className="text-slate-600 text-[10px]">{format(new Date(latest.date), 'MMM d')}</p>
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <svg viewBox="0 0 80 30" className="w-full h-7" preserveAspectRatio="none">
                      {filled.length >= 2 && (() => {
                        const mn = Math.min(...filled);
                        const mx = Math.max(...filled);
                        const rng = mx - mn || 1;
                        const pts = filled.map((v, i) => `${(i / 6) * 80},${30 - ((v - mn) / rng) * 24 - 3}`).join(' L ');
                        return <path d={`M ${pts}`} fill="none" stroke={user.color} strokeWidth="1.5" strokeLinecap="round" />;
                      })()}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
