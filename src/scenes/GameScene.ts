import Phaser from 'phaser';

import { MOBILE_AIM_ASSIST_CONFIG } from '../config/aimAssistConfig';
import { CAMERA_FOLLOW_CONFIG, CAMERA_ZOOM_CONFIG } from '../config/cameraConfig';
import { GAME_REGISTRY_KEYS } from '../config/menuConfig';
import { GAME_TIME_CONFIG } from '../config/gameTimeConfig';
import { TIME_BASED_LIGHTING_CONFIG } from '../config/lightingConfig';
import { ITEM_BALANCE_CONFIG } from '../config/itemConfig';
import { OBSTACLE_CONFIG } from '../config/obstacleConfig';
import { URBAN_MAP_CONFIG } from '../config/urbanMapConfig';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { SIMULATION_CONFIG } from '../config/simulationConfig';
import { SPAWN_CONFIG } from '../config/spawnConfig';
import {
  EMERGENCY_SUPPLY_FALL_DURATION_MS,
  NORMAL_SUPPLY_FALL_DURATION_MS,
  SUPPLY_DROP_BALANCE,
  SUPPLY_DROP_CONFIG,
} from '../config/supplyDropConfig';
import {
  BURST_RIFLE_WEAPON,
  PISTOL_WEAPON,
  STARTING_AMMO_RESERVES,
} from '../config/weaponConfig';
import { WAVE_CONFIG } from '../config/waveConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { ZOMBIE_CROWD_SPACING_CONFIG } from '../config/zombieCrowdSpacingConfig';
import { PATHFINDING_CONFIG } from '../config/pathfindingConfig';
import {
  Player,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  type PlayerAppearance,
} from '../entities/Player';
import { BuildingVisual } from '../effects/BuildingVisual';
import { Zombie } from '../entities/Zombie';
import { AimAssistVisual } from '../effects/AimAssistVisual';
import { CombatEffects } from '../effects/CombatEffects';
import { WorldBackdrop } from '../effects/WorldBackdrop';
import { TimeBasedLighting } from '../effects/TimeBasedLighting';
import { SupplyDropVisual } from '../effects/SupplyDropVisual';
import { WeaponAudio } from '../effects/WeaponAudio';
import { syncSoundEnabled } from '../effects/audioSettings';
import { preloadGameAssets } from '../effects/gameAssetPreloader';
import { WeaponPickup, WEAPON_PICKUP_RADIUS } from '../entities/WeaponPickup';
import { ItemPickup } from '../entities/ItemPickup';
import {
  resolveAimAssist,
  shouldReleaseAimLock,
  shouldApplyMobileAimAssist,
  type AimSource,
} from '../logic/aimAssist';
import { isPrimaryFireInput } from '../logic/fireInput';
import { consumeFixedSteps, createFixedStepState, type FixedStepState } from '../logic/fixedStep';
import {
  moveCircleWithObstacles,
  type RectangleObstacle,
} from '../logic/obstacleCollision';
import {
  moveZombieWithCrowdSpacing,
  resolveZombieCrowdSpacing,
  zombieVelocityWithCrowdSpacing,
} from '../logic/zombieCrowdSpacing';
import { queryZombieCollisionCandidates } from '../logic/zombieSpatialGrid';
import { separatePlayerFromZombies } from '../logic/entityCollision';
import {
  createPathfindingGrid,
  resizePathfindingGrid,
  type PathfindingGrid,
} from '../logic/pathfinding';
import {
  createZombieNavigationState,
  updateZombieNavigation,
  type ZombieNavigationState,
} from '../logic/zombieNavigation';
import {
  cameraScreenPoint,
  cameraScrollForPlayer,
  cameraWorldView,
  clientPointToViewport,
  createWorldSize,
  type Size,
} from '../logic/camera';
import { screenAimCandidate } from '../logic/aim';
import {
  snapCameraFollow,
  updateCameraFollow,
  velocityBetween,
  type CameraFollowState,
} from '../logic/cameraFollow';
import {
  createPinchZoomState,
  interpolateCameraZoom,
  minimumZoomToCoverViewport,
  resetPinchZoom,
  updatePinchZoom,
  wheelZoomTarget,
  type PinchZoomState,
} from '../logic/cameraZoom';
import { createHudViewModel, type SafeAreaInsets } from '../logic/hud';
import {
  advanceGameTime,
  createGameTimeState,
  formatGameTime,
  type GameTimeState,
} from '../logic/gameTime';
import { darknessAlphaForTime } from '../logic/timeBasedLighting';
import {
  addClamped,
  canCollectConsumable,
  claimSupplyLoot,
  hasUsableAmmoPickup,
  revalidatePickupPosition,
  selectSupplyLoot,
  spreadSupplyLootPositions,
} from '../logic/item';
import {
  advanceSupplyDrop,
  canOpenSupplyDropCrate,
  createSupplyTriggerState,
  createSupplyDropState,
  damageSupplyDropCrate,
  openSupplyDropCrate,
  resolveSupplyDropCrateBounds,
  resolveSupplyDropSnapshot,
  resolveSupplyTrigger,
  selectSupplyDropLocation,
  totalAvailableAmmo,
  type SupplyDropConfig,
  type SupplyDropKind,
  type SupplyDropState,
  type SupplyTriggerState,
} from '../logic/supplyDrop';
import { muzzleLightExposure } from '../logic/playerVisual';
import {
  zombieAppearanceSeedFromId,
  type ZombieAppearance,
} from '../logic/zombieAppearance';
import {
  advanceFastZombieRun,
  createFastZombieRunState,
  type FastZombieRunState,
} from '../logic/fastZombie';
import {
  resolveHitscan,
  type HitscanBlocker,
  type Vector2,
} from '../logic/hitscan';
import { constrainMuzzleToShotSegment } from '../logic/combatEffects';
import {
  applyWeaponRecoil,
  advanceFirstShotAccuracy,
  consumeFirstShotAccuracy,
  createFirstShotAccuracyState,
  createOwnedWeapon,
  hasLoadedWeaponPickup,
  shouldAutoPickupWeapon,
  shouldAutoReload,
  shouldShowFieldWeaponInfo,
  weaponSpreadDegrees,
} from '../logic/weapon';
import type { FirstShotAccuracyState, OwnedWeapon } from '../logic/weapon';
import {
  claimMobilePointer,
  canStartPinchFromRole,
  canRestartWithMobileTouch,
  classifyMobilePointer,
  createMobilePointerOwnership,
  didViewportOrientationChange,
  getViewportOrientation,
  isMobileControlPointerRole,
  joystickMovement,
  lateClaimMobilePointerRole,
  releaseMobilePointer,
  releasePinchPointerOwnership,
  roleForPointer,
  selectPinchPointerIds,
  shouldShowMobileControls,
  type MobileControlLayout,
  type MobilePointerOwnership,
  type ViewportOrientation,
} from '../logic/mobileInput';
import {
  constrainToBounds,
  moveWithinBounds,
  type MovementBounds,
} from '../logic/movement';
import {
  clearActiveInput,
  consumeFireRequest,
  consumeReloadRequest,
  createPlayerInputState,
  requestFire,
  requestReload,
  withAimCandidate,
  withMovement,
  type PlayerInputSnapshot,
} from '../logic/playerInput';
import {
  createSessionState,
  isPlaying,
  transitionToGameOver,
  type SessionState,
} from '../logic/session';
import { DamageSystem } from '../systems/DamageSystem';
import { GameplayKeyStateGuard } from '../systems/gameplayKeyState';
import { HudSystem } from '../systems/HudSystem';
import { MobileControls } from '../systems/MobileControls';
import { PauseMenu } from '../systems/PauseMenu';
import { ResponsiveUiSystem } from '../systems/ResponsiveUiSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { WeaponSystem } from '../systems/WeaponSystem';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
const SUPPLY_CRATE_TARGET_ID = 'supply-drop-crate';
const SPAWN_OFFSCREEN_WORLD_MARGIN = ZOMBIE_CONFIG.radius * 4 + 1;

export class GameScene extends Phaser.Scene {
  private readonly gameplayKeyStateGuard = new GameplayKeyStateGuard();
  private player!: Player;
  private movementKeys?: MovementKeys;
  private reloadKey?: Phaser.Input.Keyboard.Key;
  private pickupKey?: Phaser.Input.Keyboard.Key;
  private weaponSlotKeys?: [Phaser.Input.Keyboard.Key, Phaser.Input.Keyboard.Key];
  private restartKey?: Phaser.Input.Keyboard.Key;
  private pauseKey?: Phaser.Input.Keyboard.Key;
  private playerInput: PlayerInputSnapshot = createPlayerInputState();
  private viewDirection: Vector2 = { x: 1, y: 0 };
  private finalAimDirection: Vector2 = { x: 1, y: 0 };
  private aimSource: AimSource = 'none';
  private aimTargetId: string | null = null;
  private lockAcquiredManualDirection: Vector2 | null = null;
  private lastMouseScreenPoint: Vector2 | null = null;
  private mobileMovement = { x: 0, y: 0 };
  private mobileOwnership: MobilePointerOwnership = createMobilePointerOwnership();
  private mobileLayout?: MobileControlLayout;
  private mobileControlsEnabled = false;
  private mobileControls?: MobileControls;
  private pauseMenu?: PauseMenu;
  private responsiveUi?: ResponsiveUiSystem;
  private coarsePointerQuery?: MediaQueryList;
  private viewportOrientation?: ViewportOrientation;
  private readonly activeMobilePointers = new Set<number>();
  private readonly pinchEligiblePointers = new Set<number>();
  private readonly mobilePointerPositions = new Map<number, Vector2>();
  private readonly guardedMobilePointers = new Set<number>();
  private pinchZoomState: PinchZoomState = createPinchZoomState();
  private pinchPointerIds: [number, number] | null = null;
  private targetZoom: number = CAMERA_ZOOM_CONFIG.initial;
  private cameraFollowState: CameraFollowState = snapCameraFollow({ x: 0, y: 0 });
  private mobileRestartArmed = true;
  private zombies: Zombie[] = [];
  private pathfindingGrid!: PathfindingGrid;
  private readonly zombieNavigation = new Map<string, ZombieNavigationState>();
  private readonly fastZombieRuns = new Map<string, FastZombieRunState>();
  private pendingZombieSpawns = 0;
  private killCount = 0;
  private shotSequence = 0;
  private recoilSeed = 0;
  private firstShotAccuracy: FirstShotAccuracyState = createFirstShotAccuracyState();
  private sessionState: SessionState = createSessionState();
  private gameTime: GameTimeState = createGameTimeState(GAME_TIME_CONFIG);
  private supplyDropState: SupplyDropState = createSupplyDropState();
  private supplyDropActive = false;
  private supplyDropKind: SupplyDropKind = 'normal';
  private supplyDropLootReleased = false;
  private supplyTriggerState: SupplyTriggerState = createSupplyTriggerState();
  private currentSupplyDropConfig: SupplyDropConfig = SUPPLY_DROP_CONFIG;
  private previousSupplyDropPosition: Vector2 | null = null;
  private simulationStepState: FixedStepState = createFixedStepState();
  private playArea: Omit<MovementBounds, 'padding'> = { width: 0, height: 0 };
  private viewport: Size = { width: 0, height: 0 };
  private readonly damage = new DamageSystem();
  private spawn!: SpawnSystem;
  private wave!: WaveSystem;
  private weapon!: WeaponSystem;
  private weaponPickups: WeaponPickup[] = [];
  private itemPickups: ItemPickup[] = [];
  private hoveredWeaponPickup?: WeaponPickup;
  private hud?: HudSystem;
  private effects?: CombatEffects;
  private weaponAudio?: WeaponAudio;
  private aimAssistVisual?: AimAssistVisual;
  private worldBackdrop?: WorldBackdrop;
  private timeBasedLighting?: TimeBasedLighting;
  private supplyDropVisual?: SupplyDropVisual;
  private uiCamera?: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    preloadGameAssets(this);
  }

  create(): void {
    syncSoundEnabled(
      this.sound,
      this.registry.get(GAME_REGISTRY_KEYS.soundEnabled) !== false,
    );
    this.sessionState = createSessionState();
    this.gameTime = createGameTimeState(GAME_TIME_CONFIG);
    this.supplyDropState = createSupplyDropState(SUPPLY_DROP_CONFIG.crateHealth);
    this.supplyDropActive = false;
    this.supplyDropKind = 'normal';
    this.supplyDropLootReleased = false;
    this.supplyTriggerState = createSupplyTriggerState();
    this.currentSupplyDropConfig = SUPPLY_DROP_CONFIG;
    this.previousSupplyDropPosition = null;
    this.simulationStepState = createFixedStepState();
    this.playerInput = createPlayerInputState();
    this.viewDirection = { ...this.playerInput.manualAimDirection };
    this.finalAimDirection = { ...this.playerInput.manualAimDirection };
    this.aimSource = 'none';
    this.aimTargetId = null;
    this.lockAcquiredManualDirection = null;
    this.lastMouseScreenPoint = null;
    this.mobileControlsEnabled = false;
    this.mobileMovement = { x: 0, y: 0 };
    this.mobileOwnership = createMobilePointerOwnership();
    this.activeMobilePointers.clear();
    this.pinchEligiblePointers.clear();
    this.mobilePointerPositions.clear();
    this.guardedMobilePointers.clear();
    this.pinchZoomState = createPinchZoomState();
    this.pinchPointerIds = null;
    this.targetZoom = CAMERA_ZOOM_CONFIG.initial;
    this.cameras.main.setZoom(CAMERA_ZOOM_CONFIG.initial);
    this.mobileRestartArmed = true;
    this.pendingZombieSpawns = 0;
    this.spawn = new SpawnSystem(SPAWN_CONFIG, ZOMBIE_CONFIG.radius);
    this.wave = new WaveSystem(WAVE_CONFIG);
    this.weapon = new WeaponSystem(PISTOL_WEAPON, STARTING_AMMO_RESERVES);
    this.viewport = { width: this.scale.width, height: this.scale.height };
    this.playArea = createWorldSize(
      URBAN_MAP_CONFIG,
      this.viewport,
      CAMERA_ZOOM_CONFIG.min,
      SPAWN_OFFSCREEN_WORLD_MARGIN,
    );
    this.pathfindingGrid = createPathfindingGrid(
      this.playArea,
      OBSTACLE_CONFIG,
      {
        cellSize: PATHFINDING_CONFIG.cellSize,
        clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
      },
    );
    this.worldBackdrop = new WorldBackdrop(this);
    this.worldBackdrop.resize(
      this.playArea.width,
      this.playArea.height,
      URBAN_MAP_CONFIG.gridSize,
      URBAN_MAP_CONFIG.roads,
      URBAN_MAP_CONFIG.pavedAreas,
      URBAN_MAP_CONFIG.parkingSlotSpacing,
      URBAN_MAP_CONFIG.sidewalkWidth,
    );
    for (const obstacle of OBSTACLE_CONFIG) {
      new BuildingVisual(this, obstacle);
    }
    const appearance: PlayerAppearance = this.registry.get(
      GAME_REGISTRY_KEYS.characterClassId,
    ) === 'female-survivor'
      ? 'female-swat'
      : 'male-swat';
    this.player = new Player(
      this,
      SPAWN_CONFIG.playerPosition.x,
      SPAWN_CONFIG.playerPosition.y,
      appearance,
    );
    this.weaponPickups = [];
    this.itemPickups = [];
    this.snapCameraToPlayer();
    this.timeBasedLighting = new TimeBasedLighting(this, TIME_BASED_LIGHTING_CONFIG);
    this.timeBasedLighting.resize(this.viewport.width, this.viewport.height);
    this.zombies = [];
    this.zombieNavigation.clear();
    this.fastZombieRuns.clear();
    this.killCount = 0;
    this.shotSequence = 0;
    this.recoilSeed = Math.floor(Math.random() * 0x1_0000_0000);
    this.firstShotAccuracy = createFirstShotAccuracyState();
    this.resizePlayArea(this.scale.gameSize);
    this.updateTimeBasedLighting();
    this.hud = new HudSystem(this, (slot) => this.selectWeaponSlot(slot));
    this.effects = new CombatEffects(this);
    this.weaponAudio = new WeaponAudio(this);
    this.aimAssistVisual = new AimAssistVisual(this);
    this.mobileControls = new MobileControls(this);
    this.pauseMenu = new PauseMenu(
      this,
      {
        width: this.viewport.width,
        height: this.viewport.height,
        safeArea: this.readSafeArea(),
      },
      () => {
        this.gameplayKeyStateGuard.suppressHeldUntilKeyUp(this.gameplayKeys());
        this.clearActiveMobilePointers();
        this.pauseSceneManagers();
      },
      () => {
        this.resumeSceneManagers();
        this.resetMobileInput();
      },
      () => {
        this.gameplayKeyStateGuard.releaseAll();
        this.resumeSceneManagers();
        this.scene.start('MainMenuScene');
      },
    );
    this.responsiveUi = new ResponsiveUiSystem(
      this.hud,
      this.pauseMenu,
      this.mobileControls,
    );
    this.supplyDropVisual = new SupplyDropVisual(this);
    this.uiCamera = this.cameras.add(
      0,
      0,
      this.viewport.width,
      this.viewport.height,
      false,
      'ui',
    );
    this.syncCameraLayers();
    this.coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    this.refreshInputMode();
    this.updateHud();
    this.updateSupplyDropVisual();

    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
    this.reloadKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pickupKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.weaponSlotKeys = this.input.keyboard ? [
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
    ] : undefined;
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.pauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheelZoom, this);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncCameraLayers, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizePlayArea, this);
    this.coarsePointerQuery.addEventListener('change', this.handleInputModeChange);
    this.game.canvas.addEventListener('pointercancel', this.handleNativeCancel);
    this.game.canvas.addEventListener('touchcancel', this.handleNativeCancel);
    this.game.canvas.addEventListener('wheel', this.preventCanvasWheel, { passive: false });
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('keydown', this.handleNativeKeyDown);
    window.addEventListener('keyup', this.handleNativeKeyUp);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameplayKeyStateGuard.releaseAll();
      this.resumeSceneManagers();
      this.cancelAllMobileInput();
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
      this.input.off(Phaser.Input.Events.POINTER_WHEEL, this.handleWheelZoom, this);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncCameraLayers, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizePlayArea, this);
      this.coarsePointerQuery?.removeEventListener('change', this.handleInputModeChange);
      this.game.canvas.removeEventListener('pointercancel', this.handleNativeCancel);
      this.game.canvas.removeEventListener('touchcancel', this.handleNativeCancel);
      this.game.canvas.removeEventListener('wheel', this.preventCanvasWheel);
      window.removeEventListener('blur', this.handleWindowBlur);
      window.removeEventListener('keydown', this.handleNativeKeyDown);
      window.removeEventListener('keyup', this.handleNativeKeyUp);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.hud?.destroy();
      this.hud = undefined;
      this.effects?.destroy();
      this.effects = undefined;
      this.weaponAudio?.destroy();
      this.weaponAudio = undefined;
      this.aimAssistVisual?.destroy();
      this.aimAssistVisual = undefined;
      this.worldBackdrop?.destroy();
      this.worldBackdrop = undefined;
      this.timeBasedLighting?.destroy();
      this.timeBasedLighting = undefined;
      this.mobileControls?.destroy();
      this.mobileControls = undefined;
      this.pauseMenu?.destroy();
      this.pauseMenu = undefined;
      this.supplyDropVisual?.destroy();
      this.supplyDropVisual = undefined;
      this.weaponPickups.forEach((pickup) => pickup.destroy());
      this.weaponPickups = [];
      this.itemPickups.forEach((pickup) => pickup.destroy());
      this.itemPickups = [];
      this.hoveredWeaponPickup = undefined;
      this.uiCamera = undefined;
    });
  }

  update(_time: number, deltaMs: number): void {
    if (this.pauseKey && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      if (this.pauseMenu?.isOpen()) {
        this.pauseMenu.hide();
      } else if (isPlaying(this.sessionState)) {
        this.pauseMenu?.show();
      }
    }
    if (this.pauseMenu?.isOpen()) return;

    this.player.updateVisual(
      deltaMs,
      Math.hypot(this.playerInput.movement.x, this.playerInput.movement.y) > 0.01,
    );
    for (const zombie of this.zombies) {
      zombie.updateMuzzleReflection(deltaMs);
    }

    if (!isPlaying(this.sessionState)) {
      for (const zombie of this.zombies) {
        zombie.updateAttackVisual();
      }
      this.updateCameraZoom(deltaMs);
      this.updateSupplyDropVisual();
      this.clearAimAssist();
      this.resetMobileInput();
      this.updateHud();
      if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.restartSession();
      }
      return;
    }

    if (this.reloadKey && Phaser.Input.Keyboard.JustDown(this.reloadKey)) {
      this.playerInput = requestReload(this.playerInput);
    }
    if (this.pickupKey && Phaser.Input.Keyboard.JustDown(this.pickupKey)) {
      if (this.canOpenSupplyCrate()) {
        this.tryOpenSupplyCrate();
      } else if (!this.hasEmptyWeaponSlot()) {
        this.tryPickupWeapon();
      }
    }
    if (this.weaponSlotKeys?.[0] && Phaser.Input.Keyboard.JustDown(this.weaponSlotKeys[0])) {
      this.selectWeaponSlot(0);
    }
    if (this.weaponSlotKeys?.[1] && Phaser.Input.Keyboard.JustDown(this.weaponSlotKeys[1])) {
      this.selectWeaponSlot(1);
    }

    const keyboardMovement = this.movementKeys ? {
      x: Number(this.movementKeys.right.isDown) - Number(this.movementKeys.left.isDown),
      y: Number(this.movementKeys.down.isDown) - Number(this.movementKeys.up.isDown),
    } : { x: 0, y: 0 };
    this.playerInput = withMovement(
      this.playerInput,
      keyboardMovement.x !== 0 || keyboardMovement.y !== 0
        ? keyboardMovement
        : this.mobileMovement,
    );

    const reload = consumeReloadRequest(this.playerInput);
    this.playerInput = reload.state;
    if (reload.requested) {
      this.startWeaponReload();
    }
    const fixedSteps = consumeFixedSteps(
      this.simulationStepState,
      deltaMs,
      SIMULATION_CONFIG.fixedStepMs,
    );
    this.simulationStepState = fixedSteps.state;
    let playerDamageEventCount = 0;
    let playerDied = false;

    for (let step = 0; step < fixedSteps.stepCount; step += 1) {
      this.updateCameraZoom(SIMULATION_CONFIG.fixedStepMs);
      this.refreshStationaryMouseAim();
      const simulation = this.advanceSimulationStep(
        SIMULATION_CONFIG.fixedStepMs,
        step * SIMULATION_CONFIG.fixedStepMs,
      );
      playerDamageEventCount += simulation.damageEventCount;
      if (simulation.died) {
        playerDied = true;
        this.simulationStepState = createFixedStepState();
        break;
      }
    }
    this.weaponAudio?.flushQueuedShots();
    this.weaponAudio?.flushQueuedReloadCues();

    this.updatePlayerWeaponVisual();
    this.updateCameraPosition();
    this.updateSupplyDropVisual();
    this.refreshStationaryMouseAim();
    for (const zombie of this.zombies) {
      zombie.faceToward(this.player);
      zombie.updateAttackVisual();
    }

    if (playerDied) {
      const transition = transitionToGameOver(this.sessionState);
      this.sessionState = transition.state;

      if (transition.changed) {
        this.weaponAudio?.cancelReload();
        this.pauseMenu?.setMobileVisible(false);
        this.events.emit('player-died');
      }

      this.mobileRestartArmed = this.activeMobilePointers.size === 0;
      this.clearAimAssist();
      this.resetMobileInput();
      this.updateHud();
      this.playPlayerHitEffects(playerDamageEventCount);
      return;
    }

    this.refreshAimAssist();
    this.updateTimeBasedLighting(deltaMs);

    this.updateHud();
    this.updateWeaponPickupInfo();
    this.playPlayerHitEffects(playerDamageEventCount);
  }

  private advanceSimulationStep(
    deltaMs: number,
    audioDelayMs = 0,
  ): { died: boolean; damageEventCount: number } {
    this.gameTime = advanceGameTime(this.gameTime, deltaMs, GAME_TIME_CONFIG);
    if (this.supplyDropActive) {
      this.supplyDropState = advanceSupplyDrop(this.supplyDropState, deltaMs);
    }
    const movementObstacles = this.activeMovementObstacles();
    this.firstShotAccuracy = advanceFirstShotAccuracy(
      this.firstShotAccuracy,
      deltaMs,
    );
    this.advanceWeaponPickupLifetimes(deltaMs);
    for (const pickup of this.itemPickups) {
      pickup.advanceVisual(deltaMs);
    }
    this.weaponAudio?.advanceReload(deltaMs, audioDelayMs);
    const burstShotOffsets = this.weapon.updateBurst(deltaMs);
    for (const burstShotOffset of burstShotOffsets) {
      this.resolveHitscanShot(audioDelayMs + burstShotOffset);
    }
    this.startMobileAutoReloadIfNeeded();

    const playerStart = { x: this.player.x, y: this.player.y };
    const desiredPosition = moveWithinBounds(
      this.player,
      this.playerInput.movement,
      PLAYER_SPEED,
      deltaMs,
      {
        width: this.playArea.width,
        height: this.playArea.height,
        padding: PLAYER_RADIUS,
      },
    );
    const nextPlayerPosition = moveCircleWithObstacles(
      this.player,
      desiredPosition,
      PLAYER_RADIUS,
      movementObstacles,
      {
        width: this.playArea.width,
        height: this.playArea.height,
        padding: PLAYER_RADIUS,
      },
    );
    this.player.setPosition(nextPlayerPosition.x, nextPlayerPosition.y);
    const nearbyPickup = this.nearestWeaponPickupInRange();
    if (shouldAutoPickupWeapon(this.weapon.getInventory(), nearbyPickup !== undefined)) {
      this.tryPickupWeapon(nearbyPickup);
    }
    this.collectNearbyItems();
    const playerMovementEnd = { x: nextPlayerPosition.x, y: nextPlayerPosition.y };
    const zombieStarts = this.zombies.map((zombie) => ({ x: zombie.x, y: zombie.y }));
    const zombieSpatialEntries = this.zombies.map((zombie) => ({
      id: zombie.id,
      position: { x: zombie.x, y: zombie.y },
      radius: zombie.hitRadius,
    }));
    const candidateQuery = queryZombieCollisionCandidates(zombieSpatialEntries);
    const crowdSpacing = resolveZombieCrowdSpacing(
      zombieSpatialEntries,
      candidateQuery,
      ZOMBIE_CROWD_SPACING_CONFIG,
      ZOMBIE_CONFIG.speed,
    );

    for (const zombie of this.zombies) {
      let zombieSpeed = ZOMBIE_CONFIG.speed;
      if (zombie.kind === 'fast') {
        const run = advanceFastZombieRun(
          this.fastZombieRuns.get(zombie.id)
            ?? createFastZombieRunState(ZOMBIE_CONFIG.fast),
          deltaMs,
          Math.hypot(zombie.x - this.player.x, zombie.y - this.player.y),
          zombieAppearanceSeedFromId(zombie.id),
          ZOMBIE_CONFIG.fast,
        );
        this.fastZombieRuns.set(zombie.id, run.state);
        if (run.isRunning) zombieSpeed *= run.state.speedMultiplier;
      }
      const navigation = updateZombieNavigation(
        this.zombieNavigation.get(zombie.id) ?? createZombieNavigationState(),
        zombie,
        this.player,
        this.pathfindingGrid,
        OBSTACLE_CONFIG,
        zombie.hitRadius,
        this.player.hitRadius,
        PATHFINDING_CONFIG,
        deltaMs,
      );
      this.zombieNavigation.set(zombie.id, navigation.state);
      const separationVelocity = crowdSpacing.valid
        ? crowdSpacing.velocities.get(zombie.id) ?? { x: 0, y: 0 }
        : { x: 0, y: 0 };
      const velocity = zombieVelocityWithCrowdSpacing(
        zombie,
        navigation.target,
        zombieSpeed,
        separationVelocity,
      );
      const desiredZombiePosition = moveZombieWithCrowdSpacing(
        zombie,
        navigation.target,
        velocity,
        deltaMs,
      );
      const nextZombiePosition = moveCircleWithObstacles(
        zombie,
        desiredZombiePosition,
        zombie.hitRadius,
        movementObstacles,
        {
          width: this.playArea.width,
          height: this.playArea.height,
          padding: zombie.hitRadius,
        },
      );
      zombie.setPosition(nextZombiePosition.x, nextZombiePosition.y);
    }

    const zombieMovementEnds = this.zombies.map((zombie) => ({ x: zombie.x, y: zombie.y }));
    const contactDamage = this.damage.resolveZombieContacts(
      this.player,
      { start: playerStart, end: playerMovementEnd },
      this.zombies,
      this.zombies.map((_zombie, index) => ({
        start: zombieStarts[index] ?? zombieMovementEnds[index],
        end: zombieMovementEnds[index],
      })),
      deltaMs,
      PLAYER_CONFIG.invulnerabilityMs,
      ZOMBIE_CONFIG.contactDamage,
      ZOMBIE_CONFIG.attackWindupMs,
      ZOMBIE_CONFIG.attackIntervalMs,
    );
    const separation = separatePlayerFromZombies(
      {
        position: { x: this.player.x, y: this.player.y },
        previousPosition: playerStart,
        radius: this.player.hitRadius,
      },
      this.zombies.map((zombie, index) => ({
        id: zombie.id,
        position: { x: zombie.x, y: zombie.y },
        previousPosition: zombieStarts[index],
        radius: zombie.hitRadius,
      })),
      movementObstacles,
      this.playArea,
    );
    this.player.setPosition(separation.playerPosition.x, separation.playerPosition.y);
    for (const zombie of this.zombies) {
      const position = separation.zombiePositions.get(zombie.id);
      if (position) zombie.setPosition(position.x, position.y);
    }
    this.cameraFollowState = updateCameraFollow(
      this.cameraFollowState,
      this.player,
      velocityBetween(playerStart, playerMovementEnd, deltaMs),
      deltaMs,
      CAMERA_FOLLOW_CONFIG,
    );

    if (!contactDamage.died) {
      const waveUpdate = this.wave.update(
        deltaMs,
        this.zombies.length + this.pendingZombieSpawns,
      );
      this.pendingZombieSpawns += waveUpdate.spawnCount;
      while (this.pendingZombieSpawns > 0) {
        const zombie = this.spawn.spawn(
          this,
          this.playArea,
          this.player,
          cameraWorldView(
            { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
            this.viewport,
            this.cameras.main.zoom,
          ),
          movementObstacles,
          this.wave.getState().waveNumber,
        );
        if (!zombie) break;
        this.zombies.push(zombie);
        this.pendingZombieSpawns -= 1;
      }
      this.tryTriggerSupplyDrop(waveUpdate.waveCleared);
    }

    return {
      died: contactDamage.died,
      damageEventCount: contactDamage.damageEvents.length,
    };
  }

  private resolveFireRequest(): void {
    const fire = consumeFireRequest(this.playerInput);
    this.playerInput = fire.state;

    if (!fire.requested || !isPlaying(this.sessionState)) {
      return;
    }

    if (!this.weapon.fire()) {
      this.startMobileAutoReloadIfNeeded();
      this.updateHud();
      return;
    }
    this.resolveHitscanShot();
  }

  private resolveHitscanShot(audioOffsetMs?: number): void {
    const aimDirection = this.refreshAimAssist();
    const weaponDefinition = this.weapon.getDefinition();
    if (audioOffsetMs === undefined) {
      this.weaponAudio?.playShot(weaponDefinition.id);
    } else {
      this.weaponAudio?.queueShot(weaponDefinition.id, audioOffsetMs);
    }
    const weaponConfig = weaponDefinition.config;
    const firstShot = consumeFirstShotAccuracy(this.firstShotAccuracy);
    this.firstShotAccuracy = firstShot.state;
    const shotDirection = applyWeaponRecoil(
      aimDirection,
      weaponSpreadDegrees(
        weaponDefinition,
        firstShot.consecutiveShotIndex,
        firstShot.isAccurateFirstShot,
      ),
      this.shotSequence,
      this.recoilSeed,
    );
    this.shotSequence += 1;
    const shotOrigin = { x: this.player.x, y: this.player.y };
    const supplyCrateTarget = this.activeSupplyCrateTarget();
    const result = resolveHitscan(
      shotOrigin,
      shotDirection,
      weaponConfig.range,
      [
        ...this.zombies.map((zombie) => ({
          id: zombie.id,
          position: { x: zombie.x, y: zombie.y },
          radius: zombie.hitRadius,
        })),
        ...(supplyCrateTarget ? [supplyCrateTarget] : []),
      ],
      weaponConfig.maxTargets,
      this.activeHitscanBlockers(),
    );
    const impactEvents: Array<{
      position: Vector2;
      radius: number;
      died: boolean;
      direction: Vector2;
      rotation: number;
      variantKey: string;
      appearance: ZombieAppearance;
    }> = [];

    const deadIds = new Set<string>();

    for (const hit of result.hits) {
      if (hit.targetId === SUPPLY_CRATE_TARGET_ID) {
        const damage = damageSupplyDropCrate(
          this.supplyDropState,
          weaponConfig.damage,
        );
        this.supplyDropState = damage.state;
        this.effects?.playSupplyCrateHit(hit.point, damage.died);
        if (damage.died) this.releaseSupplyLoot();
        continue;
      }

      const zombie = this.zombies.find((candidate) => candidate.id === hit.targetId);

      if (zombie) {
        const damage = this.damage.apply(zombie, weaponConfig.damage);
        impactEvents.push({
          position: { x: zombie.x, y: zombie.y },
          radius: zombie.hitRadius,
          died: damage.died,
          direction: { ...shotDirection },
          rotation: zombie.rotation,
          variantKey: zombie.id,
          appearance: zombie.appearance,
        });

        zombie.triggerHitReaction(shotDirection);

        if (damage.died) {
          zombie.destroy();
          deadIds.add(zombie.id);
        }
      }
    }

    if (deadIds.size > 0) {
      this.killCount += deadIds.size;
      this.zombies = this.zombies.filter((zombie) => !deadIds.has(zombie.id));
      for (const id of deadIds) this.zombieNavigation.delete(id);
      for (const id of deadIds) this.fastZombieRuns.delete(id);

      if (this.aimTargetId !== null && deadIds.has(this.aimTargetId)) {
        this.aimTargetId = null;
        this.aimAssistVisual?.hide();
      }
    }

    const effectOrigin = constrainMuzzleToShotSegment(
      shotOrigin,
      this.player.getMuzzlePosition(),
      result.endPoint,
    );
    this.effects?.playShot({
      origin: effectOrigin,
      endPoint: result.endPoint,
    });
    const muzzleScreenPosition = cameraScreenPoint(
      effectOrigin,
      {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      },
      this.viewport,
      this.cameras.main.zoom,
    );
    this.timeBasedLighting?.triggerMuzzleFlash(
      muzzleScreenPosition.x,
      muzzleScreenPosition.y,
      shotDirection,
      Math.hypot(result.endPoint.x - effectOrigin.x, result.endPoint.y - effectOrigin.y),
      this.cameras.main.zoom,
    );
    this.player.triggerMuzzleReflection();
    this.player.triggerWeaponRecoil(weaponDefinition.recoil);
    const flashReach = Math.min(
      TIME_BASED_LIGHTING_CONFIG.muzzleFlashForwardLength,
      Math.hypot(result.endPoint.x - effectOrigin.x, result.endPoint.y - effectOrigin.y),
    );
    for (const zombie of this.zombies) {
      const exposure = muzzleLightExposure(
        effectOrigin,
        shotDirection,
        zombie,
        flashReach + zombie.hitRadius,
        Math.atan2(TIME_BASED_LIGHTING_CONFIG.muzzleFlashForwardWidth / 2, Math.max(1, flashReach)),
      );
      if (exposure > 0) zombie.triggerMuzzleReflection(exposure);
    }
    for (const impact of impactEvents) {
      this.effects?.playZombieHit(impact);
      if (impact.died) {
        this.effects?.playZombieDeath(impact);
      }
    }
    this.startMobileAutoReloadIfNeeded();
    this.updateHud();
  }

  private startMobileAutoReloadIfNeeded(): void {
    if (shouldAutoReload(this.weapon.getState(), this.mobileControlsEnabled)) {
      this.startWeaponReload();
    }
  }

  private startWeaponReload(): void {
    const wasReloading = this.weapon.getState().reloadRemainingMs !== null;
    this.weapon.reload();
    const reload = this.weapon.getReloadProgress();
    if (!wasReloading && reload.isReloading) {
      this.weaponAudio?.playReload(
        this.weapon.getDefinition().id,
        reload.durationMs,
      );
    }
  }

  private selectWeaponSlot(slot: 0 | 1): void {
    const previousSlot = this.weapon.getInventory().activeSlot;
    this.weapon.selectSlot(slot);
    if (this.weapon.getInventory().activeSlot !== previousSlot) {
      this.weaponAudio?.playEquip(this.weapon.getDefinition().id);
    }
  }

  private updatePlayerWeaponVisual(): void {
    const reload = this.weapon.getReloadProgress();
    this.player.setWeaponVisual(this.weapon.getDefinition().id);
    this.player.setReloadVisual(reload.isReloading, reload.normalized);
  }

  private createWeaponPickup(
    x: number,
    y: number,
    ownedWeapon: OwnedWeapon,
  ): void {
    const definition = ownedWeapon.definition;
    const textureKey = definition.id === 'pistol' ? 'weapon-pistol' : 'weapon-rifle';
    const pickup = new WeaponPickup(this, x, y, ownedWeapon, textureKey);
    pickup.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.hoveredWeaponPickup = pickup;
      this.updateWeaponPickupInfo();
    });
    pickup.on(Phaser.Input.Events.POINTER_OUT, () => {
      if (this.hoveredWeaponPickup === pickup) {
        this.hoveredWeaponPickup = undefined;
      }
      this.updateWeaponPickupInfo();
    });
    pickup.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      const mobileRole = this.mobileControlsEnabled && this.mobileLayout
        ? classifyMobilePointer({ x: pointer.x, y: pointer.y }, this.mobileLayout)
        : null;
      if (
        pointer.wasTouch
        && !isMobileControlPointerRole(mobileRole)
        && this.isWeaponPickupInRange(pickup)
      ) {
        this.tryPickupWeapon(pickup);
      }
    });
    this.weaponPickups.push(pickup);
  }

  private tryPickupWeapon(target?: WeaponPickup): void {
    const pickup = target ?? this.nearestWeaponPickupInRange();
    if (!pickup || !this.isWeaponPickupInRange(pickup)) return;

    const position = { x: pickup.x, y: pickup.y };
    const replaced = this.weapon.pickupOwned(pickup.ownedWeapon);
    this.weaponAudio?.playEquip(this.weapon.getDefinition().id);
    if (this.hoveredWeaponPickup === pickup) {
      this.hoveredWeaponPickup = undefined;
    }
    this.weaponPickups = this.weaponPickups.filter((candidate) => candidate !== pickup);
    pickup.destroy();
    if (replaced) {
      this.createWeaponPickup(position.x, position.y, replaced);
    }
    this.updateHud();
    this.updateWeaponPickupInfo();
  }

  private isWeaponPickupInRange(pickup: WeaponPickup): boolean {
    return Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      pickup.x,
      pickup.y,
    ) <= WEAPON_PICKUP_RADIUS;
  }

  private nearestWeaponPickupInRange(): WeaponPickup | undefined {
    return this.weaponPickups
      .filter((pickup) => this.isWeaponPickupInRange(pickup))
      .sort((left, right) => (
        Phaser.Math.Distance.Squared(this.player.x, this.player.y, left.x, left.y)
        - Phaser.Math.Distance.Squared(this.player.x, this.player.y, right.x, right.y)
      ))[0];
  }

  private advanceWeaponPickupLifetimes(deltaMs: number): void {
    const expired = this.weaponPickups.filter((pickup) => pickup.advanceLifetime(deltaMs));
    if (expired.length === 0) return;
    const expiredSet = new Set(expired);
    if (this.hoveredWeaponPickup && expiredSet.has(this.hoveredWeaponPickup)) {
      this.hoveredWeaponPickup = undefined;
    }
    expired.forEach((pickup) => pickup.destroy());
    this.weaponPickups = this.weaponPickups.filter((pickup) => !expiredSet.has(pickup));
    this.updateWeaponPickupInfo();
  }

  private hasEmptyWeaponSlot(): boolean {
    return this.weapon.getInventory().slots.some((slot) => slot === null);
  }

  private hasTwoWeapons(): boolean {
    return this.weapon.getInventory().slots.every((slot) => slot !== null);
  }

  private updateWeaponPickupInfo(): void {
    if (this.hud?.isWeaponSlotHovered()) return;
    const pickup = this.mobileControlsEnabled
      ? this.nearestWeaponPickupInRange()
      : this.hoveredWeaponPickup;
    const isInPickupRange = !!pickup && this.isWeaponPickupInRange(pickup);
    const shouldShow = !!pickup && shouldShowFieldWeaponInfo(
      this.hasTwoWeapons(),
      this.mobileControlsEnabled,
      isInPickupRange,
      this.hoveredWeaponPickup === pickup,
    );
    if (!pickup || !shouldShow) {
      this.hud?.showWeaponPickup(null);
      return;
    }
    const config = pickup.definition.config;
    const screenPosition = cameraScreenPoint(
      pickup,
      {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      },
      this.viewport,
      this.cameras.main.zoom,
    );
    this.hud?.showWeaponPickup({
      name: pickup.definition.name,
      description: pickup.definition.description,
      rarity: pickup.definition.rarity,
      fireRateText: config.burstSize === 3
        ? `3-RND / ${config.fireIntervalMs}ms`
        : `SEMI / ${config.fireIntervalMs}ms`,
      recoil: pickup.definition.recoil,
      magazineSize: config.magazineSize,
      interactionText: this.mobileControlsEnabled
        ? this.hasEmptyWeaponSlot()
          ? 'Move onto the weapon to pick up'
          : 'Tap the weapon to replace current'
        : isInPickupRange
          ? this.hasEmptyWeaponSlot()
            ? 'Move onto the weapon to pick up'
            : 'Press E to replace current'
          : 'Move closer to pick up',
    }, screenPosition);
  }

  private updateAimDirection(pointer: Phaser.Input.Pointer, source: AimSource): void {
    const screenPoint = { x: pointer.x, y: pointer.y };
    if (source === 'mouse') {
      this.lastMouseScreenPoint = screenPoint;
    }
    this.updateAimDirectionAtScreenPoint(screenPoint, source);
  }

  private updateAimDirectionAtScreenPoint(
    screenPoint: Vector2,
    source: AimSource,
  ): void {
    if (this.aimSource !== source) {
      this.aimSource = source;
      this.clearAimAssist();
    }

    const nextInput = withAimCandidate(
      this.playerInput,
      screenAimCandidate({
        screenPoint,
        playerPosition: this.player,
        cameraTargetPosition: this.cameraFollowState.targetPosition,
        world: this.playArea,
        viewport: this.viewport,
        zoom: this.cameras.main.zoom,
      }),
    );
    const releasesLock = source === 'mobile'
      && this.aimTargetId !== null
      && shouldReleaseAimLock(
        this.lockAcquiredManualDirection,
        nextInput.manualAimDirection,
        MOBILE_AIM_ASSIST_CONFIG.manualReleaseAngleRadians,
      );

    this.playerInput = nextInput;
    if (releasesLock) {
      this.clearAimAssist();
    } else if (this.aimTargetId === null) {
      this.viewDirection = { ...this.playerInput.manualAimDirection };
    }
    this.refreshAimAssist();
  }

  private refreshStationaryMouseAim(): void {
    if (
      this.mobileControlsEnabled
      || this.aimSource !== 'mouse'
    ) {
      return;
    }

    const screenPoint = this.lastMouseScreenPoint
      ?? this.sampleActiveMouseScreenPoint();
    if (screenPoint === null) return;

    this.lastMouseScreenPoint = screenPoint;
    this.updateAimDirectionAtScreenPoint(screenPoint, 'mouse');
  }

  private sampleActiveMouseScreenPoint(): Vector2 | null {
    const pointer = this.input.activePointer;
    if (pointer.wasTouch) return null;

    const pointerEvent = pointer.event as PointerEvent | MouseEvent | null;
    if (
      pointerEvent
      && Number.isFinite(pointerEvent.clientX)
      && Number.isFinite(pointerEvent.clientY)
    ) {
      const bounds = this.game.canvas.getBoundingClientRect();
      const sampled = clientPointToViewport(
        { x: pointerEvent.clientX, y: pointerEvent.clientY },
        {
          x: bounds.left,
          y: bounds.top,
          width: bounds.width,
          height: bounds.height,
        },
        this.viewport,
      );
      if (sampled !== null) return sampled;
    }

    return Number.isFinite(pointer.x) && Number.isFinite(pointer.y)
      ? { x: pointer.x, y: pointer.y }
      : null;
  }

  private setTargetZoom(nextZoom: number): void {
    const minimumZoom = this.minimumAllowedZoom();
    this.targetZoom = Math.min(
      CAMERA_ZOOM_CONFIG.max,
      Math.max(minimumZoom, nextZoom),
    );
  }

  private minimumAllowedZoom(): number {
    return minimumZoomToCoverViewport(
      CAMERA_ZOOM_CONFIG.min,
      CAMERA_ZOOM_CONFIG.max,
      this.viewport,
      this.playArea,
    );
  }

  private readonly handleWheelZoom = (
    _pointer: Phaser.Input.Pointer,
    _currentlyOver: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (this.pauseMenu?.isOpen()) return;
    const minimumZoom = this.minimumAllowedZoom();
    this.setTargetZoom(wheelZoomTarget(
      this.targetZoom,
      deltaY,
      CAMERA_ZOOM_CONFIG.wheelStep,
      minimumZoom,
      CAMERA_ZOOM_CONFIG.max,
    ));
  };

  private readonly preventCanvasWheel = (event: WheelEvent): void => {
    event.preventDefault();
  };

  private updatePinchGesture(): void {
    const pointerIds = selectPinchPointerIds(
      this.activeMobilePointers,
      this.pinchEligiblePointers,
      this.mobilePointerPositions,
    );

    if (pointerIds === null) {
      this.resetPinchState();
      return;
    }

    const pairChanged = this.pinchPointerIds === null
      || this.pinchPointerIds[0] !== pointerIds[0]
      || this.pinchPointerIds[1] !== pointerIds[1];
    if (pairChanged) {
      this.pinchZoomState = resetPinchZoom();
      this.pinchPointerIds = [pointerIds[0], pointerIds[1]];
    }

    const first = this.mobilePointerPositions.get(pointerIds[0]);
    const second = this.mobilePointerPositions.get(pointerIds[1]);
    if (!first || !second) {
      this.resetPinchState();
      return;
    }

    const result = updatePinchZoom(
      this.pinchZoomState,
      pointerIds.length,
      Math.hypot(second.x - first.x, second.y - first.y),
      this.targetZoom,
      {
        thresholdPixels: CAMERA_ZOOM_CONFIG.pinchThresholdPixels,
        sensitivity: CAMERA_ZOOM_CONFIG.pinchSensitivity,
        minZoom: this.minimumAllowedZoom(),
        maxZoom: CAMERA_ZOOM_CONFIG.max,
      },
    );
    this.pinchZoomState = result.state;
    this.setTargetZoom(result.targetZoom);

    if (result.started) {
      this.mobileOwnership = releasePinchPointerOwnership(
        this.mobileOwnership,
        pointerIds,
      );
    }
  }

  private resetPinchState(): void {
    this.pinchZoomState = resetPinchZoom();
    this.pinchPointerIds = null;
  }

  private isPinchPointer(pointerId: number): boolean {
    return this.pinchZoomState.isPinching
      && this.pinchPointerIds?.includes(pointerId) === true;
  }

  private updateCameraZoom(deltaMs: number): void {
    const nextZoom = interpolateCameraZoom(
      this.cameras.main.zoom,
      this.targetZoom,
      deltaMs,
      CAMERA_ZOOM_CONFIG.smoothSpeed,
      CAMERA_ZOOM_CONFIG.snapThreshold,
    );
    if (nextZoom !== this.cameras.main.zoom) {
      this.cameras.main.setZoom(nextZoom);
      this.updateCameraPosition();
    }
  }

  private syncCameraLayers(): void {
    if (!this.uiCamera) return;

    const fixedObjects: Phaser.GameObjects.GameObject[] = [];
    const worldObjects: Phaser.GameObjects.GameObject[] = [];
    for (const gameObject of this.children.list) {
      if (
        'scrollFactorX' in gameObject
        && 'scrollFactorY' in gameObject
        && gameObject.scrollFactorX === 0
        && gameObject.scrollFactorY === 0
      ) {
        fixedObjects.push(gameObject);
      } else {
        worldObjects.push(gameObject);
      }
    }

    this.cameras.main.ignore(fixedObjects);
    this.uiCamera.ignore(worldObjects);
  }

  private handlePointerDown(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[] = [],
  ): void {
    if (this.pauseMenu?.blocksGameplayPointer(pointer.x, pointer.y)) {
      if (pointer.wasTouch) this.guardedMobilePointers.add(pointer.id);
      return;
    }

    if (!isPlaying(this.sessionState)) {
      if (!pointer.wasTouch && isPrimaryFireInput(pointer)) {
        this.restartSession();
      } else if (pointer.wasTouch && canRestartWithMobileTouch(
        this.mobileControlsEnabled,
        this.mobileRestartArmed,
      )) {
        this.restartSession();
      }
      return;
    }

    const isOverWeaponPickup = currentlyOver.some(
      (gameObject) => gameObject instanceof WeaponPickup,
    );

    if (!pointer.wasTouch) {
      if (isOverWeaponPickup) return;
      if (!isPrimaryFireInput(pointer)) return;
      this.updateAimDirection(pointer, 'mouse');
      this.playerInput = requestFire(this.playerInput);
      this.resolveFireRequest();
      return;
    }

    if (!this.mobileControlsEnabled || !this.mobileLayout) return;

    const pointerId = pointer.id;
    const role = classifyMobilePointer(
      { x: pointer.x, y: pointer.y },
      this.mobileLayout,
      this.canOpenSupplyCrate(),
    );
    if (isOverWeaponPickup && !isMobileControlPointerRole(role)) return;
    this.activeMobilePointers.add(pointerId);
    this.mobilePointerPositions.set(pointerId, { x: pointer.x, y: pointer.y });
    if (canStartPinchFromRole(role)) {
      this.pinchEligiblePointers.add(pointerId);
    }
    this.updatePinchGesture();
    if (this.isPinchPointer(pointerId)) return;

    if (role === 'controlGuard') {
      this.guardedMobilePointers.add(pointerId);
      return;
    }
    this.mobileOwnership = claimMobilePointer(this.mobileOwnership, pointerId, role);

    if (roleForPointer(this.mobileOwnership, pointerId) !== role) {
      if (
        role === 'movement'
        || role === 'fire'
        || role === 'reload'
        || role === 'interaction'
      ) {
        this.guardedMobilePointers.add(pointerId);
      }
      return;
    }

    if (role === 'movement') {
      this.updateMobileMovement(pointer);
    } else if (role === 'aim') {
      this.updateAimDirection(pointer, 'mobile');
    } else if (role === 'fire') {
      this.playerInput = requestFire(this.playerInput);
      this.resolveFireRequest();
    } else if (role === 'reload') {
      this.playerInput = requestReload(this.playerInput);
    } else if (role === 'interaction') {
      this.tryOpenSupplyCrate();
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.pauseMenu?.blocksGameplayPointer(pointer.x, pointer.y)) return;

    if (!pointer.wasTouch) {
      this.lastMouseScreenPoint = { x: pointer.x, y: pointer.y };
      if (!isPlaying(this.sessionState)) return;
      this.updateAimDirection(pointer, 'mouse');
      return;
    }

    if (!isPlaying(this.sessionState)) return;

    this.mobilePointerPositions.set(pointer.id, { x: pointer.x, y: pointer.y });
    this.updatePinchGesture();
    if (this.isPinchPointer(pointer.id)) return;

    if (this.guardedMobilePointers.has(pointer.id)) return;

    let role = roleForPointer(this.mobileOwnership, pointer.id);
    if (
      role === null
      && this.activeMobilePointers.has(pointer.id)
      && this.mobileControlsEnabled
      && this.mobileLayout
    ) {
      const candidateRole = lateClaimMobilePointerRole(
        classifyMobilePointer(
          { x: pointer.x, y: pointer.y },
          this.mobileLayout,
        ),
      );
      this.mobileOwnership = claimMobilePointer(
        this.mobileOwnership,
        pointer.id,
        candidateRole,
      );
      role = roleForPointer(this.mobileOwnership, pointer.id);
    }
    if (role === 'movement') this.updateMobileMovement(pointer);
    if (role === 'aim') this.updateAimDirection(pointer, 'mobile');
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      const previousPinchPointers = this.pinchPointerIds;
      this.activeMobilePointers.delete(pointer.id);
      this.pinchEligiblePointers.delete(pointer.id);
      this.mobilePointerPositions.delete(pointer.id);
      this.guardedMobilePointers.delete(pointer.id);
      const wasPinching = this.pinchZoomState.isPinching;
      this.updatePinchGesture();
      if (wasPinching && !this.pinchZoomState.isPinching && previousPinchPointers) {
        for (const remainingPointerId of previousPinchPointers) {
          if (this.activeMobilePointers.has(remainingPointerId)) {
            this.pinchEligiblePointers.delete(remainingPointerId);
            this.guardedMobilePointers.add(remainingPointerId);
          }
        }
      }
      if (!isPlaying(this.sessionState) && this.activeMobilePointers.size === 0) {
        this.mobileRestartArmed = true;
      }
    }

    const role = roleForPointer(this.mobileOwnership, pointer.id);
    this.mobileOwnership = releaseMobilePointer(this.mobileOwnership, pointer.id);

    if (role === 'movement') {
      this.mobileMovement = { x: 0, y: 0 };
      this.mobileControls?.setJoystickPointer(null);
    }
  }

  private updateMobileMovement(pointer: Phaser.Input.Pointer): void {
    if (!this.mobileLayout) return;
    const position = { x: pointer.x, y: pointer.y };
    this.mobileMovement = joystickMovement(position, this.mobileLayout.joystick);
    this.mobileControls?.setJoystickPointer(position);
  }

  private restartSession(): void {
    this.scene.restart();
  }

  private resizePlayArea(gameSize: Phaser.Structs.Size): void {
    const orientationChanged = didViewportOrientationChange(
      this.viewportOrientation,
      gameSize.width,
      gameSize.height,
    );
    const nextOrientation = getViewportOrientation(gameSize.width, gameSize.height);
    this.viewportOrientation = nextOrientation;

    if (orientationChanged) this.cancelAllMobileInput();
    this.viewport = {
      width: gameSize.width,
      height: gameSize.height,
    };
    this.lastMouseScreenPoint = null;
    const nextPlayArea = createWorldSize(
      URBAN_MAP_CONFIG,
      this.viewport,
      CAMERA_ZOOM_CONFIG.min,
      SPAWN_OFFSCREEN_WORLD_MARGIN,
    );
    const nextPathfindingGrid = resizePathfindingGrid(
      this.pathfindingGrid,
      nextPlayArea,
      OBSTACLE_CONFIG,
      {
        cellSize: PATHFINDING_CONFIG.cellSize,
        clearance: ZOMBIE_CONFIG.radius + PATHFINDING_CONFIG.obstacleClearance,
      },
    );
    if (nextPathfindingGrid !== this.pathfindingGrid) {
      this.pathfindingGrid = nextPathfindingGrid;
      this.zombieNavigation.clear();
    }
    this.playArea = nextPlayArea;
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.cameras.main.setBounds(0, 0, this.playArea.width, this.playArea.height);
    this.uiCamera?.setViewport(0, 0, gameSize.width, gameSize.height);
    const minimumZoom = this.minimumAllowedZoom();
    this.setTargetZoom(this.targetZoom);
    if (this.cameras.main.zoom < minimumZoom) {
      this.cameras.main.setZoom(minimumZoom);
    }
    this.worldBackdrop?.resize(
      this.playArea.width,
      this.playArea.height,
      URBAN_MAP_CONFIG.gridSize,
      URBAN_MAP_CONFIG.roads,
      URBAN_MAP_CONFIG.pavedAreas,
      URBAN_MAP_CONFIG.parkingSlotSpacing,
      URBAN_MAP_CONFIG.sidewalkWidth,
    );
    this.timeBasedLighting?.resize(gameSize.width, gameSize.height);
    this.revalidateSupplyCoordinates();

    const playerPosition = constrainToBounds(this.player, {
      ...this.playArea,
      padding: PLAYER_RADIUS,
    });
    this.player.setPosition(playerPosition.x, playerPosition.y);

    for (const zombie of this.zombies) {
      const zombiePosition = constrainToBounds(zombie, {
        ...this.playArea,
        padding: zombie.hitRadius,
      });
      zombie.setPosition(zombiePosition.x, zombiePosition.y);
    }

    this.updateCameraPosition();
    this.updateTimeBasedLighting();

    this.refreshInputMode();
  }

  private updateHud(): void {
    const weapon = this.weapon.getState();
    const inventory = this.weapon.getInventory();
    const reload = this.weapon.getReloadProgress();
    const wave = this.wave.getState();

    const viewModel = createHudViewModel({
      health: this.player.health,
      maxHealth: PLAYER_CONFIG.health,
      magazineAmmo: weapon.magazineAmmo,
      reserveAmmo: weapon.reserveAmmo,
      isReloading: weapon.reloadRemainingMs !== null,
      reloadProgress: reload.normalized,
      waveNumber: wave.waveNumber,
      wavePhase: wave.phase,
      waveTimerMs: wave.timerMs,
      remainingToSpawn: wave.remainingToSpawn,
      aliveZombieCount: this.zombies.length,
      killCount: this.killCount,
      sessionPhase: this.sessionState.phase,
      gameTimeText: formatGameTime(this.gameTime),
      weaponSlots: inventory.slots.map((owned) => owned ? ({
        id: owned.definition.id,
        name: owned.definition.name,
        description: owned.definition.description,
        rarity: owned.definition.rarity,
        fireRateText: owned.definition.config.burstSize === 3
          ? `3-RND / ${owned.definition.config.fireIntervalMs}ms`
          : `SEMI / ${owned.definition.config.fireIntervalMs}ms`,
        recoil: owned.definition.recoil,
        magazineSize: owned.definition.config.magazineSize,
      }) : null),
      activeWeaponSlot: inventory.activeSlot,
    });
    this.hud?.update(viewModel);
  }

  private refreshInputMode(): void {
    const wasEnabled = this.mobileControlsEnabled;
    this.mobileControlsEnabled = shouldShowMobileControls(
      navigator.maxTouchPoints,
      this.coarsePointerQuery?.matches ?? window.matchMedia('(pointer: coarse)').matches,
    );
    const safeArea = this.readSafeArea();
    const pauseVisible = this.mobileControlsEnabled && isPlaying(this.sessionState);
    const uiLayout = this.responsiveUi?.apply({
      width: this.viewport.width,
      height: this.viewport.height,
      safeArea,
      mobileControls: this.mobileControlsEnabled,
    }, pauseVisible);
    this.mobileControls?.setInteractionVisible(
      isPlaying(this.sessionState)
        && this.mobileControlsEnabled
        && this.canOpenSupplyCrate(),
    );

    if (this.mobileControlsEnabled) {
      if (!wasEnabled) this.aimSource = 'mobile';
      this.mobileLayout = uiLayout?.mobileControlsLayout ?? undefined;
    } else {
      this.aimSource = 'mouse';
      this.mobileLayout = undefined;
      this.clearAimAssist();
      this.resetMobileInput();
    }
  }

  private resetMobileInput(): void {
    this.mobileOwnership = createMobilePointerOwnership();
    this.guardedMobilePointers.clear();
    this.resetPinchState();
    this.mobileMovement = { x: 0, y: 0 };
    this.playerInput = clearActiveInput(this.playerInput);
    this.mobileControls?.setJoystickPointer(null);
  }

  private gameplayKeys(): Array<Phaser.Input.Keyboard.Key | undefined> {
    return [
      ...Object.values(this.movementKeys ?? {}),
      this.reloadKey,
      this.pickupKey,
      ...(this.weaponSlotKeys ?? []),
      this.restartKey,
    ];
  }

  private pauseSceneManagers(): void {
    this.time.paused = true;
    this.tweens.pauseAll();
  }

  private resumeSceneManagers(): void {
    this.time.paused = false;
    this.tweens.resumeAll();
  }

  private readonly handleNativeKeyUp = (event: KeyboardEvent): void => {
    this.gameplayKeyStateGuard.releaseOnKeyUp(event.keyCode);
  };

  private readonly handleNativeKeyDown = (event: KeyboardEvent): void => {
    if (!this.pauseMenu?.isOpen()) return;
    const key = this.gameplayKeys().find((candidate) => (
      candidate?.keyCode === event.keyCode
    ));
    if (key) this.gameplayKeyStateGuard.suppressUntilKeyUp(key);
  };

  private clearActiveMobilePointers(): void {
    this.activeMobilePointers.clear();
    this.pinchEligiblePointers.clear();
    this.mobilePointerPositions.clear();
    this.guardedMobilePointers.clear();
    this.resetPinchState();
    this.resetMobileInput();
  }

  private cancelAllMobileInput(): void {
    this.clearActiveMobilePointers();
    if (!isPlaying(this.sessionState)) this.mobileRestartArmed = true;
    this.aimSource = 'none';
    this.clearAimAssist();
  }

  private refreshAimAssist(): Vector2 {
    const worldView = cameraWorldView(
      {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      },
      this.viewport,
      this.cameras.main.zoom,
    );
    const previousTargetId = this.aimTargetId;
    const result = resolveAimAssist({
      enabled: isPlaying(this.sessionState)
        && shouldApplyMobileAimAssist(this.mobileControlsEnabled, this.aimSource),
      playerPosition: { x: this.player.x, y: this.player.y },
      manualAimDirection: this.playerInput.manualAimDirection,
      viewDirection: this.viewDirection,
      currentTargetId: this.aimTargetId,
      targets: this.zombies.map((zombie) => ({
        id: zombie.id,
        position: { x: zombie.x, y: zombie.y },
        radius: zombie.hitRadius,
        health: zombie.health,
        active: zombie.active,
      })),
      worldView,
      hitscanRange: this.weapon.getDefinition().config.range,
      hitscanBlockers: this.activeHitscanBlockers(),
      config: MOBILE_AIM_ASSIST_CONFIG,
    });

    this.aimTargetId = result.targetId;
    if (result.targetId === null) {
      this.lockAcquiredManualDirection = null;
    } else if (result.targetId !== previousTargetId) {
      this.lockAcquiredManualDirection = { ...this.playerInput.manualAimDirection };
    }
    this.viewDirection = { ...result.finalAimDirection };
    this.finalAimDirection = result.finalAimDirection;
    this.player.setRotation(Math.atan2(
      this.finalAimDirection.y,
      this.finalAimDirection.x,
    ));
    this.updateAimAssistVisual();
    return { ...this.finalAimDirection };
  }

  private clearAimAssist(): void {
    this.aimTargetId = null;
    this.lockAcquiredManualDirection = null;
    this.viewDirection = { ...this.playerInput.manualAimDirection };
    this.finalAimDirection = { ...this.playerInput.manualAimDirection };
    this.aimAssistVisual?.hide();

    if (this.player) {
      this.player.setRotation(Math.atan2(
        this.finalAimDirection.y,
        this.finalAimDirection.x,
      ));
    }
  }

  private updateAimAssistVisual(): void {
    if (this.aimTargetId === null || this.aimSource !== 'mobile') {
      this.aimAssistVisual?.hide();
      return;
    }

    const target = this.zombies.find((zombie) => zombie.id === this.aimTargetId);

    if (!target || !target.active || target.health <= 0) {
      this.aimAssistVisual?.hide();
      return;
    }

    this.aimAssistVisual?.show({
      x: target.x,
      y: target.y,
      radius: target.hitRadius,
    });
  }

  private readonly handleNativeCancel = (): void => {
    this.cancelAllMobileInput();
  };

  private readonly handleWindowBlur = (): void => {
    this.gameplayKeyStateGuard.releaseAll();
    this.cancelAllMobileInput();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      this.gameplayKeyStateGuard.releaseAll();
      this.cancelAllMobileInput();
    }
  };

  private readonly handleInputModeChange = (): void => {
    this.cancelAllMobileInput();
    this.refreshInputMode();
  };

  private playPlayerHitEffects(count: number): void {
    for (let index = 0; index < count; index += 1) {
      this.effects?.playPlayerHit({
        position: { x: this.player.x, y: this.player.y },
        radius: this.player.hitRadius,
      });
    }
  }

  private updateCameraPosition(): void {
    const scroll = cameraScrollForPlayer(
      this.cameraFollowState.targetPosition,
      this.playArea,
      this.viewport,
      this.cameras.main.zoom,
    );
    this.cameras.main.setScroll(scroll.x, scroll.y);
  }

  private snapCameraToPlayer(): void {
    this.cameraFollowState = snapCameraFollow(this.player);
    this.updateCameraPosition();
  }

  private updateTimeBasedLighting(deltaMs = 0): void {
    if (!this.timeBasedLighting) return;

    const playerScreenPosition = cameraScreenPoint(
      this.player,
      {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      },
      this.viewport,
      this.cameras.main.zoom,
    );
    this.timeBasedLighting.update(
      darknessAlphaForTime(
        this.gameTime.minuteOfDay,
        TIME_BASED_LIGHTING_CONFIG.darknessKeyframes,
      ),
      playerScreenPosition.x,
      playerScreenPosition.y,
      this.finalAimDirection,
      deltaMs,
      this.cameras.main.zoom,
    );
  }

  private updateSupplyDropVisual(): void {
    if (!this.supplyDropVisual || !this.supplyDropActive) {
      this.mobileControls?.setInteractionVisible(false);
      return;
    }

    const snapshot = resolveSupplyDropSnapshot(
      this.supplyDropState,
      this.currentSupplyDropConfig,
    );
    const targetScreen = cameraScreenPoint(
      snapshot.target,
      {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      },
      this.viewport,
      this.cameras.main.zoom,
    );
    const planeScreen = cameraScreenPoint(
      snapshot.planePosition,
      {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      },
      this.viewport,
      this.cameras.main.zoom,
    );
    this.supplyDropVisual.update(
      snapshot,
      planeScreen,
      targetScreen,
      this.viewport,
      this.currentSupplyDropConfig.indicatorMargin,
    );
    this.mobileControls?.setInteractionVisible(
      isPlaying(this.sessionState)
        && this.mobileControlsEnabled
        && this.canOpenSupplyCrate(),
    );
  }

  private tryTriggerSupplyDrop(waveCleared: boolean): void {
    const ammo = totalAvailableAmmo(
      this.weapon.getInventory(),
      this.weapon.getAmmoReserves(),
    );
    const trigger = resolveSupplyTrigger(
      this.supplyTriggerState,
      {
        activeSupply: this.supplyDropActive,
        waveCleared,
        allAmmoDepleted: ammo.current === 0
          && !this.hasAvailableAmmoPickup()
          && !hasLoadedWeaponPickup(
            this.weaponPickups.map((pickup) => pickup.ownedWeapon),
          ),
        ammoRatio: ammo.capacity > 0 ? ammo.current / ammo.capacity : 0,
        healthRatio: this.player.health / PLAYER_CONFIG.health,
        randomValue: Math.random(),
      },
      SUPPLY_DROP_BALANCE,
    );
    if (!trigger.kind) {
      this.supplyTriggerState = trigger.state;
      return;
    }
    if (this.startSupplyDrop(trigger.kind)) {
      this.supplyTriggerState = trigger.state;
    }
  }

  private startSupplyDrop(kind: SupplyDropKind): boolean {
    const threatDirection = this.zombies.reduce(
      (direction, zombie) => ({
        x: direction.x + zombie.x - this.player.x,
        y: direction.y + zombie.y - this.player.y,
      }),
      { x: 0, y: 0 },
    );
    const target = selectSupplyDropLocation(
      kind,
      this.player,
      this.playArea,
      OBSTACLE_CONFIG,
      this.previousSupplyDropPosition,
      threatDirection,
      Math.floor(Math.random() * 0x1_0000_0000),
      {
        sampleCount: SUPPLY_DROP_BALANCE.locationSampleCount,
        clearance: SUPPLY_DROP_BALANCE.locationClearance,
        normalMinimumPlayerDistance: SUPPLY_DROP_BALANCE.normalMinimumPlayerDistance,
        normalMaximumPlayerDistance: SUPPLY_DROP_BALANCE.normalMaximumPlayerDistance,
        emergencyMinimumPlayerDistance: SUPPLY_DROP_BALANCE.emergencyMinimumPlayerDistance,
        previousDropMinimumDistance: SUPPLY_DROP_BALANCE.previousDropMinimumDistance,
      },
    );
    if (!target) return false;

    this.previousSupplyDropPosition = target;
    this.currentSupplyDropConfig = {
      ...SUPPLY_DROP_CONFIG,
      target,
      fallDurationMs: kind === 'emergency'
        ? EMERGENCY_SUPPLY_FALL_DURATION_MS
        : NORMAL_SUPPLY_FALL_DURATION_MS,
    };
    this.supplyDropState = createSupplyDropState(this.currentSupplyDropConfig.crateHealth);
    this.supplyDropKind = kind;
    this.supplyDropLootReleased = false;
    this.supplyDropActive = true;
    this.updateSupplyDropVisual();
    return true;
  }

  private canOpenSupplyCrate(): boolean {
    if (!this.supplyDropActive) return false;
    return canOpenSupplyDropCrate(
      resolveSupplyDropSnapshot(this.supplyDropState, this.currentSupplyDropConfig),
      this.player,
      this.currentSupplyDropConfig,
    );
  }

  private tryOpenSupplyCrate(): void {
    if (!this.canOpenSupplyCrate()) return;
    this.supplyDropState = openSupplyDropCrate(this.supplyDropState);
    this.releaseSupplyLoot();
  }

  private releaseSupplyLoot(): void {
    if (!this.supplyDropActive) return;
    const claim = claimSupplyLoot(this.supplyDropLootReleased);
    this.supplyDropLootReleased = claim.released;
    if (!claim.shouldDrop) return;
    const loot = selectSupplyLoot(
      this.supplyDropKind,
      this.wave.getState().waveNumber,
      this.player.health / PLAYER_CONFIG.health,
      Math.random(),
      Math.random(),
      {
        rifleUnlockWave: SUPPLY_DROP_BALANCE.rifleUnlockWave,
        rifleDropChance: SUPPLY_DROP_BALANCE.rifleDropChance,
        criticalHealthRatio: SUPPLY_DROP_BALANCE.criticalHealthRatio,
        normalMedicalChance: ITEM_BALANCE_CONFIG.normalMedicalChance,
        criticalHealthMedicalChanceBonus: (
          ITEM_BALANCE_CONFIG.criticalHealthMedicalChanceBonus
        ),
      },
    );
    const positions = spreadSupplyLootPositions(
      loot.length,
      this.currentSupplyDropConfig.target,
      this.playArea,
      OBSTACLE_CONFIG,
      Math.floor(Math.random() * 0x1_0000_0000),
      ITEM_BALANCE_CONFIG,
    );
    if (positions.length !== loot.length) {
      throw new Error('Supply loot placement could not preserve every selected item');
    }
    loot.forEach((item, index) => {
      const position = positions[index];
      if (item.type === 'weapon') {
        const definition = item.weaponId === 'burstRifle'
          ? BURST_RIFLE_WEAPON
          : PISTOL_WEAPON;
        this.createWeaponPickup(
          position.x,
          position.y,
          createOwnedWeapon(definition),
        );
      } else {
        this.itemPickups.push(new ItemPickup(
          this,
          position.x,
          position.y,
          item.kind,
        ));
      }
    });
    this.updateSupplyDropVisual();
    this.supplyDropActive = false;
  }

  private collectNearbyItems(): void {
    const nearby = this.itemPickups.filter((pickup) => (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        pickup.x,
        pickup.y,
      ) <= ITEM_BALANCE_CONFIG.pickupRadius
    ));
    if (nearby.length === 0) return;

    const collected: ItemPickup[] = [];
    for (const pickup of nearby) {
      if (!canCollectConsumable(
        pickup.kind,
        this.player.health,
        PLAYER_CONFIG.health,
        ITEM_BALANCE_CONFIG.medicalHealingAmount,
      )) {
        continue;
      }
      if (pickup.kind === 'pistolAmmo') {
        this.weapon.addReserveAmmo(
          'pistolAmmo',
          ITEM_BALANCE_CONFIG.pistolAmmoAmount,
        );
      } else if (pickup.kind === 'rifleAmmo') {
        this.weapon.addReserveAmmo(
          'rifleAmmo',
          ITEM_BALANCE_CONFIG.rifleAmmoAmount,
        );
      } else {
        this.player.health = addClamped(
          this.player.health,
          ITEM_BALANCE_CONFIG.medicalHealingAmount,
          PLAYER_CONFIG.health,
        );
      }
      collected.push(pickup);
      pickup.destroy();
    }
    if (collected.length === 0) return;

    const collectedSet = new Set(collected);
    this.itemPickups = this.itemPickups.filter((pickup) => !collectedSet.has(pickup));
    this.updateHud();
  }

  private hasAvailableAmmoPickup(): boolean {
    const ownedAmmoTypes = new Set(
      this.weapon.getInventory().slots.flatMap((owned) => (
        owned ? [owned.definition.ammoType] : []
      )),
    );
    return hasUsableAmmoPickup(
      this.itemPickups.map((pickup) => pickup.kind),
      ownedAmmoTypes,
    );
  }

  private revalidateSupplyCoordinates(): void {
    if (this.supplyDropActive) {
      const target = revalidatePickupPosition(
        this.currentSupplyDropConfig.target,
        this.playArea,
        OBSTACLE_CONFIG,
        SUPPLY_DROP_BALANCE.locationClearance,
      );
      this.currentSupplyDropConfig = {
        ...this.currentSupplyDropConfig,
        target,
      };
    }
    if (this.previousSupplyDropPosition) {
      this.previousSupplyDropPosition = revalidatePickupPosition(
        this.previousSupplyDropPosition,
        this.playArea,
        OBSTACLE_CONFIG,
        SUPPLY_DROP_BALANCE.locationClearance,
      );
    }
    for (const pickup of this.weaponPickups) {
      const position = revalidatePickupPosition(
        pickup,
        this.playArea,
        OBSTACLE_CONFIG,
        WEAPON_PICKUP_RADIUS,
      );
      pickup.setPosition(position.x, position.y);
    }
    for (const pickup of this.itemPickups) {
      const position = revalidatePickupPosition(
        pickup,
        this.playArea,
        OBSTACLE_CONFIG,
        ITEM_BALANCE_CONFIG.pickupRadius / 2,
      );
      pickup.setPosition(position.x, position.y);
    }
  }

  private activeSupplyCrateTarget(): {
    id: string;
    position: Vector2;
    width: number;
    height: number;
  } | null {
    if (!this.supplyDropActive) return null;
    const snapshot = resolveSupplyDropSnapshot(
      this.supplyDropState,
      this.currentSupplyDropConfig,
    );
    if (
      snapshot.crateDestroyed
      || snapshot.crateOpened
      || snapshot.phase !== 'landed'
    ) {
      return null;
    }

    return {
      id: SUPPLY_CRATE_TARGET_ID,
      position: { ...snapshot.cratePosition },
      width: this.currentSupplyDropConfig.crateSize.width,
      height: this.currentSupplyDropConfig.crateSize.height,
    };
  }

  private activeSupplyCrateObstacle(): {
    x: number;
    y: number;
    width: number;
    height: number;
    blocksHitscan: true;
  } | null {
    if (!this.supplyDropActive) return null;
    const snapshot = resolveSupplyDropSnapshot(
      this.supplyDropState,
      this.currentSupplyDropConfig,
    );
    const bounds = resolveSupplyDropCrateBounds(snapshot, this.currentSupplyDropConfig);
    if (!bounds) return null;

    return {
      ...bounds,
      blocksHitscan: true,
    };
  }

  private activeMovementObstacles(): readonly RectangleObstacle[] {
    const crate = this.activeSupplyCrateObstacle();
    return crate ? [...OBSTACLE_CONFIG, crate] : OBSTACLE_CONFIG;
  }

  private activeHitscanBlockers(): readonly HitscanBlocker[] {
    const crate = this.activeSupplyCrateObstacle();
    return crate ? [...OBSTACLE_CONFIG, crate] : OBSTACLE_CONFIG;
  }

  private readSafeArea(): SafeAreaInsets {
    const parent = this.game.canvas.parentElement ?? this.game.canvas;
    const style = window.getComputedStyle(parent);
    const read = (name: string): number => Number.parseFloat(style.getPropertyValue(name)) || 0;

    return {
      top: read('--safe-area-top'),
      right: read('--safe-area-right'),
      bottom: read('--safe-area-bottom'),
      left: read('--safe-area-left'),
    };
  }
}
