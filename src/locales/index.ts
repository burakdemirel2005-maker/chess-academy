import { tr, Translations } from './tr';
import { en } from './en';

export type SupportedLocale = 'tr' | 'en';

export const locales: Record<SupportedLocale, Translations> = {
  tr,
  en,
};

export function getTranslations(locale: SupportedLocale = 'tr'): Translations {
  return locales[locale] || tr;
}
