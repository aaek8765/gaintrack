import { useState } from 'react';
import { useApp } from '../store';
import type { User, Split, WorkoutLog } from '../types';
import { Card, Button, Select, UserAvatar } from '../components/ui';
import { format, subDays } from 'date-fns';

function UserCheckInCard({
  user,
  log,
  splits,
  scheduledSplitId,
  onCheckIn,
  onUndo,
}: {
  user: User;
  log: WorkoutLog | undefined;
  splits: Split[];
  scheduledSplitId: string | null;
  onCheckIn: (userId: string, splitId: string) => void;
  onUndo: (userId: string) => void;
}) {
  const [overrideSplitId, setOverrideSplitId] = useState(scheduledSplitId || splits[0]?.id || '');
  const attended = log?.attended ?? false;
  const loggedSplit = splits.find(s => s.id === log?.splitId);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <UserAvatar user={user} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold">{user.name}</p>
          {attended ? (
            <p className="text-emerald-400 text-sm font-medium flex items-center gap-1">
              <span>✓</span>
              Checked in {loggedSplit ? `— ${loggedSplit.name}` : ''}
            </p>
          ) : (
            <p className="text-slate-500 text-sm">Not checked in</p>
          )}
        </div>
        {attended ? (
          <Button variant="ghost" size="sm" onClick={() => onUndo(user.id)}>
            Undo
          </Button>
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed transition-all hover:border-solid hover:bg-white/5"
            style={{ borderColor: user.color + '60' }}
            onClick={() => onCheckIn(user.id, overrideSplitId || scheduledSplitId || splits[0]?.id || '')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={user.color} strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        )}
      </div>

      {!attended && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-slate-400 text-xs mb-2">Workout split</p>
          <Select
            value={overrideSplitId}
            onChange={setOverrideSplitId}
            options={splits.map(s => ({ value: s.id, label: s.name }))}
          />
          <Button
            className="w-full mt-2"
            onClick={() => onCheckIn(user.id, overrideSplitId)}
          >
            Check In — {splits.find(s => s.id === overrideSplitId)?.name || 'Workout'}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function CheckIn() {
  const { data, dispatch, today } = useApp();
  const { settings, splits, schedules, workoutLogs } = data;
  const users = settings.users;
  const activeSchedule = schedules.find(s => s.id === settings.activeScheduleId);

  const [selectedDate, setSelectedDate] = useState(today);

  const getDayIndex = (dateStr: string) => {
    const d = new Date(dateStr);
    return (d.getDay() + 6) % 7;
  };

  const dayIndex = getDayIndex(selectedDate);
  const scheduledSplitId = activeSchedule?.days[dayIndex]?.splitId || null;
  const scheduledSplit = splits.find(s => s.id === scheduledSplitId);

  const getUserLog = (userId: string) =>
    workoutLogs.find(l => l.userId === userId && l.date === selectedDate);

  const handleCheckIn = (userId: string, splitId: string) => {
    dispatch({ type: 'LOG_ATTENDANCE', payload: { userId, date: selectedDate, splitId } });
  };

  const handleUndo = (userId: string) => {
    const log = getUserLog(userId);
    if (log) {
      dispatch({ type: 'UPDATE_WORKOUT', payload: { ...log, attended: false } });
    }
  };

  const recentDates = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(today), i);
    return format(d, 'yyyy-MM-dd');
  });

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div>
        <p className="text-slate-400 text-sm">Mark attendance</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Check In</h1>
      </div>

      {/* Date picker */}
      <Card className="p-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Select Date</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {recentDates.map(date => {
            const isSelected = date === selectedDate;
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/15 text-white'
                    : 'border-white/8 bg-white/3 text-slate-400 hover:bg-white/6'
                }`}
              >
                <span className="text-xs font-medium">
                  {isToday ? 'Today' : format(new Date(date), 'EEE')}
                </span>
                <span className="text-lg font-bold mt-0.5">{format(new Date(date), 'd')}</span>
                <span className="text-[10px] opacity-70">{format(new Date(date), 'MMM')}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {scheduledSplit && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scheduledSplit.color }} />
          <span className="text-slate-400 text-sm">
            Scheduled: <span className="text-white font-medium">{scheduledSplit.name}</span>
          </span>
        </div>
      )}
      {!scheduledSplit && <p className="text-slate-500 text-sm px-1">Rest day — no split scheduled</p>}

      <div className="space-y-3">
        {users.map(user => (
          <UserCheckInCard
            key={`${user.id}-${selectedDate}`}
            user={user}
            log={getUserLog(user.id)}
            splits={splits}
            scheduledSplitId={scheduledSplitId}
            onCheckIn={handleCheckIn}
            onUndo={handleUndo}
          />
        ))}
      </div>

      {/* Attendance history */}
      <Card className="p-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Recent Attendance</p>
        <div className="space-y-2">
          {recentDates.map(date => {
            const dayIdx = getDayIndex(date);
            const splitId = activeSchedule?.days[dayIdx]?.splitId;
            const split = splits.find(s => s.id === splitId);
            return (
              <div key={date} className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-24 flex-shrink-0">
                  {date === today ? 'Today' : format(new Date(date), 'EEE, MMM d')}
                </span>
                <div className="flex gap-2 flex-1">
                  {users.map(user => {
                    const l = workoutLogs.find(l => l.userId === user.id && l.date === date);
                    return (
                      <div
                        key={user.id}
                        className="w-6 h-6 rounded-full border flex items-center justify-center text-xs"
                        style={{
                          backgroundColor: l?.attended ? `${user.color}30` : 'transparent',
                          borderColor: l?.attended ? user.color : '#333',
                          color: l?.attended ? user.color : '#555',
                        }}
                        title={`${user.name}: ${l?.attended ? 'attended' : 'skipped'}`}
                      >
                        {l?.attended ? '✓' : ''}
                      </div>
                    );
                  })}
                </div>
                {split && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ color: split.color, backgroundColor: `${split.color}20` }}>
                    {split.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
