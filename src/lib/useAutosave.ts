import { useCallback, useEffect, useRef, useState } from 'react';

/** idle : rien à enregistrer · pending : modification en attente (debounce) · saving : envoi en cours · saved : à jour. */
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved';

export interface AutosaveOptions<T> {
  /** Délai d'inactivité avant l'enregistrement (ms). */
  delay?: number;
  /** false : rien n'est enregistré (ex. prix invalide, option encore vide). */
  enabled?: boolean;
  isEqual?: (a: T, b: T) => boolean;
}

const jsonEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Enregistre automatiquement `value` après `delay` ms sans modification, et immédiatement au démontage
 * (fermeture de la fiche) ou via `flush`. `save(next, previous)` reçoit aussi la dernière valeur
 * enregistrée (au départ : la valeur initiale), pour n'envoyer que ce qui a changé.
 * `cancel` abandonne la modification en attente (ex. juste avant une suppression).
 */
export function useAutosave<T>(
  value: T,
  save: (next: T, previous: T) => unknown,
  { delay = 600, enabled = true, isEqual = jsonEqual }: AutosaveOptions<T> = {},
): { status: AutosaveStatus; flush: () => void; cancel: () => void } {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const valueRef = useRef(value);
  const lastSaved = useRef(value);
  const rendered = useRef<{ value: T; enabled: boolean }>({ value, enabled });
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);
  const isEqualRef = useRef(isEqual);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(0);
  const savedOnce = useRef(false);
  const mounted = useRef(false);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const settle = (s: AutosaveStatus) => { if (mounted.current) setStatus(s); };
  const restingStatus = (): AutosaveStatus => (savedOnce.current ? 'saved' : 'idle');

  const flush = useCallback(() => {
    clearTimer();
    const next = valueRef.current;
    const previous = lastSaved.current;
    if (!enabledRef.current || isEqualRef.current(next, previous)) return;
    lastSaved.current = next;
    inFlight.current++;
    settle('saving');
    const done = () => {
      inFlight.current--;
      savedOnce.current = true;
      if (inFlight.current === 0 && !timer.current) settle('saved');
    };
    try {
      Promise.resolve(saveRef.current(next, previous)).then(done, done);
    } catch {
      done();
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    lastSaved.current = valueRef.current;
    if (inFlight.current === 0) settle(restingStatus());
  }, []);

  // Synchronise les refs, puis (re)programme l'enregistrement si la valeur ou la validité a changé.
  useEffect(() => {
    valueRef.current = value;
    saveRef.current = save;
    enabledRef.current = enabled;
    isEqualRef.current = isEqual;
    const prev = rendered.current;
    rendered.current = { value, enabled };
    if (prev.enabled === enabled && isEqual(prev.value, value)) return;
    clearTimer();
    if (!enabled) {
      if (inFlight.current === 0) setStatus('idle');
      return;
    }
    if (isEqual(value, lastSaved.current)) {
      if (inFlight.current === 0) setStatus(restingStatus());
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
