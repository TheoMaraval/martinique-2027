import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * idle : rien à enregistrer · pending : modification en attente (debounce) · saving : envoi en cours ·
 * saved : à jour · retrying : échec, nouvel essai programmé · error : échec définitif (jusqu'à la prochaine modification).
 */
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'retrying' | 'error';

/** false (ou une exception) signale un échec : la modification sera renvoyée. */
export type AutosaveResult = boolean | void | undefined;

export interface AutosaveOptions<T> {
  /** Délai d'inactivité avant l'enregistrement (ms). */
  delay?: number;
  /** false : rien n'est enregistré (ex. option encore vide, élément supprimé). */
  enabled?: boolean;
  isEqual?: (a: T, b: T) => boolean;
  /** Délai avant un nouvel essai après un échec (ms). */
  retryDelay?: number;
  /** Nombre de nouveaux essais après un échec. */
  maxRetries?: number;
}

const jsonEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Enregistre automatiquement `value` après `delay` ms sans modification, et immédiatement au démontage
 * (fermeture de la fiche) ou via `flush`. `save(next, previous)` reçoit aussi la dernière valeur
 * enregistrée (au départ : la valeur initiale), pour n'envoyer que ce qui a changé.
 * Un seul enregistrement à la fois : ce qui arrive pendant un envoi part dès qu'il est terminé.
 * Échec : la valeur précédente est restaurée et l'envoi retenté (`maxRetries` fois, toutes les `retryDelay` ms).
 * `cancel` abandonne la modification en attente (ex. juste avant une suppression).
 */
export function useAutosave<T>(
  value: T,
  save: (next: T, previous: T) => AutosaveResult | Promise<AutosaveResult>,
  { delay = 600, enabled = true, isEqual = jsonEqual, retryDelay = 3000, maxRetries = 3 }: AutosaveOptions<T> = {},
): { status: AutosaveStatus; flush: () => void; cancel: () => void } {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const valueRef = useRef(value);
  const lastSaved = useRef(value);
  const rendered = useRef<{ value: T; enabled: boolean }>({ value, enabled });
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);
  const isEqualRef = useRef(isEqual);
  const retryRef = useRef({ delay: retryDelay, max: maxRetries });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  /** Un enregistrement a été demandé pendant un envoi : il part à la fin de celui-ci. */
  const queued = useRef(false);
  const failures = useRef(0);
  /** Incrémenté par `cancel` : un envoi en cours ne doit plus rien restaurer ni retenter. */
  const generation = useRef(0);
  const savedOnce = useRef(false);
  const mounted = useRef(false);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const settle = (s: AutosaveStatus) => { if (mounted.current) setStatus(s); };
  const restingStatus = (): AutosaveStatus => (savedOnce.current ? 'saved' : 'idle');
  const dirty = () => enabledRef.current && !isEqualRef.current(valueRef.current, lastSaved.current);

  const flush = useCallback(() => {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    clearTimer();
    if (!dirty()) return;
    const next = valueRef.current;
    const previous = lastSaved.current;
    const gen = generation.current;
    lastSaved.current = next;
    inFlight.current = true;
    settle('saving');
    const done = (ok: boolean) => {
      inFlight.current = false;
      // Échec : on revient à la valeur précédente, sauf si `cancel` est passé entre-temps.
      const restored = !ok && gen === generation.current && lastSaved.current === next;
      if (restored) lastSaved.current = previous;
      if (ok) {
        savedOnce.current = true;
        failures.current = 0;
      }
      if (queued.current) {
        queued.current = false;
        if (dirty()) return flush();
      }
      if (restored) {
        failures.current++;
        if (!mounted.current) return;
        if (failures.current > retryRef.current.max) return settle('error');
        settle('retrying');
        timer.current = setTimeout(flush, retryRef.current.delay);
        return;
      }
      if (!timer.current) settle(restingStatus());
    };
    try {
      Promise.resolve(saveRef.current(next, previous)).then(r => done(r !== false), () => done(false));
    } catch {
      done(false);
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    generation.current++;
    queued.current = false;
    failures.current = 0;
    lastSaved.current = valueRef.current;
    if (!inFlight.current) settle(restingStatus());
  }, []);

  // Synchronise les refs, puis (re)programme l'enregistrement si la valeur ou la validité a changé.
  useEffect(() => {
    valueRef.current = value;
    saveRef.current = save;
    enabledRef.current = enabled;
    isEqualRef.current = isEqual;
    retryRef.current = { delay: retryDelay, max: maxRetries };
    const prev = rendered.current;
    rendered.current = { value, enabled };
    if (prev.enabled === enabled && isEqual(prev.value, value)) return;
    clearTimer();
    failures.current = 0;
    if (!enabled) {
      if (!inFlight.current) setStatus('idle');
      return;
    }
    if (isEqual(value, lastSaved.current)) {
      if (!inFlight.current) setStatus(restingStatus());
      return;
    }
    setStatus('pending');
    timer.current = setTimeout(flush, delay);
  });

  // Fermeture de la fiche : on enregistre ce qui reste en attente (les actions continuent sans la fiche).
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      flush();
    };
  }, [flush]);

  return { status, flush, cancel };
}
