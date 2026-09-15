import { translate, type Locale } from '../i18n/catalog';

export interface UserPreferences {
  locale: Locale;
  soundEnabled: boolean;
}

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SETTINGS_STORAGE_KEY = 'zombie-horde.settings.v1';

export class UserSettings {
  private preferences: UserPreferences = { locale: 'en', soundEnabled: true };

  constructor(private readonly storage?: SettingsStorage) {
    try {
      const saved: unknown = JSON.parse(storage?.getItem(SETTINGS_STORAGE_KEY) ?? 'null');
      if (saved && typeof saved === 'object') {
        const value = saved as Partial<UserPreferences>;
        this.preferences = {
          locale: value.locale === 'ko' ? 'ko' : 'en',
          soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : true,
        };
      }
    } catch { /* Storage can be unavailable; retain usable session defaults. */ }
  }

  get locale(): Locale { return this.preferences.locale; }
  get soundEnabled(): boolean { return this.preferences.soundEnabled; }

  update(patch: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...patch };
    try {
      this.storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.preferences));
    } catch { /* Continue applying settings for this session when storage is full or blocked. */ }
  }
}

function browserStorage(): SettingsStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

export const userSettings = new UserSettings(browserStorage());
export const t = (message: string, values: Record<string, string | number> = {}): string =>
  translate(userSettings.locale, message, values);

export function setLanguage(locale: Locale): void {
  userSettings.update({ locale });
  document.documentElement.lang = locale;
  document.title = t('ZOMBIE HORDE');
}
