import Phaser from 'phaser';

import { MOBILE_AIM_ASSIST_CONFIG } from '../config/aimAssistConfig';
import { FOG_OF_WAR_CONFIG } from '../config/fogConfig';
import { MVP_CONFIG } from '../config/mvpConfig';
import { OBSTACLE_CONFIG } from '../config/obstacleConfig';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { BASIC_WEAPON_CONFIG } from '../config/weaponConfig';
import { WAVE_CONFIG } from '../config/waveConfig';
import { ZOMBIE_CONFIG } from '../config/zombieConfig';
import { Player, PLAYER_RADIUS, PLAYER_SPEED } from '../entities/Player';
import { Obstacle } from '../entities/Obstacle';
import { Zombie } from '../entities/Zombie';
import { AimAssistVisual } from '../effects/AimAssistVisual';
import { CombatEffects } from '../effects/CombatEffects';
import { FogOfWarEffect } from '../effects/FogOfWarEffect';
import { WorldBackdrop } from '../effects/WorldBackdrop';
import {
  resolveAimAssist,
  shouldApplyMobileAimAssist,
  type AimSource,
} from '../logic/aimAssist';
import { isPrimaryFireInput } from '../logic/fireInput';
import { isPositionVisible } from '../logic/fogOfWar';
import { moveCircleWithObstacles } from '../logic/obstacleCollision';
import { cameraScrollForPlayer, createWorldSize, type Size } from '../logic/camera';
import { createHudViewModel, type SafeAreaInsets } from '../logic/hud';
import { resolveHitscan, type Vector2 } from '../logic/hitscan';
import { shouldAutoReload } from '../logic/weapon';
import {
  claimMobilePointer,
  canRestartWithMobileTouch,
  classifyMobilePointer,
  createMobileControlLayout,
  createMobilePointerOwnership,
  didViewportOrientationChange,
  getViewportOrientation,
  joystickMovement,
  releaseMobilePointer,
  roleForPointer,
  shouldShowMobileControls,
  type MobileControlLayout,
  type MobilePointerOwnership,
  type ViewportOrientation,
} from '../logic/mobileInput';
import {
  constrainToBounds,
  moveToward,
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
import { HudSystem } from '../systems/HudSystem';
import { MobileControls } from '../systems/MobileControls';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { WeaponSystem } from '../systems/WeaponSystem';

type MovementKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private movementKeys?: MovementKeys;
  private reloadKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private fogToggleKey?: Phaser.Input.Keyboard.Key;
  private playerInput: PlayerInputSnapshot = createPlayerInputState();
  private finalAimDirection: Vector2 = { x: 1, y: 0 };
  private aimSource: AimSource = 'none';
  private aimTargetId: string | null = null;
  private mobileMovement = { x: 0, y: 0 };
  private mobileOwnership: MobilePointerOwnership = createMobilePointerOwnership();
  private mobileLayout?: MobileControlLayout;
  private mobileControlsEnabled = false;
  private mobileControls?: MobileControls;
  private coarsePointerQuery?: MediaQueryList;
  private viewportOrientation?: ViewportOrientation;
  private readonly activeMobilePointers = new Set<number>();
  private mobileRestartArmed = true;
  private zombies: Zombie[] = [];
  private sessionState: SessionState = createSessionState();
  private playArea: Omit<MovementBounds, 'padding'> = { width: 0, height: 0 };
  private viewport: Size = { width: 0, height: 0 };
  private readonly damage = new DamageSystem();
  private spawn!: SpawnSystem;
  private wave!: WaveSystem;
  private weapon!: WeaponSystem;
  private hud?: HudSystem;
  private effects?: CombatEffects;
  private aimAssistVisual?: AimAssistVisual;
  private worldBackdrop?: WorldBackdrop;
  private fogOfWar?: FogOfWarEffect;
  private fogEnabled: boolean = FOG_OF_WAR_CONFIG.initiallyEnabled;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.sessionState = createSessionState();
    this.playerInput = createPlayerInputState();
    this.finalAimDirection = { ...this.playerInput.manualAimDirection };
    this.aimSource = 'none';
    this.aimTargetId = null;
    this.mobileControlsEnabled = false;
    this.mobileMovement = { x: 0, y: 0 };
    this.mobileOwnership = createMobilePointerOwnership();
    this.activeMobilePointers.clear();
    this.mobileRestartArmed = true;
    this.fogEnabled = FOG_OF_WAR_CONFIG.initiallyEnabled;
    this.spawn = new SpawnSystem();
    this.wave = new WaveSystem(WAVE_CONFIG);
    this.weapon = new WeaponSystem(BASIC_WEAPON_CONFIG);
    this.viewport = { width: this.scale.width, height: this.scale.height };
    this.playArea = createWorldSize(MVP_CONFIG.map, this.viewport);
    this.worldBackdrop = new WorldBackdrop(this);
    this.worldBackdrop.resize(this.playArea.width, this.playArea.height, MVP_CONFIG.map.gridSize);
    for (const obstacle of OBSTACLE_CONFIG) {
      new Obstacle(this, obstacle);
    }
    this.player = new Player(
      this,
      MVP_CONFIG.player.spawn.x,
      MVP_CONFIG.player.spawn.y,
    );
    this.zombies = [];
    this.resizePlayArea(this.scale.gameSize);
    this.hud = new HudSystem(this);
    this.effects = new CombatEffects(this);
    this.aimAssistVisual = new AimAssistVisual(this);
    this.fogOfWar = new FogOfWarEffect(
      this,
      FOG_OF_WAR_CONFIG,
      FOG_OF_WAR_CONFIG.darknessAlpha,
    );
    this.fogOfWar.resize(this.viewport.width, this.viewport.height);
    this.fogOfWar.setEnabled(this.fogEnabled);
    this.mobileControls = new MobileControls(this);
    this.mobileControls.setFogEnabled(this.fogEnabled);
    this.coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    this.refreshInputMode();
    this.resizeHud();
    this.updateHud();

    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
    this.reloadKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.fogToggleKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizePlayArea, this);
    this.coarsePointerQuery.addEventListener('change', this.handleInputModeChange);
    this.game.canvas.addEventListener('pointercancel', this.handleNativeCancel);
    this.game.canvas.addEventListener('touchcancel', this.handleNativeCancel);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cancelAllMobileInput();
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizePlayArea, this);
      this.coarsePointerQuery?.removeEventListener('change', this.handleInputModeChange);
      this.game.canvas.removeEventListener('pointercancel', this.handleNativeCancel);
      this.game.canvas.removeEventListener('touchcancel', this.handleNativeCancel);
      window.removeEventListener('blur', this.handleWindowBlur);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.hud?.destroy();
      this.hud = undefined;
      this.effects?.destroy();
      this.effects = undefined;
      this.aimAssistVisual?.destroy();
      this.aimAssistVisual = undefined;
      this.worldBackdrop?.destroy();
      this.worldBackdrop = undefined;
      this.fogOfWar?.destroy();
      this.fogOfWar = undefined;
      this.mobileControls?.destroy();
      this.mobileControls = undefined;
    });
  }

  update(_time: number, deltaMs: number): void {
    if (!isPlaying(this.sessionState)) {
      this.clearAimAssist();
      this.resetMobileInput();
      this.updateHud();
      if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.restartSession();
      }
      return;
    }

    const playerStart = { x: this.player.x, y: this.player.y };

    this.weapon.update(deltaMs);

    if (this.fogToggleKey && Phaser.Input.Keyboard.JustDown(this.fogToggleKey)) {
      this.toggleFogOfWar();
    }

    if (this.reloadKey && Phaser.Input.Keyboard.JustDown(this.reloadKey)) {
      this.playerInput = requestReload(this.playerInput);
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
      this.weapon.reload();
    }
    this.startMobileAutoReloadIfNeeded();

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
    const nextPosition = moveCircleWithObstacles(
      this.player,
      desiredPosition,
      PLAYER_RADIUS,
      OBSTACLE_CONFIG,
      {
        width: this.playArea.width,
        height: this.playArea.height,
        padding: PLAYER_RADIUS,
      },
    );
    this.player.setPosition(nextPosition.x, nextPosition.y);
    this.updateCameraPosition();

    const zombieStarts = this.zombies.map((zombie) => ({ x: zombie.x, y: zombie.y }));

    for (const zombie of this.zombies) {
      const desiredZombiePosition = moveToward(
        zombie,
        this.player,
        ZOMBIE_CONFIG.speed,
        deltaMs,
      );
      const nextPosition = moveCircleWithObstacles(
        zombie,
        desiredZombiePosition,
        zombie.hitRadius,
        OBSTACLE_CONFIG,
        {
          width: this.playArea.width,
          height: this.playArea.height,
          padding: zombie.hitRadius,
        },
      );
      zombie.setPosition(nextPosition.x, nextPosition.y);
    }

    const contactDamage = this.damage.resolveZombieContacts(
      this.player,
      playerStart,
      this.zombies,
      zombieStarts,
      deltaMs,
      PLAYER_CONFIG.invulnerabilityMs,
      ZOMBIE_CONFIG.contactDamage,
      ZOMBIE_CONFIG.attackIntervalMs,
    );

    if (contactDamage.died) {
      const transition = transitionToGameOver(this.sessionState);
      this.sessionState = transition.state;

      if (transition.changed) {
        this.events.emit('player-died');
      }

      this.mobileRestartArmed = this.activeMobilePointers.size === 0;
      this.clearAimAssist();
      this.resetMobileInput();
      this.updateHud();
      this.playPlayerHitEffects(contactDamage.damageEvents.length);
      return;
    }

    this.refreshAimAssist();

    const spawnCount = this.wave.update(deltaMs, this.zombies.length);

    for (let index = 0; index < spawnCount; index += 1) {
      this.zombies.push(this.spawn.spawn(this, this.playArea, this.player));
    }

    this.updateHud();
    this.playPlayerHitEffects(contactDamage.damageEvents.length);
  }

  private resolveFireRequest(): void {
    const fire = consumeFireRequest(this.playerInput);
    this.playerInput = fire.state;

    if (!fire.requested || !isPlaying(this.sessionState)) {
      return;
    }

    const shotDirection = this.refreshAimAssist();

    if (!this.weapon.fire()) {
      this.startMobileAutoReloadIfNeeded();
      this.updateHud();
      return;
    }

    const result = resolveHitscan(
      { x: this.player.x, y: this.player.y },
      shotDirection,
      BASIC_WEAPON_CONFIG.range,
      this.zombies.map((zombie) => ({
        id: zombie.id,
        position: { x: zombie.x, y: zombie.y },
        radius: zombie.hitRadius,
      })),
      BASIC_WEAPON_CONFIG.maxTargets,
    );
    const impactEvents: Array<{ position: Vector2; radius: number; died: boolean }> = [];

    const deadIds = new Set<string>();

    for (const hit of result.hits) {
      const zombie = this.zombies.find((candidate) => candidate.id === hit.targetId);

      if (zombie) {
        const damage = this.damage.apply(zombie, BASIC_WEAPON_CONFIG.damage);
        impactEvents.push({
          position: { x: zombie.x, y: zombie.y },
          radius: zombie.hitRadius,
          died: damage.died,
        });

        if (damage.died) {
          zombie.destroy();
          deadIds.add(zombie.id);
        }
      }
    }

    if (deadIds.size > 0) {
      this.zombies = this.zombies.filter((zombie) => !deadIds.has(zombie.id));

      if (this.aimTargetId !== null && deadIds.has(this.aimTargetId)) {
        this.aimTargetId = null;
        this.aimAssistVisual?.hide();
      }
    }

    this.effects?.playShot({
      origin: { x: this.player.x, y: this.player.y },
      endPoint: result.endPoint,
    });
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
      this.weapon.reload();
    }
  }

  private updateAimDirection(pointer: Phaser.Input.Pointer, source: AimSource): void {
    if (this.aimSource !== source) {
      this.aimSource = source;
      this.clearAimAssist();
    }

    this.playerInput = withAimCandidate(
      this.playerInput,
      { x: pointer.worldX - this.player.x, y: pointer.worldY - this.player.y },
    );
    this.refreshAimAssist();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
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

    if (!pointer.wasTouch) {
      if (!isPrimaryFireInput(pointer)) return;
      this.updateAimDirection(pointer, 'mouse');
      this.playerInput = requestFire(this.playerInput);
      this.resolveFireRequest();
      return;
    }

    if (!this.mobileControlsEnabled || !this.mobileLayout) return;

    const pointerId = pointer.id;
    this.activeMobilePointers.add(pointerId);
    const role = classifyMobilePointer({ x: pointer.x, y: pointer.y }, this.mobileLayout);
    this.mobileOwnership = claimMobilePointer(this.mobileOwnership, pointerId, role);

    if (roleForPointer(this.mobileOwnership, pointerId) !== role) return;

    if (role === 'movement') {
      this.updateMobileMovement(pointer);
    } else if (role === 'aim') {
      this.updateAimDirection(pointer, 'mobile');
    } else if (role === 'fire') {
      this.playerInput = requestFire(this.playerInput);
      this.resolveFireRequest();
    } else if (role === 'reload') {
      this.playerInput = requestReload(this.playerInput);
    } else if (role === 'fog') {
      this.toggleFogOfWar();
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!isPlaying(this.sessionState)) return;

    if (!pointer.wasTouch) {
      this.updateAimDirection(pointer, 'mouse');
      return;
    }

    const role = roleForPointer(this.mobileOwnership, pointer.id);
    if (role === 'movement') this.updateMobileMovement(pointer);
    if (role === 'aim') this.updateAimDirection(pointer, 'mobile');
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      this.activeMobilePointers.delete(pointer.id);
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
    this.playArea = createWorldSize(MVP_CONFIG.map, this.viewport);
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.cameras.main.setBounds(0, 0, this.playArea.width, this.playArea.height);
    this.fogOfWar?.resize(this.viewport.width, this.viewport.height);
    this.worldBackdrop?.resize(this.playArea.width, this.playArea.height, MVP_CONFIG.map.gridSize);

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

    this.resizeHud();
    this.refreshInputMode();
  }

  private updateHud(): void {
    const weapon = this.weapon.getState();
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
      aliveZombieCount: this.zombies.length,
      sessionPhase: this.sessionState.phase,
    });
    this.hud?.update(viewModel);
  }

  private resizeHud(): void {
    this.hud?.resize(this.viewport.width, this.viewport.height, this.readSafeArea());
  }

  private refreshInputMode(): void {
    const wasEnabled = this.mobileControlsEnabled;
    this.mobileControlsEnabled = shouldShowMobileControls(
      navigator.maxTouchPoints,
      this.coarsePointerQuery?.matches ?? window.matchMedia('(pointer: coarse)').matches,
    );
    this.mobileControls?.setVisible(this.mobileControlsEnabled);

    if (this.mobileControlsEnabled) {
      if (!wasEnabled) this.aimSource = 'mobile';
      this.mobileLayout = createMobileControlLayout(
        this.viewport.width,
        this.viewport.height,
        this.readSafeArea(),
      );
      this.mobileControls?.setLayout(this.mobileLayout);
    } else {
      this.aimSource = 'mouse';
      this.mobileLayout = undefined;
      this.clearAimAssist();
      this.resetMobileInput();
    }
  }

  private resetMobileInput(): void {
    this.mobileOwnership = createMobilePointerOwnership();
    this.mobileMovement = { x: 0, y: 0 };
    this.playerInput = clearActiveInput(this.playerInput);
    this.mobileControls?.setJoystickPointer(null);
  }

  private cancelAllMobileInput(): void {
    this.activeMobilePointers.clear();
    if (!isPlaying(this.sessionState)) this.mobileRestartArmed = true;
    this.aimSource = 'none';
    this.clearAimAssist();
    this.resetMobileInput();
  }

  private refreshAimAssist(): Vector2 {
    const cameraScroll = cameraScrollForPlayer(this.player, this.playArea, this.viewport);
    const result = resolveAimAssist({
      enabled: isPlaying(this.sessionState)
        && shouldApplyMobileAimAssist(this.mobileControlsEnabled, this.aimSource),
      playerPosition: { x: this.player.x, y: this.player.y },
      manualAimDirection: this.playerInput.manualAimDirection,
      currentTargetId: this.aimTargetId,
      targets: this.zombies.filter((zombie) => (
        !this.fogEnabled || isPositionVisible(
          this.player,
          this.playerInput.manualAimDirection,
          zombie,
          FOG_OF_WAR_CONFIG,
        )
      )).map((zombie) => ({
        id: zombie.id,
        position: { x: zombie.x, y: zombie.y },
        radius: zombie.hitRadius,
        health: zombie.health,
        active: zombie.active,
      })),
      worldView: {
        x: cameraScroll.x,
        y: cameraScroll.y,
        width: this.viewport.width,
        height: this.viewport.height,
      },
      hitscanRange: BASIC_WEAPON_CONFIG.range,
      config: MOBILE_AIM_ASSIST_CONFIG,
    });

    this.aimTargetId = result.targetId;
    this.finalAimDirection = result.finalAimDirection;
    this.player.setRotation(Math.atan2(
      this.finalAimDirection.y,
      this.finalAimDirection.x,
    ));
    this.updateAimAssistVisual();
    this.updateFogOfWar();
    return { ...this.finalAimDirection };
  }

  private clearAimAssist(): void {
    this.aimTargetId = null;
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
    this.cancelAllMobileInput();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
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
    const scroll = cameraScrollForPlayer(this.player, this.playArea, this.viewport);
    this.cameras.main.setScroll(scroll.x, scroll.y);
  }

  private toggleFogOfWar(): void {
    this.fogEnabled = !this.fogEnabled;
    this.fogOfWar?.setEnabled(this.fogEnabled);
    this.mobileControls?.setFogEnabled(this.fogEnabled);
    this.clearAimAssist();
    this.refreshAimAssist();
  }

  private updateFogOfWar(): void {
    if (!this.fogEnabled) return;
    const scroll = cameraScrollForPlayer(this.player, this.playArea, this.viewport);
    this.fogOfWar?.update(
      { x: this.player.x - scroll.x, y: this.player.y - scroll.y },
      this.playerInput.manualAimDirection,
    );
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
