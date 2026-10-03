import { parseTripCode } from './App';

describe('parseTripCode', () => {
  it('extrait le code du hash', () => {
    expect(parseTripCode('#/t/abc123')).toBe('abc123');
    expect(parseTripCode('#/t/abc123/planning')).toBe('abc123');
    expect(parseTripCode('')).toBeNull();
    expect(parseTripCode('#/x')).toBeNull();
  });
});
