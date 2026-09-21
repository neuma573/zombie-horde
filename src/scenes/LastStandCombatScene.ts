import { GameScene } from './GameScene';
import { HAZARD_DEFENSE_CONFIG } from '../config/lastStandCombatConfig';

/** Shares the combat engine and input lifecycle with Horde, with distinct night rules. */
export class LastStandCombatScene extends GameScene {
  constructor() { super('LastStandCombatScene', HAZARD_DEFENSE_CONFIG); }
}
