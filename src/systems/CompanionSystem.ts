import { COMPANION_CONFIG as C } from '../config/companionConfig';
import { clampCourage, companionDeathChance, createCompanion } from '../logic/companion';
import type { Companion, CompanionEvent } from '../types/companion';

/** Persistent roster; rendering and daily allocation do not own companion state. */
export class CompanionSystem {
  private roster: Companion[] = [];
  private nextId = 1;
  private events: CompanionEvent[] = [];
  constructor(private readonly random: () => number = Math.random) {}
  getRoster(): Companion[] { return structuredClone(this.roster); }
  getActive(): Companion[] { return this.getRoster().filter(ally => ally.status === 'active'); }
  getEvents(): CompanionEvent[] { return structuredClone(this.events); }
  beginDay(): void { this.events = []; }

  resolveSearch(day: number, locationId: string, participantIds: readonly string[], people: number): void {
    // All participants face this site's risk using their pre-result courage.
    const deaths = this.roster.filter(ally => ally.status === 'active' && participantIds.includes(ally.id))
      .filter(ally => this.random() < companionDeathChance(ally.courage, people));
    for (const ally of deaths) {
      ally.status = 'dead';
      this.events.push({ type: 'died', companion: { ...ally }, locationId });
    }
    if (deaths.length) for (const ally of this.roster) {
      if (ally.status === 'active') ally.courage = clampCourage(ally.courage - C.deathCourageLoss * deaths.length);
    }
    if (this.getActive().length < C.maximum && this.random() < C.discoveryChance) {
      const ally = createCompanion(`companion-${this.nextId++}`, day, this.random);
      this.roster.push(ally);
      this.events.push({ type: 'joined', companion: { ...ally }, locationId });
    }
  }
  rest(id: string, hours: number): void {
    if (!Number.isFinite(hours) || hours <= 0) return;
    const ally = this.roster.find(ally => ally.id === id && ally.status === 'active');
    if (ally) ally.courage = clampCourage(ally.courage + Math.min(12, hours) * C.restCouragePerHour);
  }
  surviveNight(fledIds: readonly string[]): void {
    for (const ally of this.roster) if (ally.status === 'active') {
      ally.courage = fledIds.includes(ally.id) ? C.minimumCourage : clampCourage(ally.courage + C.nightCourageGain);
    }
  }
}
