import { loadIdentity, saveIdentity } from './identity';

describe('identity', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mémorise et oublie la personne par voyage', () => {
    saveIdentity('abc', 'p1');
    expect(loadIdentity('abc')).toBe('p1');
    expect(loadIdentity('autre')).toBeNull();
    saveIdentity('abc', null);
    expect(loadIdentity('abc')).toBeNull();
  });

  it('survit à un localStorage indisponible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqué'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqué'); });
    expect(() => saveIdentity('abc', 'p1')).not.toThrow();
    expect(loadIdentity('abc')).toBeNull();
  });
});
