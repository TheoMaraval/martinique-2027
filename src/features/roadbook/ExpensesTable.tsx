import { useReadyTrip } from '../../data/TripContext';
import { expensesByPerson } from '../../domain/expenses';
import { firstName, formatEuros } from '../../lib/format';

export function ExpensesTable({ highlight }: { highlight: string }) {
  const { state } = useReadyTrip();
  const rows = expensesByPerson(state);
  const sum = (k: 'lodging' | 'boat' | 'activities' | 'total') => rows.reduce((acc, r) => acc + r[k], 0);
  return (
    <section className="card">
      <h2>Dépenses estimées</h2>
      <p className="muted">Logements + bateau + grosses activités. Hors restaurants et sorties gratuites (randonnées, plages…).</p>
      <div className="table-scroll">
        <table className="expenses">
          <thead>
            <tr><th>Personne</th><th>Logements</th><th>Bateau</th><th>Activités</th><th>Total</th><th>Budget</th><th>Écart</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.personId} className={r.personId === highlight ? 'me' : ''}>
                <td>{firstName(state.people.find(p => p.id === r.personId)?.name ?? '?')}</td>
                <td>{formatEuros(r.lodging)}</td>
                <td>{formatEuros(r.boat)}</td>
                <td>{formatEuros(r.activities)}</td>
                <td><strong>{formatEuros(r.total)}</strong></td>
                <td>{r.budget == null ? '—' : formatEuros(r.budget)}</td>
                <td className={r.delta == null ? '' : r.delta >= 0 ? 'ok' : 'over'}>
                  {r.delta == null ? '—' : `${r.delta >= 0 ? '+' : ''}${formatEuros(r.delta)}`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total groupe</th>
              <td>{formatEuros(sum('lodging'))}</td>
              <td>{formatEuros(sum('boat'))}</td>
              <td>{formatEuros(sum('activities'))}</td>
              <td><strong>{formatEuros(sum('total'))}</strong></td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
