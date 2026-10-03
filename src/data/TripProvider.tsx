import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { InvalidCodeError, errorMessage, makeApi } from './api';
import { sameId, upsertBy } from './local';
import { TripContext, type Status, type Toast, type TripActions } from './TripContext';
import { loadIdentity, saveIdentity } from '../identity/identity';
import { newId } from '../lib/ids';
import type { TripState } from '../domain/types';

export function TripProvider({ code, children }: { code: string; children: ReactNode }) {
  const api = useMemo(() => makeApi(code), [code]);
  const [status, setStatus] = useState<Status>('loading');
  const [state, setState] = useState<TripState | null>(null);
  const [online, setOnline] = useState(true);
  const [me, setMeState] = useState<string | null>(() => loadIdentity(code));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wasOffline = useRef(false);
  const meRef = useRef(me);
  meRef.current = me;

  const pushToast = useCallback((text: string) => {
    const id = newId();
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const reload = useCallback(async () => {
    try {
      setState(await api.getTrip());
      setStatus('ready');
    } catch (e) {
      if (e instanceof InvalidCodeError) setStatus('invalid');
      else {
        setStatus(s => (s === 'ready' ? 'ready' : 'error'));
        pushToast('Impossible de charger le voyage.');
      }
    }
  }, [api, pushToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ch = supabase.channel(`trip-${code}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'changed' }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => void reload(), 300);
    }).subscribe(s => {
      if (s === 'SUBSCRIBED') {
        setOnline(true);
        if (wasOffline.current) void reload();
        wasOffline.current = false;
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        setOnline(false);
        wasOffline.current = true;
      }
    });
    channelRef.current = ch;
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(ch);
    };
  }, [code, reload]);

  const mutate = useCallback(
    async (local: (s: TripState) => TripState, remote: () => Promise<unknown>) => {
      setState(s => (s ? local(s) : s));
      try {
        await remote();
        void channelRef.current?.send({ type: 'broadcast', event: 'changed', payload: {} });
      } catch (e) {
        pushToast(errorMessage(e));
        await reload();
      }
    },
    [pushToast, reload],
  );

  const actions = useMemo<TripActions>(() => ({
    setBudget: (personId, budget) => mutate(
      s => ({ ...s, people: s.people.map(p => (p.id === personId ? { ...p, budget_max: budget } : p)) }),
      () => api.setBudget(personId, budget),
    ),
    saveWish: w => mutate(
      s => ({ ...s, wishes: upsertBy(s.wishes, w, (a, b) => a.person_id === b.person_id && a.activity_id === b.activity_id && a.duration === b.duration) }),
      () => api.upsertWish(w),
    ),
    deleteWish: id => mutate(s => ({ ...s, wishes: s.wishes.filter(w => w.id !== id) }), () => api.deleteWish(id)),
    saveActivity: (a, creatorWish) => mutate(
      s => ({ ...s, activities: upsertBy(s.activities, a, sameId), wishes: creatorWish ? [...s.wishes, creatorWish] : s.wishes }),
      async () => {
        await api.upsertActivity(a);
        if (creatorWish) await api.upsertWish(creatorWish);
      },
    ),
    deleteActivity: id => mutate(
      s => ({ ...s, activities: s.activities.filter(a => a.id !== id), wishes: s.wishes.filter(w => w.activity_id !== id) }),
      () => api.deleteActivity(id, meRef.current ?? ''),
    ),
    saveTeam: (t, memberIds) => mutate(
      s => ({
        ...s,
        teams: upsertBy(s.teams, t, sameId),
        team_members: [
          ...s.team_members.filter(m => m.team_id !== t.id),
          ...memberIds.map(person_id => ({ trip_id: t.trip_id, team_id: t.id, person_id })),
        ],
      }),
      async () => {
        await api.upsertTeam(t);
        await api.setTeamMembers(t.id, memberIds);
      },
    ),
    deleteTeam: id => mutate(s => {
      const ev = new Set(s.events.filter(e => e.team_id === id).map(e => e.id));
      return {
        ...s,
        teams: s.teams.filter(t => t.id !== id),
        team_members: s.team_members.filter(m => m.team_id !== id),
        events: s.events.filter(e => !ev.has(e.id)),
        event_participants: s.event_participants.filter(p => !ev.has(p.event_id)),
        event_comments: s.event_comments.filter(c => !ev.has(c.event_id)),
        stays: s.stays.filter(st => st.team_id !== id),
      };
    }, () => api.deleteTeam(id)),
    saveEvent: (e, participantIds) => mutate(
      s => ({
        ...s,
        events: upsertBy(s.events, e, sameId),
        event_participants: participantIds
          ? [...s.event_participants.filter(p => p.event_id !== e.id), ...participantIds.map(person_id => ({ trip_id: e.trip_id, event_id: e.id, person_id }))]
          : s.event_participants,
      }),
      async () => {
        await api.upsertEvent(e);
        if (participantIds) await api.setEventParticipants(e.id, participantIds);
      },
    ),
    deleteEvent: id => mutate(
      s => ({
        ...s,
        events: s.events.filter(e => e.id !== id),
        event_participants: s.event_participants.filter(p => p.event_id !== id),
        event_comments: s.event_comments.filter(c => c.event_id !== id),
      }),
      () => api.deleteEvent(id),
    ),
    addComment: c => mutate(s => ({ ...s, event_comments: [...s.event_comments, c] }), () => api.addComment(c)),
    deleteComment: id => mutate(
      s => ({ ...s, event_comments: s.event_comments.filter(c => c.id !== id) }),
      () => api.deleteComment(id, meRef.current ?? ''),
    ),
    saveStay: st => mutate(s => {
      const isNew = !s.stays.some(x => x.id === st.id);
      const first = !s.stays.some(x => x.team_id === st.team_id && x.night_date === st.night_date);
      return { ...s, stays: upsertBy(s.stays, isNew ? { ...st, chosen: first } : st, sameId) };
    }, () => api.upsertStay(st)),
    chooseStay: id => mutate(s => {
      const target = s.stays.find(x => x.id === id);
      if (!target) return s;
      return {
        ...s,
        stays: s.stays.map(x => (x.team_id === target.team_id && x.night_date === target.night_date ? { ...x, chosen: x.id === id } : x)),
      };
    }, () => api.chooseStay(id)),
    deleteStay: id => mutate(s => ({ ...s, stays: s.stays.filter(st => st.id !== id) }), () => api.deleteStay(id)),
  }), [api, mutate]);

  const setMe = useCallback((id: string | null) => {
    saveIdentity(code, id);
    setMeState(id);
  }, [code]);

  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  return (
    <TripContext.Provider value={{ status, state, online, me, setMe, toasts, dismissToast, actions }}>
      {children}
    </TripContext.Provider>
  );
}
