import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <header className="sheet-header">
          <span className="sheet-grip" aria-hidden="true" />
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
