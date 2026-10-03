const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const euroFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatDayShort = (iso: string) => shortFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatEuros = (n: number) => euroFmt.format(n);
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const firstName = (name: string) => name.split(' ')[0];
