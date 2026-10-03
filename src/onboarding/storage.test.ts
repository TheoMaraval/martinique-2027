import { hasSeenTuto, markTutoSeen } from './storage';

describe('mémoire du tutoriel', () => {
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('mémorise le tuto vu par voyage', () => {
    expect(hasSeenTuto('abc')).toBe(false);
    markTutoSeen('abc');
    expect(hasSeenTuto('abc')).toBe(true);
    expect(localStorage.getItem('martinique:tuto-vu:abc')).not.toBeNull();
    expect(hasSeenTuto('autre')).toBe(false);
  });

  it('survit à un localStorage indisponible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqué'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqué'); });
    expect(() => markTutoSeen('abc')).not.toThrow();
    expect(hasSeenTuto('abc')).toBe(false);
  });
});
