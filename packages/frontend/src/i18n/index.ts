import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import fr from './locales/fr';
import en from './locales/en';

export type Locale = 'fr' | 'en';

// Use a flexible type to allow both FR and EN translations
type Translations = Record<string, any>;
const translations: Record<Locale, Translations> = { fr, en };

function resolve(obj: any, path: string): string {
  return path.split('.').reduce((acc: any, key: string) => acc?.[key], obj) ?? path;
}

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'fr',
      setLocale: (locale) => set({ locale }),
      t: (path: string) => {
        const { locale } = get();
        const val = resolve(translations[locale], path);
        return typeof val === 'string' ? val : path;
      }
    }),
    { name: 'nexus-i18n' }
  )
);

export function useT() {
  return useI18n((s) => s.t);
}

export function useLocale() {
  return useI18n((s) => s.locale);
}
