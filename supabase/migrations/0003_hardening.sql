create or replace function upsert_stay(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if not exists (select 1 from teams where id = (p->>'team_id')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
  perform pg_advisory_xact_lock(hashtext((p->>'team_id') || (p->>'night_date')));
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
  perform pg_advisory_xact_lock(hashtext(v_team::text || v_night::text));
  update stays set chosen = false where team_id = v_team and night_date = v_night and chosen;
  update stays set chosen = true where id = p_id;
end $$;

create or replace function delete_stay(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code); v_team uuid; v_night date; v_was_chosen boolean;
begin
  select team_id, night_date, chosen into v_team, v_night, v_was_chosen from stays where id = p_id and trip_id = v;
  if v_team is null then return; end if;
  perform pg_advisory_xact_lock(hashtext(v_team::text || v_night::text));
  delete from stays where id = p_id and trip_id = v;
  if v_was_chosen then
    update stays set chosen = true
    where id = (select id from stays where team_id = v_team and night_date = v_night limit 1);
  end if;
end $$;

create or replace function delete_activity(p_code text, p_id uuid, p_person uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if exists (select 1 from events where activity_id = p_id and trip_id = v) then raise exception 'activity_in_use'; end if;
  delete from activities where id = p_id and trip_id = v and is_custom and created_by = p_person;
  if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function upsert_activity(p_code text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if (p->>'created_by') is not null
     and not exists (select 1 from people where id = (p->>'created_by')::uuid and trip_id = v) then
    raise exception 'forbidden';
  end if;
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

-- Rappel : Supabase donne EXECUTE à anon sur toute nouvelle fonction ; chaque migration doit refaire ce revoke/grant.
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
