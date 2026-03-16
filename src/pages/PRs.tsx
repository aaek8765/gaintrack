import { useState, useMemo } from 'react';
import { useApp } from '../store';
import type { PR } from '../types';
import { Card, Button, Input, Select, Modal } from '../components/ui';
import { format } from 'date-fns';

function PRForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<PR>;
  onSave: (pr: PR) => void;
  onClose: () => void;
}) {
  const { data, today } = useApp();
  const { settings } = data;
  const users = settings.users;
  const unit = settings.weightUnit;

  const [userId, setUserId] = useState(initial?.userId || users[0]?.id || '');
  const [exercise, setExercise] = useState(initial?.exerciseName || '');
  const [weight, setWeight] = useState(String(initial?.weight || ''));
  const [reps, setReps] = useState(String(initial?.reps || '1'));
  const [date, setDate] = useState(initial?.date || today);
  const [notes, setNotes] = useState(initial?.notes || '');

  const save = () => {
    if (!exercise.trim() || !weight) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      userId,
      exerciseName: exercise.trim(),
      weight: parseFloat(weight),
      reps: parseInt(reps) || 1,
      date,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Athlete</label>
        <Select
          value={userId}
          onChange={setUserId}
          options={users.map(u => ({ value: u.id, label: `${u.avatar} ${u.name}` }))}
        />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Exercise</label>
        <Input value={exercise} onChange={setExercise} placeholder="e.g. Bench Press, Squat..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs font-medium block mb-1.5">Weight ({unit})</label>
          <Input type="number" value={weight} onChange={setWeight} placeholder="0" min={0} step={0.5} />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium block mb-1.5">Reps</label>
          <Input type="number" value={reps} onChange={setReps} placeholder="1" min={1} />
        </div>
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Date</label>
        <Input type="date" value={date} onChange={setDate} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Notes (optional)</label>
        <Input value={notes} onChange={setNotes} placeholder="Any notes..." />
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={save} className="flex-1">Save PR</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function PRs() {
  const { data, dispatch } = useApp();
  const { prs, settings } = data;
  const users = settings.users;
  const unit = settings.weightUnit;

  const [editingPR, setEditingPR] = useState<Partial<PR> | null>(null);
  const [filterUser, setFilterUser] = useState('all');
  const [filterEx, setFilterEx] = useState('');

  // Group PRs by exercise, showing the progression
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    prs.forEach(p => names.add(p.exerciseName));
    return Array.from(names).sort();
  }, [prs]);

  const filteredPRs = useMemo(() => {
    return prs
      .filter(p => filterUser === 'all' || p.userId === filterUser)
      .filter(p => !filterEx || p.exerciseName === filterEx)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [prs, filterUser, filterEx]);

  // Per exercise, get best PR per user
  const prByExercise = useMemo(() => {
    const map: Record<string, { user: typeof users[0]; pr: PR; history: PR[] }[]> = {};
    exerciseNames.forEach(exName => {
      const exPRs = prs.filter(p => p.exerciseName === exName);
      map[exName] = users.map(user => {
        const userPRs = exPRs.filter(p => p.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));
        const best = [...userPRs].sort((a, b) => {
          const aEst = a.weight * (1 + a.reps / 30);
          const bEst = b.weight * (1 + b.reps / 30);
          return bEst - aEst;
        })[0];
        return { user, pr: best!, history: userPRs };
      }).filter(x => x.pr);
    });
    return map;
  }, [prs, exerciseNames, users]);

  const savePR = (pr: PR) => {
    const exists = prs.find(p => p.id === pr.id);
    dispatch({ type: exists ? 'UPDATE_PR' : 'ADD_PR', payload: pr });
    setEditingPR(null);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-400 text-sm">Personal records</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">PRs</h1>
        </div>
        <Button onClick={() => setEditingPR({})}>+ Add PR</Button>
      </div>

      {/* Filters */}
      {exerciseNames.length > 0 && (
        <div className="flex gap-2">
          <Select
            value={filterUser}
            onChange={setFilterUser}
            options={[
              { value: 'all', label: 'All athletes' },
              ...users.map(u => ({ value: u.id, label: `${u.avatar} ${u.name}` })),
            ]}
          />
          <Select
            value={filterEx}
            onChange={setFilterEx}
            options={[
              { value: '', label: 'All exercises' },
              ...exerciseNames.map(e => ({ value: e, label: e })),
            ]}
          />
        </div>
      )}

      {/* Exercise PR cards */}
      {!filterEx && exerciseNames.length > 0 && (
        <div className="space-y-3">
          {exerciseNames.map(exName => {
            const entries = prByExercise[exName] || [];
            if (entries.length === 0) return null;

            // Determine who has the better PR
            const ranked = [...entries].sort((a, b) => {
              const aEst = a.pr.weight * (1 + a.pr.reps / 30);
              const bEst = b.pr.weight * (1 + b.pr.reps / 30);
              return bEst - aEst;
            });

            return (
              <Card key={exName} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-white font-semibold flex-1">{exName}</h3>
                  <span className="text-slate-500 text-xs">Best 1RM est.</span>
                </div>
                <div className="space-y-2">
                  {ranked.map(({ user, pr }, rank) => {
                    const est1RM = pr.weight * (1 + pr.reps / 30);
                    return (
                      <div key={user.id} className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                          style={{ backgroundColor: `${user.color}20` }}
                        >
                          {user.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{pr.weight}{unit} × {pr.reps}</span>
                            <span className="text-slate-500 text-xs">≈ {est1RM.toFixed(1)}{unit}</span>
                            {rank === 0 && entries.length > 1 && (
                              <span className="text-amber-400 text-xs">🥇</span>
                            )}
                          </div>
                          <span className="text-slate-500 text-xs">{format(new Date(pr.date), 'MMM d, yyyy')}</span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(est1RM / (ranked[0].pr.weight * (1 + ranked[0].pr.reps / 30))) * 100}%`,
                              backgroundColor: user.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed PR history list */}
      {(filterEx || exerciseNames.length === 0) && (
        <div className="space-y-2">
          {filteredPRs.map(pr => {
            const user = users.find(u => u.id === pr.userId);
            if (!user) return null;
            const est1RM = pr.weight * (1 + pr.reps / 30);
            return (
              <Card key={pr.id} className="p-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: `${user.color}20`, border: `1px solid ${user.color}30` }}
                >
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{pr.exerciseName}</p>
                  <p className="text-slate-400 text-xs">
                    {pr.weight}{unit} × {pr.reps} rep{pr.reps !== 1 ? 's' : ''} · {format(new Date(pr.date), 'MMM d, yyyy')}
                  </p>
                  {pr.notes && <p className="text-slate-500 text-xs mt-0.5 truncate">{pr.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-slate-300 text-sm font-medium">{est1RM.toFixed(1)}</p>
                  <p className="text-slate-500 text-xs">{unit} est.</p>
                </div>
                <div className="flex gap-1 ml-1">
                  <button
                    onClick={() => setEditingPR(pr)}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_PR', payload: pr.id })}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </Card>
            );
          })}
          {filteredPRs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-slate-400">No PRs yet. Add your first one!</p>
            </div>
          )}
        </div>
      )}

      {editingPR !== null && (
        <Modal
          title={editingPR.id ? 'Edit PR' : 'Add PR'}
          onClose={() => setEditingPR(null)}
        >
          <PRForm
            initial={editingPR}
            onSave={savePR}
            onClose={() => setEditingPR(null)}
          />
        </Modal>
      )}
    </div>
  );
}
