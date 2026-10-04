do $$
declare
  v_trip uuid;
  v_code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
begin
  insert into trips (code, name, start_date, end_date)
  values (v_code, 'Martinique 2027', '2027-04-15', '2027-04-25')
  returning id into v_trip;

  insert into people (trip_id, name, sort)
  select v_trip, n, ord::int from unnest(array[
    'Alexandre Martin', 'Baptiste Deschamps', 'Basile Boussemart', 'Inès De Passemar', 'Jarod Abelanet',
    'Jules Berson', 'Louise Paurise', 'Nicolas Leblanc', 'Theo Maraval', 'Victoire Gonin'
  ]) with ordinality as t(n, ord);

  insert into activities (trip_id, name, category, durations, has_quantity, is_custom) values
    (v_trip, 'Bateau multi-jours', 'Bateau', array['multi:4:3', 'multi:3:3', 'multi:3:2'], false, false),
    (v_trip, 'Escapade bateau', 'Bateau', array['flex'], false, false),
    (v_trip, 'Pêche', 'Mer', array['flex'], false, false),
    (v_trip, 'Surf', 'Mer', array['flex'], false, false),
    (v_trip, 'Plage', 'Détente', array['flex'], false, false),
    (v_trip, 'Pique-nique', 'Détente', array['flex'], false, false),
    (v_trip, 'Coucher de soleil', 'Détente', array['flex'], false, false),
    (v_trip, 'Randonnée', 'Nature', array['flex'], true, false),
    (v_trip, 'Cours de danse locale', 'Local', array['flex'], false, false),
    (v_trip, 'Cours de cuisine locale', 'Local', array['flex'], false, false),
    (v_trip, 'Soirée locale', 'Local', array['flex'], false, false),
    (v_trip, 'Goûter un mafé', 'Local', array['flex'], false, false);

  insert into teams (trip_id, name, color, start_date, start_part, end_date, end_part, is_default)
  values (v_trip, 'Tout le groupe', '#0e9aa7', '2027-04-15', 'matin', '2027-04-25', 'soir', true);

  raise notice 'Code du voyage : %', v_code;
end $$;

select code from trips where name = 'Martinique 2027';
