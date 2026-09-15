import { describe, expect, it } from 'vitest';
import { SETTINGS_STORAGE_KEY, UserSettings, type SettingsStorage } from '../../systems/UserSettings';

function storage(initial: string | null = null): SettingsStorage {
  const values = new Map<string, string>();
  if (initial !== null) values.set(SETTINGS_STORAGE_KEY, initial);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

describe('user preferences', () => {
  it('defaults to English and enabled sound without a saved preference', () => {
    const settings = new UserSettings(storage());
    expect(settings.locale).toBe('en');
    expect(settings.soundEnabled).toBe(true);
  });

  it('restores language and sound in a new session after separate changes', () => {
    const saved = storage();
    const settings = new UserSettings(saved);
    settings.update({ locale: 'ko' });
    settings.update({ soundEnabled: false });
    const restarted = new UserSettings(saved);
    expect(restarted.locale).toBe('ko');
    expect(restarted.soundEnabled).toBe(false);
    restarted.update({ locale: 'en' });
    expect(new UserSettings(saved).soundEnabled).toBe(false);
  });

  it.each(['invalid json', 'null', '[]', '{"locale":"fr","soundEnabled":"false"}'])('uses defaults for invalid saved values: %s', (value) => {
    const settings = new UserSettings(storage(value));
    expect(settings.locale).toBe('en');
    expect(settings.soundEnabled).toBe(true);
  });

  it('keeps settings usable when browser storage rejects access', () => {
    const blocked: SettingsStorage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('full'); } };
    const settings = new UserSettings(blocked);
    settings.update({ locale: 'ko', soundEnabled: false });
    expect(settings.locale).toBe('ko');
    expect(settings.soundEnabled).toBe(false);
  });
});
