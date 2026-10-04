import { act, renderHook } from '@testing-library/react';
import { useAutosave } from './useAutosave';

type Props = { value: { n: number }; enabled?: boolean };

function setup(initial: Props, save = vi.fn().mockResolvedValue(undefined)) {
  const hook = renderHook(
    ({ value, enabled }: Props) => useAutosave(value, save, { delay: 600, enabled }),
    { initialProps: initial },
  );
  return { ...hook, save };
}

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("n'enregistre rien tant que la valeur ne change pas", () => {
    const { result, rerender, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 1 } });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it("enregistre après 600 ms d'inactivité (debounce), avec la valeur précédemment enregistrée", async () => {
    const { result, rerender, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 2 } });
    expect(result.current.status).toBe('pending');
    act(() => { vi.advanceTimersByTime(400); });
    rerender({ value: { n: 3 } });
    act(() => { vi.advanceTimersByTime(400); });
    expect(save).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ n: 3 }, { n: 1 });
    expect(result.current.status).toBe('saved');
    rerender({ value: { n: 4 } });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(save).toHaveBeenLastCalledWith({ n: 4 }, { n: 3 });
  });

  it('affiche « en cours » pendant un enregistrement non terminé', async () => {
    let resolve!: () => void;
    const save = vi.fn(() => new Promise<void>(r => { resolve = r; }));
    const { result, rerender } = setup({ value: { n: 1 } }, save);
    rerender({ value: { n: 2 } });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.status).toBe('saving');
    await act(async () => { resolve(); });
    expect(result.current.status).toBe('saved');
  });

  it("revient à l'état initial sans enregistrer si la valeur revient à la dernière enregistrée", () => {
    const { result, rerender, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 2 } });
    rerender({ value: { n: 1 } });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it("flush enregistre immédiatement ce qui est en attente, une seule fois", async () => {
    const { result, rerender, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 2 } });
    await act(async () => { result.current.flush(); });
    expect(save).toHaveBeenCalledWith({ n: 2 }, { n: 1 });
    act(() => { vi.advanceTimersByTime(1000); });
    result.current.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('enregistre ce qui est en attente au démontage (fermeture de la fiche)', () => {
    const { rerender, unmount, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 5 } });
    unmount();
    expect(save).toHaveBeenCalledWith({ n: 5 }, { n: 1 });
  });

  it("n'enregistre pas quand c'est désactivé (ex. prix invalide), ni au démontage", () => {
    const { result, rerender, unmount, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 2 }, enabled: false });
    act(() => { vi.advanceTimersByTime(1000); });
    result.current.flush();
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    unmount();
    expect(save).not.toHaveBeenCalled();
  });

  it('reprend dès que ça redevient valide', async () => {
    const { rerender, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 2 }, enabled: false });
    rerender({ value: { n: 2 }, enabled: true });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(save).toHaveBeenCalledWith({ n: 2 }, { n: 1 });
  });

  it('cancel abandonne ce qui est en attente (ex. avant une suppression)', () => {
    const { result, rerender, unmount, save } = setup({ value: { n: 1 } });
    rerender({ value: { n: 2 } });
    act(() => result.current.cancel());
    act(() => { vi.advanceTimersByTime(1000); });
    unmount();
    expect(save).not.toHaveBeenCalled();
  });

  it('utilise la dernière version de la fonction save', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ value, save }: { value: number; save: (v: number) => void }) => useAutosave(value, save),
      { initialProps: { value: 1, save: first } },
    );
    rerender({ value: 2, save: second });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(2, 1);
  });
});
