-- Les liens (activités, activités planifiées, logements) doivent être des URL http(s).
create or replace function links_ok(p jsonb) returns boolean
language sql immutable set search_path = public as $$
  select jsonb_typeof(p) = 'array'
     and not exists (select 1 from jsonb_array_elements(p) l where coalesce(l->>'url', '') !~* '^https?://');
$$;

alter table activities add constraint activities_links_ok check (links_ok(links));
alter table events add constraint events_links_ok check (links_ok(links));
alter table stays add constraint stays_links_ok check (links_ok(links));

-- Rappel : Supabase donne EXECUTE à anon sur toute nouvelle fonction ; on retire ce droit.
revoke execute on function links_ok(jsonb) from public, anon, authenticated;
