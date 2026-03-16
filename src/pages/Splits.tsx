import { useState } from 'react';
import { useApp } from '../store';
import type { Split, Exercise, WeekSchedule } from '../types';
import { Card, Button, Input, Select, Badge, Modal } from '../components/ui';

const COLORS = ['#f97316', '#ea580c', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function SplitEditor({
  split,
  onSave,
  onClose,
}: {
  split: Partial<Split> & { id: string };
  onSave: (s: Split) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(split.name || '');
  const [color, setColor] = useState(split.color || COLORS[0]);
  const [exercises, setExercises] = useState<Exercise[]>(split.exercises || []);
  const [newEx, setNewEx] = useState('');

  const addEx = () => {
    if (!newEx.trim()) return;
    setExercises([...exercises, { id: crypto.randomUUID(), name: newEx.trim() }]);
    setNewEx('');
  };

  const removeEx = (id: string) => setExercises(exercises.filter(e => e.id !== id));

  const save = () => {
    if (!name.trim()) return;
    onSave({ id: split.id, name: name.trim(), color, exercises });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Split Name</label>
        <Input value={name} onChange={setName} placeholder="e.g. Push, Legs, Arms..." />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? 'scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-2">Exercises</label>
        <div className="space-y-1.5 mb-2 max-h-48 overflow-y-auto">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-2 bg-white/4 rounded-xl px-3 py-2">
              <span className="text-slate-500 text-xs w-5">{i + 1}</span>
              <span className="text-white text-sm flex-1">{ex.name}</span>
              <button
                onClick={() => removeEx(ex.id)}
                className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newEx}
            onChange={setNewEx}
            placeholder="Add exercise..."
            onKeyDown={(e: any) => e.key === 'Enter' && addEx()}
          />
          <Button onClick={addEx} variant="secondary" size="md">Add</Button>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={save} className="flex-1">Save Split</Button>
        <Button onClick={onClose} variant="secondary">Cancel</Button>
      </div>
    </div>
  );
}

function ScheduleEditor({
  schedule,
  splits,
  onSave,
  onClose,
}: {
  schedule: Partial<WeekSchedule> & { id: string };
  splits: Split[];
  onSave: (s: WeekSchedule) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(schedule.name || '');
  const [days, setDays] = useState(
    schedule.days || Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, splitId: null }))
  );

  const setDay = (i: number, splitId: string | null) => {
    setDays(days.map(d => d.dayIndex === i ? { ...d, splitId } : d));
  };

  const save = () => {
    if (!name.trim()) return;
    onSave({ id: schedule.id, name: name.trim(), days });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Schedule Name</label>
        <Input value={name} onChange={setName} placeholder="e.g. PPL, Push Pull Legs..." />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-2">Weekly Plan</label>
        <div className="space-y-2">
          {DAY_NAMES.map((day, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-slate-400 text-sm w-24 flex-shrink-0">{day}</span>
              <Select
                value={days[i]?.splitId || ''}
                onChange={v => setDay(i, v || null)}
                options={[
                  { value: '', label: 'Rest day' },
                  ...splits.map(s => ({ value: s.id, label: s.name })),
                ]}
              />
              {days[i]?.splitId && (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: splits.find(s => s.id === days[i].splitId)?.color }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={save} className="flex-1">Save Schedule</Button>
        <Button onClick={onClose} variant="secondary">Cancel</Button>
      </div>
    </div>
  );
}

export default function Splits() {
  const { data, dispatch } = useApp();
  const { splits, schedules, settings } = data;

  const [editingSplit, setEditingSplit] = useState<(Partial<Split> & { id: string }) | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<(Partial<WeekSchedule> & { id: string }) | null>(null);
  const [tab, setTab] = useState<'splits' | 'schedules'>('splits');

  const saveSplit = (s: Split) => {
    const exists = splits.find(x => x.id === s.id);
    dispatch({ type: exists ? 'UPDATE_SPLIT' : 'ADD_SPLIT', payload: s });
    setEditingSplit(null);
  };

  const saveSchedule = (s: WeekSchedule) => {
    const exists = schedules.find(x => x.id === s.id);
    dispatch({ type: exists ? 'UPDATE_SCHEDULE' : 'ADD_SCHEDULE', payload: s });
    setEditingSchedule(null);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-400 text-sm">Customize your training</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Splits & Schedules</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {(['splits', 'schedules'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'splits' && (
        <>
          <Button
            onClick={() => setEditingSplit({ id: crypto.randomUUID(), exercises: [] })}
            className="w-full"
          >
            + New Split
          </Button>
          <div className="space-y-3">
            {splits.map(split => (
              <Card key={split.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: split.color }} />
                  <h3 className="text-white font-semibold flex-1">{split.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSplit(split)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => dispatch({ type: 'DELETE_SPLIT', payload: split.id })}
                  >
                    ×
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {split.exercises.map(ex => (
                    <Badge key={ex.id} color={split.color}>{ex.name}</Badge>
                  ))}
                  {split.exercises.length === 0 && (
                    <span className="text-slate-500 text-xs">No exercises added yet</span>
                  )}
                </div>
              </Card>
            ))}
            {splits.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-4xl mb-2">💪</p>
                <p>No splits yet. Create your first one!</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'schedules' && (
        <>
          <Button
            onClick={() => setEditingSchedule({ id: crypto.randomUUID() })}
            className="w-full"
          >
            + New Schedule
          </Button>
          <div className="space-y-3">
            {schedules.map(schedule => {
              const isActive = schedule.id === settings.activeScheduleId;
              return (
                <Card key={schedule.id} className={`p-4 ${isActive ? 'border-orange-500/30' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{schedule.name}</h3>
                        {isActive && <Badge color="#f97316">Active</Badge>}
                      </div>
                    </div>
                    {!isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { activeScheduleId: schedule.id } })}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setEditingSchedule(schedule)}>Edit</Button>
                    {!isActive && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => dispatch({ type: 'DELETE_SCHEDULE', payload: schedule.id })}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {schedule.days.map((day, i) => {
                      const split = splits.find(s => s.id === day.splitId);
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <span className="text-slate-500 text-[10px] mb-1">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                          <div
                            className="w-full aspect-square rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: split ? `${split.color}20` : 'transparent',
                              border: `1px solid ${split ? split.color + '40' : '#ffffff10'}`,
                            }}
                          >
                            <span className="text-[9px] font-medium text-center px-0.5" style={{ color: split?.color || '#444' }}>
                              {split ? split.name.slice(0, 3) : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {editingSplit && (
        <Modal
          title={editingSplit.name ? `Edit: ${editingSplit.name}` : 'New Split'}
          onClose={() => setEditingSplit(null)}
        >
          <SplitEditor split={editingSplit} onSave={saveSplit} onClose={() => setEditingSplit(null)} />
        </Modal>
      )}

      {editingSchedule && (
        <Modal
          title={editingSchedule.name ? `Edit: ${editingSchedule.name}` : 'New Schedule'}
          onClose={() => setEditingSchedule(null)}
          wide
        >
          <ScheduleEditor
            schedule={editingSchedule}
            splits={splits}
            onSave={saveSchedule}
            onClose={() => setEditingSchedule(null)}
          />
        </Modal>
      )}
    </div>
  );
}
