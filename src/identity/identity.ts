const key = (code: string) => `martinique:me:${code}`;

export function loadIdentity(code: string): string | null {
  try {
    return localStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function saveIdentity(code: string, personId: string | null): void {
  try {
    if (personId) localStorage.setItem(key(code), personId);
    else localStorage.removeItem(key(code));
  } catch {
    // localStorage indisponible : l'identité sera redemandée à la prochaine ouverture.
  }
}
