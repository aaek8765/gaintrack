import { useState, useRef } from 'react';
import { useApp } from '../store';
import type { User } from '../types';
import { Card, Button, Input, UserAvatar } from '../components/ui';

const EMOJIS = ['🦁', '🐺', '🐻', '🦊', '🐯', '🦅', '🐉', '⚡', '🔥', '💪', '🏆', '🎯', '👑', '⚔️', '🗡️', '🔱'];
const COLORS = ['#f97316', '#ea580c', '#fb923c', '#fbbf24', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6'];

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 300;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
        } else {
          if (height > MAX) { width = (width * MAX) / height; height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function UserEditor({
  user,
  onSave,
  onDelete,
  canDelete,
}: {
  user: User;
  onSave: (u: User) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.color);
  const [avatar, setAvatar] = useState(user.avatar);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setAvatarUrl(compressed);
    } catch {
      alert('Failed to process image');
    }
  };

  const save = () => {
    onSave({ ...user, name: name.trim() || user.name, color, avatar, avatarUrl: avatarUrl || undefined });
    setExpanded(false);
  };

  const previewUser: User = { ...user, name, color, avatar, avatarUrl: avatarUrl || undefined };

  return (
    <Card className={`overflow-hidden transition-all ${expanded ? 'border-orange-500/20' : ''}`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <UserAvatar user={previewUser} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-slate-500 text-xs">{avatar}</span>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/6 pt-4">
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Name</label>
            <Input value={name} onChange={setName} placeholder="Athlete name" />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-medium block mb-2">Profile Photo</label>
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-12 h-12 rounded-2xl object-cover border border-white/10" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {avatarUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setAvatarUrl('')}>Remove</Button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {!avatarUrl && (
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-2">Emoji Avatar</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setAvatar(e)}
                    className={`w-9 h-9 rounded-xl text-xl transition-all border ${
                      avatar === e ? 'border-orange-500 bg-orange-500/20 scale-110' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 text-xs font-medium block mb-2">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={save} className="flex-1">Save</Button>
            {canDelete && (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remove ${user.name}? This deletes all their data.`)) onDelete();
                }}
              >
                Remove
              </Button>
            )}
            <Button variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Settings() {
  const { data, dispatch } = useApp();
  const { settings } = data;
  const users = settings.users;
  const [saved, setSaved] = useState(false);

  const saveUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addUser = () => {
    const EXTRA = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    const newUser: User = {
      id: crypto.randomUUID(),
      name: `Athlete ${users.length + 1}`,
      color: EXTRA[(users.length) % EXTRA.length],
      avatar: '💪',
    };
    dispatch({ type: 'ADD_USER', payload: newUser });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div>
        <p className="text-slate-400 text-sm">App configuration</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Settings</h1>
      </div>

      <Card className="p-4">
        <h2 className="text-white font-semibold mb-3">Weight Unit</h2>
        <div className="flex gap-2">
          {(['kg', 'lbs'] as const).map(u => (
            <button
              key={u}
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { weightUnit: u } })}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm border transition-all ${
                settings.weightUnit === u
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                  : 'bg-white/4 border-white/8 text-slate-400 hover:bg-white/8'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-white font-semibold">Athletes</h2>
          <Button variant="secondary" size="sm" onClick={addUser}>+ Add Athlete</Button>
        </div>
        <div className="space-y-2">
          {users.map(user => (
            <UserEditor
              key={user.id}
              user={user}
              onSave={saveUser}
              onDelete={() => dispatch({ type: 'DELETE_USER', payload: user.id })}
              canDelete={users.length > 1}
            />
          ))}
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
          ✓ Saved
        </div>
      )}

      <Card className="p-4 border-red-500/10">
        <h2 className="text-white font-semibold mb-1">Data</h2>
        <p className="text-slate-500 text-sm mb-3">All data is stored locally in your browser.</p>
        <Button variant="danger" onClick={() => {
          if (confirm('Delete ALL data?')) { localStorage.removeItem('fitness-tracker-v1'); window.location.reload(); }
        }} className="w-full">
          Reset All Data
        </Button>
      </Card>
    </div>
  );
}
