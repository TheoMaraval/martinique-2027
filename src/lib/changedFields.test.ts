import { changedFields } from './changedFields';

describe('changedFields', () => {
  it('ne garde que les champs modifiés (tableaux comparés par contenu)', () => {
    const prev = { a: 1, b: 'x', links: [{ url: 'https://a.mq' }] };
    expect(changedFields({ ...prev, links: [{ url: 'https://a.mq' }] }, prev)).toEqual({});
    expect(changedFields({ ...prev, b: 'y', links: [] }, prev)).toEqual({ b: 'y', links: [] });
  });
});
