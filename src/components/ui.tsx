import React from 'react';
import type { User } from '../types';

// ─── UserAvatar ─────────────────────────────────────────────────────────────

export function UserAvatar({
  user,
  size = 'md',
  className = '',
}: {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = { sm: 'w-7 h-7 text-sm', md: 'w-10 h-10 text-xl', lg: 'w-12 h-12 text-2xl', xl: 'w-16 h-16 text-3xl' };
  return (
    <div
      className={`${sizes[size]} rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
      style={{ backgroundColor: `${user.color}20`, border: `1px solid ${user.color}40` }}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <span>{user.avatar}</span>
      )}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#161610] rounded-2xl border border-white/6 ${className}`}>
      {children}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  const variants = {
    primary: 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30',
    secondary: 'bg-white/8 hover:bg-white/12 text-white border border-white/10',
    ghost: 'hover:bg-white/8 text-slate-400 hover:text-white',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  min,
  max,
  step,
  onKeyDown,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={`bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 w-full ${className}`}
    />
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────

export function Select({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-[#161610] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 w-full appearance-none cursor-pointer ${className}`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-[#161610]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color: color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#161610] rounded-2xl border border-white/10 w-full shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
