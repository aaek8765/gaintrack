-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste → Run

create table if not exists splits (
  id text primary key,
  name text not null,
  color text not null,
  exercises jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists schedules (
  id text primary key,
  name text not null,
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists workout_logs (
  id text primary key,
  user_id text not null,
  date text not null,
  split_id text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  attended boolean not null default false,
  updated_at timestamptz default now()
);

create table if not exists prs (
  id text primary key,
  user_id text not null,
  exercise_name text not null,
  weight numeric not null,
  reps integer not null,
  date text not null,
  notes text,
  updated_at timestamptz default now()
);

create table if not exists weigh_ins (
  id text primary key,
  user_id text not null,
  date text not null,
  weight numeric not null,
  updated_at timestamptz default now()
);

create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Disable RLS (public shared app, no auth)
alter table splits disable row level security;
alter table schedules disable row level security;
alter table workout_logs disable row level security;
alter table prs disable row level security;
alter table weigh_ins disable row level security;
alter table app_config disable row level security;

-- Enable realtime
alter publication supabase_realtime add table splits;
alter publication supabase_realtime add table schedules;
alter publication supabase_realtime add table workout_logs;
alter publication supabase_realtime add table prs;
alter publication supabase_realtime add table weigh_ins;
alter publication supabase_realtime add table app_config;
