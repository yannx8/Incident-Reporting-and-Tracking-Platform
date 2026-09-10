import { useI18n } from '../i18n';

// Plain (non-hook) version for use anywhere
export function timeAgo(dateStr: string, locale = 'fr'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'fr' ? "a l'instant" : 'just now';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}${locale === 'fr' ? 'j' : 'd'}`;
}

export function useFormatDate() {
  const locale = useI18n((s) => s.locale);
  return (v: string) => new Date(v).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US');
}

export function useFormatDateTime() {
  const locale = useI18n((s) => s.locale);
  return (v: string) => new Date(v).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');
}

export function useTimeAgo() {
  const locale = useI18n((s) => s.locale);
  return (dateStr: string): string => timeAgo(dateStr, locale);
}

export function escapeHtml(v: string) {
  return v.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));
}
