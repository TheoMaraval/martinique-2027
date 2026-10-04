-- Détails d'une activité placée (fiche activité, enregistrement automatique) : lieu, prix, liens, notes.
-- Seules les clés présentes dans p sont modifiées ; la place dans le planning (équipe, créneaux) n'est
-- jamais touchée, contrairement à upsert_event (placer, déplacer, étirer).
create or replace function update_event_details(p_code text, p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := trip_id_for(p_code);
begin
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'invalid_input';
  end if;
  update events set
    place_name = case when p ? 'place_name' then coalesce(p->>'place_name', '') else place_name end,
    lat        = case when p ? 'lat' then (p->>'lat')::float8 else lat end,
    lng        = case when p ? 'lng' then (p->>'lng')::float8 else lng end,
    price      = case when p ? 'price' then (p->>'price')::numeric else price end,
    price_mode = case when p ? 'price_mode' then coalesce(p->>'price_mode', 'total') else price_mode end,
    links      = case when p ? 'links' then coalesce(nullif(p->'links', 'null'::jsonb), '[]'::jsonb) else links end,
    notes      = case when p ? 'notes' then coalesce(p->>'notes', '') else notes end
  where id = p_id and trip_id = v;
  if not found then
    raise exception 'forbidden';
  end if;
end $$;

-- Rappel : Supabase donne EXECUTE à anon sur toute nouvelle fonction ; chaque migration doit refaire ce revoke/grant.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  get_trip(text), set_budget(text, uuid, numeric),
  upsert_wish(text, jsonb), delete_wish(text, uuid),
  upsert_activity(text, jsonb), delete_activity(text, uuid, uuid),
  upsert_team(text, jsonb), delete_team(text, uuid), set_team_members(text, uuid, uuid[]),
  upsert_event(text, jsonb), delete_event(text, uuid), set_event_participants(text, uuid, uuid[]),
  update_event_details(text, uuid, jsonb),
  add_comment(text, jsonb), delete_comment(text, uuid, uuid),
  upsert_stay(text, jsonb), choose_stay(text, uuid), delete_stay(text, uuid),
  upsert_meal(text, jsonb), delete_meal(text, uuid)
to anon, authenticated;
