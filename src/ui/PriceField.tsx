import { useEffect, useState } from 'react';
import type { PriceMode } from '../domain/types';
import { parsePrice } from '../domain/validation';
import { formatEuros } from '../lib/format';

interface Props {
  price: number | null;
  mode: PriceMode;
  onChange: (price: number | null, mode: PriceMode) => void;
  onValidity?: (ok: boolean) => void;
  participants?: number;
}

export function PriceField({ price, mode, onChange, onValidity, participants }: Props) {
  const [text, setText] = useState(price == null ? '' : String(price));
  const parsed = parsePrice(text);
  useEffect(() => { onValidity?.(parsed !== 'invalid'); }, [parsed, onValidity]);
  return (
    <div className="price-field">
      <div className="row">
        <input
          aria-label="Montant (€)" inputMode="decimal" placeholder="Montant €" value={text}
          onChange={e => {
            setText(e.target.value);
            const p = parsePrice(e.target.value);
            if (p !== 'invalid') onChange(p, mode);
          }}
        />
        <select aria-label="Mode de prix" value={mode} onChange={e => onChange(parsed === 'invalid' ? price : parsed, e.target.value as PriceMode)}>
          <option value="total">au total</option>
          <option value="per_person">par personne</option>
        </select>
      </div>
      {parsed === 'invalid' && <p className="error" role="alert">Montant invalide</p>}
      {typeof parsed === 'number' && mode === 'total' && participants ? (
        <p className="muted">≈ {formatEuros(parsed / participants)} / pers. ({participants} pers.)</p>
      ) : null}
    </div>
  );
}
