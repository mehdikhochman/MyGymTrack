-- MyGymTrack schema. Run once in the Neon SQL editor.

create table if not exists sessions (
  id serial primary key,
  date date not null
);

create table if not exists sets (
  id serial primary key,
  session_id integer not null references sessions(id) on delete cascade,
  muscle text not null,
  exercise text not null,
  weight_kg real not null,
  reps integer not null,
  created_at timestamptz not null default now()
);
create index if not exists sets_session_idx on sets(session_id);
create index if not exists sets_exercise_idx on sets(exercise);

create table if not exists meals (
  id serial primary key,
  date date not null,
  name text,
  calories integer not null,
  protein_g real not null default 0
);
create index if not exists meals_date_idx on meals(date);

create table if not exists body_weight (
  id serial primary key,
  date date not null,
  weight_kg real not null
);

create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists research_notes (
  id serial primary key,
  title text not null,
  summary text not null,
  source_url text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists coach_reports (
  id serial primary key,
  created_at timestamptz not null default now(),
  content text not null
);
