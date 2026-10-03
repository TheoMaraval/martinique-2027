import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Heart, Map as MapIcon, Palmtree, Ship, UtensilsCrossed, type LucideIcon } from 'lucide-react';

interface Slide { Icon: LucideIcon; title: string; text: string }

export const SLIDES: Slide[] = [
  {
    Icon: Palmtree,
    title: 'Théo le J vous souhaite le bonjour !',
    text: "Bienvenue dans l'appli du voyage en Martinique, du 15 au 25 avril 2027. En 1 minute, voici comment ça marche.",
  },
  {
    Icon: Heart,
    title: 'Choisis tes envies',
    text: "Dans l'onglet Envies, coche les activités qui te tentent et leur durée, puis indique ton budget (logements + bateau + grosses activités, hors restos). Le badge ×N montre ce qui a le plus de succès.",
  },
  {
    Icon: CalendarDays,
    title: 'Construis le planning',
    text: 'Dans Planning, les activités les plus suggérées attendent dans « À placer ». Glisse-les dans un créneau, ou touche-les pour choisir le jour. Tout le monde voit les changements en direct.',
  },
  {
    Icon: Ship,
    title: 'Équipes et logements',
    text: 'Pas tous ensemble ? Crée une équipe (ex. bateau 4 jours) pendant que les autres font autre chose. Pour chaque nuit, propose plusieurs logements avec leurs liens et retiens-en un.',
  },
  {
    Icon: MapIcon,
    title: 'Le road-book',
    text: "Le Road-book résume le voyage jour par jour, avec la carte de l'itinéraire et les dépenses estimées de chacun.",
  },
  {
    Icon: UtensilsCrossed,
    title: 'Vive le mafé sauce graine !',
    text: 'Bon voyage à tous !',
  },
];

const SWIPE_PX = 50;

/** Carrousel d'accueil plein écran. `onClose` est appelé à la fin comme lorsqu'on passe. */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const startX = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { dialogRef.current?.focus(); }, []);
  const last = SLIDES.length - 1;

  const go = (i: number) => {
    const target = Math.max(0, Math.min(last, i));
    setDir(target >= step ? 'next' : 'prev');
    setStep(target);
  };
  const goRef = useRef(go);
  goRef.current = go;
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goRef.current(stepRef.current + 1);
      else if (e.key === 'ArrowLeft') goRef.current(stepRef.current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onPointerDown = (e: ReactPointerEvent) => { startX.current = e.clientX; };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx <= -SWIPE_PX) go(step + 1);
    else if (dx >= SWIPE_PX) go(step - 1);
  };

  const { Icon, title, text } = SLIDES[step];
  return (
    <div ref={dialogRef} tabIndex={-1} className="onboarding" role="dialog" aria-modal="true" aria-label="Tutoriel">
      <div className="onboarding-panel" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { startX.current = null; }}>
        <div className="onboarding-hero">
          <button type="button" className="onboarding-skip" onClick={onClose}>Passer</button>
          <span key={`icon-${step}`} className={`onboarding-icon slide-${dir}`}><Icon size={56} strokeWidth={1.75} /></span>
        </div>
        <div className="onboarding-card">
          <div key={`text-${step}`} className={`onboarding-slide slide-${dir}`} aria-live="polite">
            <p className="onboarding-step">Étape {step + 1} sur {SLIDES.length}</p>
            <h2>{title}</h2>
            <p className="onboarding-text">{text}</p>
          </div>
          <div className="onboarding-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i} type="button" className={`dot ${i === step ? 'active' : ''}`}
                aria-label={`Aller à l'étape ${i + 1}`} aria-current={i === step ? 'step' : undefined}
                onClick={() => go(i)}
              ><span /></button>
            ))}
          </div>
          <div className="onboarding-actions">
            {step > 0 ? (
              <button type="button" className="ghost" onClick={() => go(step - 1)}><ChevronLeft size={18} /> Retour</button>
            ) : <span />}
            {step < last ? (
              <button type="button" className="primary" onClick={() => go(step + 1)}>Suivant <ChevronRight size={18} /></button>
            ) : (
              <button type="button" className="primary" onClick={onClose}>C'est parti</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
