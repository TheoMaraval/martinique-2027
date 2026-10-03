create or replace function trip_id_for(p_code text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from trips where code = p_code;
  if v is null then raise exception 'invalid_code'; end if;
  return v;
end $$;

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
    'stays', coalesce((select jsonb_agg(to_jsonb(x)) from stays x where x.trip_id = v), '[]'::jsonb)
  );
end $$;

create or replace function set_budget(p_code text, p_person uuid, p_budget numeric) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if p_budget is not null and p_budget < 0 then raise exception 'invalid_input'; end if;
  update people set budget_max = p_budget where id = p_person and trip_id = v;
end $$;

create or replace function upsert_wish(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from people where id = (p->>'person_id')::uuid and trip_id = v)
     or not exists (select 1 from activities where id = (p->>'activity_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  insert into wishes (id, trip_id, person_id, activity_id, duration, quantity)
  values ((p->>'id')::uuid, v, (p->>'person_id')::uuid, (p->>'activity_id')::uuid, p->>'duration', coalesce((p->>'quantity')::int, 1))
  on conflict (person_id, activity_id, duration) do update set quantity = excluded.quantity;
end $$;

create or replace function delete_wish(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from wishes where id = p_id and trip_id = v;
end $$;

create or replace function upsert_activity(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  insert into activities (id, trip_id, name, category, durations, has_quantity, description, links, is_custom, created_by)
  values (
    (p->>'id')::uuid, v, trim(p->>'name'), trim(p->>'category'),
    array(select jsonb_array_elements_text(p->'durations')),
    coalesce((p->>'has_quantity')::boolean, false), coalesce(p->>'description', ''),
    coalesce(p->'links', '[]'::jsonb), true, (p->>'created_by')::uuid
  )
  on conflict (id) do update set
    name = excluded.name, category = excluded.category, durations = excluded.durations,
    has_quantity = excluded.has_quantity, description = excluded.description, links = excluded.links
  where activities.trip_id = v;
end $$;

create or replace function delete_activity(p_code text, p_id uuid, p_person uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if exists (select 1 from events where activity_id = p_id) then raise exception 'activity_in_use'; end if;
  delete from activities where id = p_id and trip_id = v and is_custom and created_by = p_person;
  if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function upsert_team(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if (p->>'end_date')::date < (p->>'start_date')::date then raise exception 'invalid_input'; end if;
  insert into teams (id, trip_id, name, color, start_date, start_part, end_date, end_part, is_default)
  values ((p->>'id')::uuid, v, p->>'name', p->>'color', (p->>'start_date')::date, p->>'start_part',
          (p->>'end_date')::date, p->>'end_part', false)
  on conflict (id) do update set
    name = excluded.name, color = excluded.color, start_date = excluded.start_date,
    start_part = excluded.start_part, end_date = excluded.end_date, end_part = excluded.end_part
  where teams.trip_id = v and not teams.is_default;
end $$;

create or replace function delete_team(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from teams where id = p_id and trip_id = v and not is_default;
end $$;

create or replace function set_team_members(p_code text, p_team uuid, p_people uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = p_team and trip_id = v and not is_default) then
    raise exception 'forbidden';
  end if;
  delete from team_members where team_id = p_team;
  insert into team_members (trip_id, team_id, person_id)
  select v, p_team, x from unnest(p_people) x where x in (select id from people where trip_id = v);
end $$;

create or replace function upsert_event(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = (p->>'team_id')::uuid and trip_id = v)
     or not exists (select 1 from activities where id = (p->>'activity_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  insert into events (id, trip_id, team_id, activity_id, duration, occurrence, start_date, start_part,
                      place_name, lat, lng, price, price_mode, links, notes)
  values (
    (p->>'id')::uuid, v, (p->>'team_id')::uuid, (p->>'activity_id')::uuid, p->>'duration',
    coalesce((p->>'occurrence')::int, 1), (p->>'start_date')::date, p->>'start_part',
    coalesce(p->>'place_name', ''), (p->>'lat')::float8, (p->>'lng')::float8, (p->>'price')::numeric,
    coalesce(p->>'price_mode', 'total'), coalesce(p->'links', '[]'::jsonb), coalesce(p->>'notes', '')
  )
  on conflict (id) do update set
    team_id = excluded.team_id, start_date = excluded.start_date, start_part = excluded.start_part,
    place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng, price = excluded.price,
    price_mode = excluded.price_mode, links = excluded.links, notes = excluded.notes
  where events.trip_id = v;
end $$;

create or replace function delete_event(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from events where id = p_id and trip_id = v;
end $$;

create or replace function set_event_participants(p_code text, p_event uuid, p_people uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from events where id = p_event and trip_id = v) then raise exception 'forbidden'; end if;
  delete from event_participants where event_id = p_event;
  insert into event_participants (trip_id, event_id, person_id)
  select v, p_event, x from unnest(p_people) x where x in (select id from people where trip_id = v);
end $$;

create or replace function add_comment(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from events where id = (p->>'event_id')::uuid and trip_id = v)
     or not exists (select 1 from people where id = (p->>'author_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  insert into event_comments (id, trip_id, event_id, author_id, body)
  values ((p->>'id')::uuid, v, (p->>'event_id')::uuid, (p->>'author_id')::uuid, p->>'body');
end $$;

create or replace function delete_comment(p_code text, p_id uuid, p_author uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from event_comments where id = p_id and trip_id = v and author_id = p_author;
end $$;

create or replace function upsert_stay(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = (p->>'team_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  -- La première option proposée pour (équipe, nuit) est retenue par défaut.
  insert into stays (id, trip_id, team_id, night_date, place_name, lat, lng, price, price_mode, links, notes, chosen)
  values (
    (p->>'id')::uuid, v, (p->>'team_id')::uuid, (p->>'night_date')::date, coalesce(p->>'place_name', ''),
    (p->>'lat')::float8, (p->>'lng')::float8, (p->>'price')::numeric, coalesce(p->>'price_mode', 'total'),
    coalesce(p->'links', '[]'::jsonb), coalesce(p->>'notes', ''),
    not exists (select 1 from stays where team_id = (p->>'team_id')::uuid and night_date = (p->>'night_date')::date)
  )
  on conflict (id) do update set
    place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng, price = excluded.price,
    price_mode = excluded.price_mode, links = excluded.links, notes = excluded.notes
  where stays.trip_id = v;
end $$;

create or replace function choose_stay(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code); v_team uuid; v_night date;
begin
  select team_id, night_date into v_team, v_night from stays where id = p_id and trip_id = v;
  if v_team is null then raise exception 'forbidden'; end if;
  update stays set chosen = false where team_id = v_team and night_date = v_night and chosen;
  update stays set chosen = true where id = p_id;
end $$;

create or replace function delete_stay(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  delete from stays where id = p_id and trip_id = v;
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  get_trip(text), set_budget(text, uuid, numeric),
  upsert_wish(text, jsonb), delete_wish(text, uuid),
  upsert_activity(text, jsonb), delete_activity(text, uuid, uuid),
  upsert_team(text, jsonb), delete_team(text, uuid), set_team_members(text, uuid, uuid[]),
  upsert_event(text, jsonb), delete_event(text, uuid), set_event_participants(text, uuid, uuid[]),
  add_comment(text, jsonb), delete_comment(text, uuid, uuid),
  upsert_stay(text, jsonb), choose_stay(text, uuid), delete_stay(text, uuid)
to anon, authenticated;
