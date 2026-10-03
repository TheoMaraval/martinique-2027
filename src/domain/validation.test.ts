import { isValidUrl, parseLatLng, parsePrice } from './validation';

describe('validation', () => {
  it('URL http/https uniquement', () => {
    expect(isValidUrl('https://exemple.com/bateau')).toBe(true);
    expect(isValidUrl('http://a.fr')).toBe(true);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('pas une url')).toBe(false);
  });

  it('coordonnées GPS', () => {
    expect(parseLatLng('14.6161, -61.0588')).toEqual({ lat: 14.6161, lng: -61.0588 });
    expect(parseLatLng(' 14.6 -61 ')).toEqual({ lat: 14.6, lng: -61 });
    expect(parseLatLng('95, 10')).toBeNull();
    expect(parseLatLng('abc')).toBeNull();
  });

  it('prix', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('45,5')).toBe(45.5);
    expect(parsePrice('1200')).toBe(1200);
    expect(parsePrice('-3')).toBe('invalid');
    expect(parsePrice('abc')).toBe('invalid');
  });
});
