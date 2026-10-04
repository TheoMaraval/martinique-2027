-- v2 : créneau « Midi », activités simples étirables (« flex »), repas par équipe et par jour.
-- Spec : docs/superpowers/specs/2026-10-04-midi-flex-repas-design.md

-- 0. Aucune écriture concurrente pendant la conversion (sauvegarde cohérente).
lock table public.wishes, public.activities, public.events in share row exclusive mode;

-- 1. Sauvegarde préalable (schéma sans aucun droit pour anon/authenticated).
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table backup.wishes_20261004 as table public.wishes;
create table backup.activities_20261004 as table public.activities;
create table backup.events_20261004 as table public.events;
revoke all on all tables in schema backup from public, anon, authenticated;

-- 2. Moments de la journée : matin, midi, aprem, soir.
alter table teams drop constraint if exists teams_start_part_check;
alter table teams drop constraint if exists teams_end_part_check;
alter table teams add constraint teams_start_part_check check (start_part in ('matin', 'midi', 'aprem', 'soir'));
alter table teams add constraint teams_end_part_check check (end_part in ('matin', 'midi', 'aprem', 'soir'));
alter table events drop constraint if exists events_start_part_check;
alter table events add constraint events_start_part_check check (start_part in ('matin', 'midi', 'aprem', 'soir'));

-- 3. Fin d'emprise (incluse) d'une activité simple étirée ; null pour un multi-jours.
alter table events add column if not exists end_date date;
alter table events add column if not exists end_part text;
alter table events drop constraint if exists events_end_part_check;
alter table events add constraint events_end_part_check check (end_part is null or end_part in ('matin', 'midi', 'aprem', 'soir'));
alter table events drop constraint if exists events_end_pair_check;
alter table events add constraint events_end_pair_check check ((end_date is null) = (end_part is null));

-- 4. Activités placées : half/evening/day → flex avec une fin explicite.
update events set duration = 'flex', end_date = start_date, end_part = start_part
where duration = 'half';

update events set duration = 'flex', start_part = 'soir', end_date = start_date, end_part = 'soir'
where duration = 'evening';

-- Journée : du matin (ou du premier créneau planifiable du jour, déjà retenu comme départ) à l'après-midi.
update events set duration = 'flex', end_date = start_date,
  end_part = case
    when start_date = (select t.end_date from trips t where t.id = events.trip_id) then start_part
    when start_part in ('matin', 'midi', 'aprem') then 'aprem'
    else start_part end
where duration = 'day';

-- Renumérotation des occurrences par activité (half#1 et day#1 deviendraient flex#1 deux fois).
with r as (
  select id, row_number() over (partition by activity_id order by start_date,
           array_position(array['matin', 'midi', 'aprem', 'soir'], start_part), occurrence, id) as n
  from events where duration = 'flex'
)
update events e set occurrence = r.n from r where e.id = r.id and e.occurrence <> r.n;

-- 5. Activités : durées simples → {flex} ; formules multi-jours conservées.
update activities set durations =
  array['flex'] || coalesce(array(select d from unnest(durations) d where d like 'multi:%'), '{}')
where exists (select 1 from unnest(durations) d where d in ('half', 'day', 'evening'));

-- 6. Envies simples → flex, une seule par (personne, activité), en gardant la plus grande quantité.
drop table if exists wish_merge;
create temp table wish_merge as
select id,
       max(quantity) over w as max_quantity,
       row_number() over (w order by (duration = 'flex') desc, quantity desc, id) as rn
from wishes
where duration in ('half', 'day', 'evening', 'flex')
window w as (partition by person_id, activity_id);

update wishes x set quantity = m.max_quantity from wish_merge m where x.id = m.id and m.rn = 1;
delete from wishes x using wish_merge m where x.id = m.id and m.rn > 1;
update wishes set duration = 'flex' where duration in ('half', 'day', 'evening');
drop table wish_merge;

-- 7. Repas par équipe et par jour (pour info : jamais comptés dans les dépenses).
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  team_id uuid not null references teams on delete cascade,
  date date not null,
  kind text not null check (kind in ('dejeuner', 'diner')),
  place_name text not null default '',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  links jsonb not null default '[]' constraint meals_links_ok check (links_ok(links)),
  price numeric check (price >= 0),
  price_mode text not null default 'total' check (price_mode in ('total', 'per_person')),
  notes text not null default '',
  unique (team_id, date, kind)
);

-- Accès direct interdit : tout passe par les RPC security definer.
alter table meals enable row level security;
revoke all on meals from anon, authenticated;

create or replace function get_trip(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  return jsonb_build_object(
    'trip', (select to_jsonb(t) - 'code' from trips t where t.id = v),
    'people', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort) from people x where x.trip_id = v), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(to_jsonb(x) order by x.category, x.name) from activities x where x.trip_id = v), '[]'::jsonb),
    'wishes', coalesce((select jsonb_agg(to_jsonb(x)) from wishes x where x.trip_id = v), '[]'::jsonb),
    'teams', coalesce((select jsonb_agg(to_jsonb(x) order by x.is_default desc, x.start_date) from teams x where x.trip_id = v), '[]'::jsonb),
    'team_members', coalesce((select jsonb_agg(to_jsonb(x)) from team_members x where x.trip_id = v), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(x)) from events x where x.trip_id = v), '[]'::jsonb),
    'event_participants', coalesce((select jsonb_agg(to_jsonb(x)) from event_participants x where x.trip_id = v), '[]'::jsonb),
    'event_comments', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from event_comments x where x.trip_id = v), '[]'::jsonb),
    'stays', coalesce((select jsonb_agg(to_jsonb(x)) from stays x where x.trip_id = v), '[]'::jsonb),
    'meals', coalesce((select jsonb_agg(to_jsonb(x) order by x.date, x.kind) from meals x where x.trip_id = v), '[]'::jsonb)
  );
end $$;

create or replace function upsert_event(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = (p->>'team_id')::uuid and trip_id = v)
     or not exists (select 1 from activities where id = (p->>'activity_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  if (p->>'end_date') is not null and (p->>'end_date')::date < (p->>'start_date')::date then
    raise exception 'invalid_input';
  end if;
  -- Dates hors voyage : elles feraient planter le calcul des créneaux chez tous les clients.
  if exists (select 1 from trips t where t.id = v and (
       (p->>'start_date')::date not between t.start_date and t.end_date
       or ((p->>'end_date') is not null and (p->>'end_date')::date not between t.start_date and t.end_date))) then
    raise exception 'invalid_input';
  end if;
  insert into events (id, trip_id, team_id, activity_id, duration, occurrence, start_date, start_part,
                      end_date, end_part, place_name, lat, lng, price, price_mode, links, notes)
  values (
    (p->>'id')::uuid, v, (p->>'team_id')::uuid, (p->>'activity_id')::uuid, p->>'duration',
    coalesce((p->>'occurrence')::int, 1), (p->>'start_date')::date, p->>'start_part',
    (p->>'end_date')::date, p->>'end_part',
    coalesce(p->>'place_name', ''), (p->>'lat')::float8, (p->>'lng')::float8, (p->>'price')::numeric,
    coalesce(p->>'price_mode', 'total'), coalesce(p->'links', '[]'::jsonb), coalesce(p->>'notes', '')
  )
  on conflict (id) do update set
    team_id = excluded.team_id, start_date = excluded.start_date, start_part = excluded.start_part,
    end_date = excluded.end_date, end_part = excluded.end_part,
    place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng, price = excluded.price,
    price_mode = excluded.price_mode, links = excluded.links, notes = excluded.notes
  where events.trip_id = v;
end $$;

-- Un seul repas par (équipe, jour, type) : un nouvel enregistrement remplace l'existant (et reprend son id).
create or replace function upsert_meal(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = (p->>'team_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from trips where id = v and (p->>'date')::date between start_date and end_date)
     or coalesce(p->>'kind', '') not in ('dejeuner', 'diner') then
    raise exception 'invalid_input';
  end if;
  insert into meals (id, trip_id, team_id, date, kind, place_name, lat, lng, links, price, price_mode, notes)
  values (
    (p->>'id')::uuid, v, (p->>'team_id')::uuid, (p->>'date')::date, p->>'kind', coalesce(p->>'place_name', ''),
    (p->>'lat')::float8, (p->>'lng')::float8, coalesce(p->'links', '[]'::jsonb), (p->>'price')::numeric,
    coalesce(p->>'price_mode', 'total'), coalesce(p->>'notes', '')
  )
  on conflict (team_id, date, kind) do update set
    id = excluded.id, place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng,
    links = excluded.links, price = excluded.price, price_mode = excluded.price_mode, notes = excluded.notes
  where meals.trip_id = v;
end $$;

create or replace function delete_meal(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from meals where id = p_id and trip_id = v;
end $$;

-- Rappel : Supabase donne EXECUTE à anon sur toute nouvelle fonction ; chaque migration doit refaire ce revoke/grant.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  get_trip(text), set_budget(text, uuid, numeric),
  upsert_wish(text, jsonb), delete_wish(text, uuid),
  upsert_activity(text, jsonb), delete_activity(text, uuid, uuid),
  upsert_team(text, jsonb), delete_team(text, uuid), set_team_members(text, uuid, uuid[]),
  upsert_event(text, jsonb), delete_event(text, uuid), set_event_participants(text, uuid, uuid[]),
  add_comment(text, jsonb), delete_comment(text, uuid, uuid),
  upsert_stay(text, jsonb), choose_stay(text, uuid), delete_stay(text, uuid),
  upsert_meal(text, jsonb), delete_meal(text, uuid)
to anon, authenticated;
