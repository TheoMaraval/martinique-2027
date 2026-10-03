import { errorMessage } from './api';

describe('errorMessage', () => {
  it('traduit les erreurs connues', () => {
    expect(errorMessage(new Error('activity_in_use'))).toMatch(/déjà dans le planning/);
    expect(errorMessage(new Error('forbidden'))).toBe('Action non autorisée.');
    expect(errorMessage(new Error('boom'))).toBe("La modification n'a pas pu être enregistrée.");
  });
});
