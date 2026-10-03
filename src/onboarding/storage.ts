const key = (code: string) => `martinique:tuto-vu:${code}`;

/** Le tutoriel a-t-il déjà été vu sur cet appareil pour ce voyage ? (false si le stockage est indisponible) */
export function hasSeenTuto(code: string): boolean {
  try {
    return localStorage.getItem(key(code)) != null;
  } catch {
    return false;
  }
}

export function markTutoSeen(code: string): void {
  try {
    localStorage.setItem(key(code), new Date().toISOString());
  } catch {
    // localStorage indisponible : le tutoriel ne sera montré qu'une fois par session (état React).
  }
}
