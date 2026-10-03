import { useState } from 'react';
import type { Link } from '../domain/types';
import { isValidUrl } from '../domain/validation';

export function LinkList({ links }: { links: Link[] }) {
  // Les liens viennent de la base partagée : on n'affiche que des URL http(s).
  const safe = links.filter(l => isValidUrl(l.url));
  if (!safe.length) return null;
  return (
    <ul className="link-list">
      {safe.map((l, i) => (
        <li key={i}><a href={l.url} target="_blank" rel="noreferrer noopener">🔗 {l.label}</a></li>
      ))}
    </ul>
  );
}

export function LinksEditor({ links, onChange }: { links: Link[]; onChange: (links: Link[]) => void }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const add = () => {
    const u = url.trim();
    if (!isValidUrl(u)) {
      setError('Lien invalide (doit commencer par http:// ou https://)');
      return;
    }
    onChange([...links, { url: u, label: label.trim() || new URL(u).hostname }]);
    setUrl('');
    setLabel('');
    setError('');
  };
  return (
    <div className="links-editor">
      <ul>
        {links.map((l, i) => (
          <li key={i}>
            {isValidUrl(l.url) ? <a href={l.url} target="_blank" rel="noreferrer noopener">🔗 {l.label}</a> : <span>{l.label}</span>}
            <button type="button" className="icon-btn" aria-label={`Retirer ${l.label}`} onClick={() => onChange(links.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input aria-label="URL du lien" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
        <input aria-label="Libellé du lien" placeholder="Libellé (optionnel)" value={label} onChange={e => setLabel(e.target.value)} />
        <button type="button" onClick={add}>Ajouter</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
