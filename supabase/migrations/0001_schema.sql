create table trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_date date not null,
  end_date date not null
);

create table people (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null,
  budget_max numeric check (budget_max >= 0),
  sort int not null default 0
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  durations text[] not null check (cardinality(durations) > 0),
  has_quantity boolean not null default false,
  description text not null default '',
  links jsonb not null default '[]',
  is_custom boolean not null default false,
  created_by uuid references people on delete set null,
  created_at timestamptz not null default now()
);

create table wishes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  person_id uuid not null references people on delete cascade,
  activity_id uuid not null references activities on delete cascade,
  duration text not null,
  quantity int not null default 1 check (quantity between 1 and 10),
  unique (person_id, activity_id, duration)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null,
  color text not null,
  start_date date not null,
  start_part text not null check (start_part in ('matin', 'aprem', 'soir')),
  end_date date not null,
  end_part text not null check (end_part in ('matin', 'aprem', 'soir')),
  is_default boolean not null default false
);

create table team_members (
  trip_id uuid not null references trips on delete cascade,
  team_id uuid not null references teams on delete cascade,
  person_id uuid not null references people on delete cascade,
  primary key (team_id, person_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  team_id uuid not null references teams on delete cascade,
  activity_id uuid not null references activities on delete restrict,
  duration text not null,
  occurrence int not null default 1,
  start_date date not null,
  start_part text not null check (start_part in ('matin', 'aprem', 'soir')),
  place_name text not null default '',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  price numeric check (price >= 0),
  price_mode text not null default 'total' check (price_mode in ('total', 'per_person')),
  links jsonb not null default '[]',
  notes text not null default ''
);

create table event_participants (
  trip_id uuid not null references trips on delete cascade,
  event_id uuid not null references events on delete cascade,
  person_id uuid not null references people on delete cascade,
  primary key (event_id, person_id)
);

create table event_comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  event_id uuid not null references events on delete cascade,
  author_id uuid not null references people on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  team_id uuid not null references teams on delete cascade,
  night_date date not null,
  place_name text not null default '',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  price numeric check (price >= 0),
  price_mode text not null default 'total' check (price_mode in ('total', 'per_person')),
  links jsonb not null default '[]',
  notes text not null default '',
  chosen boolean not null default false
);

-- Plusieurs options de logement par (équipe, nuit), au plus une retenue.
create unique index stays_one_chosen on stays (team_id, night_date) where chosen;

-- Accès direct interdit : tout passe par les RPC security definer (0002_rpc.sql).
alter table trips enable row level security;
alter table people enable row level security;
alter table activities enable row level security;
alter table wishes enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table event_comments enable row level security;
alter table stays enable row level security;

revoke all on all tables in schema public from anon, authenticated;
