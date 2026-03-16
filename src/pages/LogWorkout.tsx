import { useState, useEffect } from 'react';
import { useApp } from '../store';
import type { WorkoutLog, ExerciseLog, SetEntry } from '../types';
import { Card, Button, Input, Select, Modal } from '../components/ui';

function SetRow({
  set,
  index,
  unit,
  onChange,
  onRemove,
}: {
  set: SetEntry;
  index: number;
  unit: string;
  onChange: (s: SetEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 text-xs w-6 text-center">{index + 1}</span>
      <div className="flex-1 grid grid-cols-2 gap-2">
        <div className="relative">
          <Input
            type="number"
            value={set.weight || ''}
            onChange={v => onChange({ ...set, weight: parseFloat(v) || 0 })}
            placeholder="0"
            min={0}
            step={0.5}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{unit}</span>
        </div>
        <div className="relative">
          <Input
            type="number"
            value={set.reps || ''}
            onChange={v => onChange({ ...set, reps: parseInt(v) || 0 })}
            placeholder="0"
            min={0}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">reps</span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-slate-600 hover:text-red-400 transition-colors w-6 text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}

function ExerciseCard({
  log,
  unit,
  onChange,
  onRemove,
  prevLog,
}: {
  log: ExerciseLog;
  unit: string;
  onChange: (l: ExerciseLog) => void;
  onRemove: () => void;
  prevLog?: ExerciseLog;
}) {
  const addSet = () => {
    const last = log.sets[log.sets.length - 1];
    onChange({
      ...log,
      sets: [...log.sets, { reps: last?.reps || 0, weight: last?.weight || 0 }],
    });
  };

  const updateSet = (i: number, s: SetEntry) => {
    onChange({ ...log, sets: log.sets.map((x, j) => (j === i ? s : x)) });
  };

  const removeSet = (i: number) => {
    onChange({ ...log, sets: log.sets.filter((_, j) => j !== i) });
  };

  // Volume comparison with previous
  const currVol = log.sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
  const prevVol = prevLog?.sets.reduce((acc, s) => acc + s.weight * s.reps, 0) || 0;
  const volDiff = prevVol > 0 ? ((currVol - prevVol) / prevVol) * 100 : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-white font-semibold flex-1">{log.name}</h3>
        {volDiff !== null && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            volDiff > 0 ? 'bg-emerald-500/20 text-emerald-400' :
            volDiff < 0 ? 'bg-red-500/20 text-red-400' :
            'bg-white/10 text-slate-400'
          }`}>
            {volDiff > 0 ? '+' : ''}{volDiff.toFixed(0)}% vs last
          </span>
        )}
        <button onClick={onRemove} className="text-slate-500 hover:text-red-400 transition-colors text-xl">×</button>
      </div>

      {prevLog && prevLog.sets.length > 0 && (
        <div className="bg-white/3 rounded-xl px-3 py-2">
          <p className="text-slate-500 text-xs mb-1">Last session</p>
          <div className="flex flex-wrap gap-2">
            {prevLog.sets.map((s, i) => (
              <span key={i} className="text-slate-400 text-xs">
                {s.weight}{unit} × {s.reps}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 text-xs text-slate-500 px-8">
        <span className="flex-1">Weight</span>
        <span className="flex-1">Reps</span>
      </div>

      <div className="space-y-2">
        {log.sets.map((set, i) => (
          <SetRow
            key={i}
            set={set}
            index={i}
            unit={unit}
            onChange={s => updateSet(i, s)}
            onRemove={() => removeSet(i)}
          />
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={addSet} className="w-full">
        + Add Set
      </Button>
    </Card>
  );
}

export default function LogWorkout() {
  const { data, dispatch, today } = useApp();
  const { settings, splits, workoutLogs } = data;
  const users = settings.users;
  const unit = settings.weightUnit;

  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSplitId, setSelectedSplitId] = useState(splits[0]?.id || '');
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [saved, setSaved] = useState(false);
  const [addExModal, setAddExModal] = useState(false);
  const [customExName, setCustomExName] = useState('');

  // Load existing log when user/date changes
  useEffect(() => {
    const existing = workoutLogs.find(l => l.userId === selectedUserId && l.date === selectedDate);
    if (existing) {
      setSelectedSplitId(existing.splitId || splits[0]?.id || '');
      setExercises(existing.exercises || []);
      setSaved(false);
    } else {
      setExercises([]);
      setSaved(false);
    }
  }, [selectedUserId, selectedDate]);

  const split = splits.find(s => s.id === selectedSplitId);

  // Get the previous workout log for comparison
  const allDatesForUser = workoutLogs
    .filter(l => l.userId === selectedUserId && l.date < selectedDate && l.splitId === selectedSplitId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const prevLog = allDatesForUser[0];

  const addExercise = (name: string) => {
    if (exercises.find(e => e.name === name)) return;
    setExercises([
      ...exercises,
      { id: crypto.randomUUID(), name, sets: [{ reps: 0, weight: 0 }] },
    ]);
  };

  const addCustomExercise = () => {
    if (!customExName.trim()) return;
    addExercise(customExName.trim());
    setCustomExName('');
    setAddExModal(false);
  };

  const saveWorkout = () => {
    const existing = workoutLogs.find(l => l.userId === selectedUserId && l.date === selectedDate);
    const log: WorkoutLog = {
      id: existing?.id || crypto.randomUUID(),
      userId: selectedUserId,
      date: selectedDate,
      splitId: selectedSplitId,
      exercises: exercises.filter(e => e.sets.some(s => s.reps > 0 || s.weight > 0)),
      attended: true,
    };
    dispatch({ type: existing ? 'UPDATE_WORKOUT' : 'LOG_WORKOUT', payload: log });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div>
        <p className="text-slate-400 text-sm">Log your session</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Log Workout</h1>
      </div>

      {/* Session config */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Athlete</label>
            <Select
              value={selectedUserId}
              onChange={setSelectedUserId}
              options={users.map(u => ({ value: u.id, label: `${u.avatar} ${u.name}` }))}
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Split</label>
            <Select
              value={selectedSplitId}
              onChange={setSelectedSplitId}
              options={splits.map(s => ({ value: s.id, label: s.name }))}
            />
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1.5 block">Date</label>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 w-full"
          />
        </div>
      </Card>

      {/* Quick add from split */}
      {split && split.exercises.length > 0 && (
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 px-1">
            {split.name} exercises
          </p>
          <div className="flex gap-2 flex-wrap">
            {split.exercises.map(ex => {
              const added = exercises.some(e => e.name === ex.name);
              return (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex.name)}
                  disabled={added}
                  className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                    added
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/4 border-white/10 text-slate-300 hover:bg-white/8'
                  }`}
                >
                  {added ? '✓ ' : '+ '}
                  {ex.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise logs */}
      <div className="space-y-3">
        {exercises.map(ex => {
          const prev = prevLog?.exercises.find(e => e.name === ex.name);
          return (
            <ExerciseCard
              key={ex.id}
              log={ex}
              unit={unit}
              prevLog={prev}
              onChange={updated => setExercises(exercises.map(e => e.id === ex.id ? updated : e))}
              onRemove={() => setExercises(exercises.filter(e => e.id !== ex.id))}
            />
          );
        })}
      </div>

      {exercises.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-3xl mb-2">🏋️</p>
          <p className="text-sm">Add exercises from the split above, or add a custom one</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setAddExModal(true)} className="flex-1">
          + Custom Exercise
        </Button>
        <Button
          onClick={saveWorkout}
          disabled={exercises.length === 0}
          className={`flex-1 transition-all ${saved ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
        >
          {saved ? '✓ Saved!' : 'Save Workout'}
        </Button>
      </div>

      {addExModal && (
        <Modal title="Add Exercise" onClose={() => setAddExModal(false)}>
          <div className="space-y-3">
            <Input
              value={customExName}
              onChange={setCustomExName}
              placeholder="Exercise name..."
              onKeyDown={(e: any) => e.key === 'Enter' && addCustomExercise()}
            />
            <div className="flex gap-2">
              <Button onClick={addCustomExercise} className="flex-1">Add</Button>
              <Button variant="secondary" onClick={() => setAddExModal(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
