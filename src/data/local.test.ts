import { sameId, upsertBy } from './local';

describe('upsertBy', () => {
  it('ajoute ou remplace', () => {
    const list = [{ id: 'a', v: 1 }];
    expect(upsertBy(list, { id: 'b', v: 2 }, sameId)).toEqual([{ id: 'a', v: 1 }, { id: 'b', v: 2 }]);
    expect(upsertBy(list, { id: 'a', v: 3 }, sameId)).toEqual([{ id: 'a', v: 3 }]);
  });
});
