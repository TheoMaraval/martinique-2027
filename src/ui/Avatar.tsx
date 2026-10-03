// Pastille d'initiales colorée. Purement décorative : le prénom est toujours affiché à côté (aria-hidden).
const AVATAR_COLORS = ['#0B7285', '#D9472B', '#6D28D9', '#15803D', '#B45309', '#BE185D', '#1D4ED8', '#0A4F5C'];

export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

export function Avatar({ name, size = 'md', className = '' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span className={`avatar avatar-${size} ${className}`} style={{ background: avatarColor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
