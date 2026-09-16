import { t } from '../systems/UserSettings';
import Phaser from 'phaser';

import { CAMERA_ZOOM_CONFIG } from '../config/cameraConfig';
import { Player } from '../entities/Player';
import { MELEE_MOTION } from '../config/meleeMotionConfig';

const DEBUG_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export class PlayerAppearanceDebugScene extends Phaser.Scene {
  private male!: Player;
  private female!: Player;
  private angleIndex = 0;
  private moving = false;
  private automaticAim = false;
  private automaticAimElapsedMs = 0;
  private persistentMuzzleReflection = false;
  private debugWeapon: 'pistol' | 'burstRifle' | 'policeBaton' = 'burstRifle';
  private motionElapsedMs = 0;
  private motionPlaying = true;
  private motionSpeed = 1;
  private motionSlider?: HTMLInputElement;
  private motionReadout?: HTMLOutputElement;
  private statusText!: Phaser.GameObjects.Text;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('PlayerAppearanceDebugScene');
  }

  create(): void {
    const debugParameters = new URLSearchParams(window.location.search);
    const requestedAngle = Number(debugParameters.get('debugAngle'));
    const requestedAngleIndex = DEBUG_ANGLES.indexOf(
      requestedAngle as (typeof DEBUG_ANGLES)[number],
    );
    if (requestedAngleIndex >= 0) this.angleIndex = requestedAngleIndex;
    this.moving = debugParameters.get('debugMoving') === '1';
    this.persistentMuzzleReflection = debugParameters.get('debugMuzzle') === '1';
    if (debugParameters.get('debugWeapon') === 'pistol') {
      this.debugWeapon = 'pistol';
    }
    if (debugParameters.get('debugWeapon') === 'policeBaton') {
      this.debugWeapon = 'policeBaton';
      this.createMotionControls();
    }

    this.cameras.main.setBackgroundColor(0x30383c);
    this.male = new Player(this, 0, 0, 'male-swat');
    this.female = new Player(this, 0, 0, 'female-swat');
    this.male.setWeaponVisual(this.debugWeapon);
    this.female.setWeaponVisual(this.debugWeapon);
    this.statusText = this.add.text(16, 16, '', {
      color: '#f3f5f6',
      fontFamily: 'monospace',
      fontSize: '14px',
      backgroundColor: '#111820cc',
      padding: { x: 10, y: 8 },
    }).setScrollFactor(0).setDepth(100);

    this.keys = this.input.keyboard?.addKeys({
      previous: Phaser.Input.Keyboard.KeyCodes.Q,
      next: Phaser.Input.Keyboard.KeyCodes.E,
      movement: Phaser.Input.Keyboard.KeyCodes.M,
      autoAim: Phaser.Input.Keyboard.KeyCodes.A,
      muzzle: Phaser.Input.Keyboard.KeyCodes.SPACE,
      recoil: Phaser.Input.Keyboard.KeyCodes.R,
      minimumZoom: Phaser.Input.Keyboard.KeyCodes.ONE,
      defaultZoom: Phaser.Input.Keyboard.KeyCodes.TWO,
      maximumZoom: Phaser.Input.Keyboard.KeyCodes.THREE,
      exit: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as Record<string, Phaser.Input.Keyboard.Key> | undefined;

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
    this.layout();
    this.applyAngle();
    const requestedZoom = Number(debugParameters.get('debugZoom'));
    const supportedZooms: readonly number[] = [
      CAMERA_ZOOM_CONFIG.min,
      CAMERA_ZOOM_CONFIG.initial,
      CAMERA_ZOOM_CONFIG.max,
    ];
    if (supportedZooms.includes(requestedZoom)) {
      this.cameras.main.setZoom(requestedZoom);
      this.layout();
    }
  }

  update(_time: number, deltaMs: number): void {
    this.handleInput(deltaMs);
    if (this.debugWeapon === 'policeBaton') {
      if (this.motionPlaying) {
        this.motionElapsedMs = (this.motionElapsedMs + deltaMs * this.motionSpeed)
          % MELEE_MOTION.durationMs;
      }
      this.male.setMeleeSwingElapsed(this.motionElapsedMs);
      this.female.setMeleeSwingElapsed(this.motionElapsedMs);
      if (this.motionSlider) this.motionSlider.value = String(this.motionElapsedMs);
      if (this.motionReadout) this.motionReadout.value = `${Math.round(this.motionElapsedMs)} / ${MELEE_MOTION.durationMs} ms`;
    }
    if (this.persistentMuzzleReflection) {
      this.male.triggerMuzzleReflection(false);
      this.female.triggerMuzzleReflection(false);
    }
    this.male.setReloadVisual(false, 0);
    this.female.setReloadVisual(false, 0);
    this.male.updateVisual(deltaMs, this.moving);
    this.female.updateVisual(deltaMs, this.moving);
    this.updateStatus();
  }

  private createMotionControls(): void {
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:1000;padding:12px;background:#111e;color:white;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font:14px sans-serif';
    const play = document.createElement('button');
    play.textContent = t('Play / Pause');
    play.onclick = () => { this.motionPlaying = !this.motionPlaying; };
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0'; slider.max = String(MELEE_MOTION.durationMs); slider.step = '1';
    slider.setAttribute('aria-label', t('Attack motion time'));
    slider.style.flex = '1';
    slider.oninput = () => { this.motionPlaying = false; this.motionElapsedMs = Number(slider.value); };
    const speed = document.createElement('select');
    speed.setAttribute('aria-label', t('Playback speed'));
    for (const value of [0.1, 0.25, 0.5, 1]) {
      const option = document.createElement('option'); option.value = String(value); option.textContent = t('{speed}×', { speed: value }); speed.append(option);
    }
    speed.value = '1'; speed.onchange = () => { this.motionSpeed = Number(speed.value); };
    this.motionReadout = document.createElement('output');
    this.motionSlider = slider;
    panel.append(play, slider, speed, this.motionReadout);
    document.body.append(panel);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      panel.remove(); this.motionSlider = undefined; this.motionReadout = undefined;
    });
  }

  private handleInput(deltaMs: number): void {
    if (!this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.previous)) this.stepAngle(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.next)) this.stepAngle(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.movement)) this.moving = !this.moving;
    if (Phaser.Input.Keyboard.JustDown(this.keys.autoAim)) {
      this.automaticAim = !this.automaticAim;
      this.automaticAimElapsedMs = 0;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.muzzle)) {
      this.male.triggerMuzzleReflection();
      this.female.triggerMuzzleReflection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.recoil)) {
      this.male.triggerWeaponRecoil(7);
      this.female.triggerWeaponRecoil(7);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.minimumZoom)) {
      this.cameras.main.setZoom(CAMERA_ZOOM_CONFIG.min);
      this.layout();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.defaultZoom)) {
      this.cameras.main.setZoom(CAMERA_ZOOM_CONFIG.initial);
      this.layout();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.maximumZoom)) {
      this.cameras.main.setZoom(CAMERA_ZOOM_CONFIG.max);
      this.layout();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.exit)) {
      this.scene.start('MainMenuScene');
    }

    if (this.automaticAim) {
      this.automaticAimElapsedMs += deltaMs;
      if (this.automaticAimElapsedMs >= 700) {
        this.automaticAimElapsedMs %= 700;
        this.stepAngle(1);
      }
    }
  }

  private stepAngle(offset: number): void {
    this.angleIndex = Phaser.Math.Wrap(
      this.angleIndex + offset,
      0,
      DEBUG_ANGLES.length,
    );
    this.applyAngle();
  }

  private applyAngle(): void {
    const radians = Phaser.Math.DegToRad(DEBUG_ANGLES[this.angleIndex]);
    this.male.setRotation(radians);
    this.female.setRotation(radians);
  }

  private layout(): void {
    const zoom = this.cameras.main.zoom;
    const worldCenterX = this.scale.width / 2;
    const worldCenterY = this.scale.height / 2;
    const spacing = Math.min(150, this.scale.width / zoom * 0.28);
    this.male.setPosition(worldCenterX - spacing, worldCenterY);
    this.female.setPosition(worldCenterX + spacing, worldCenterY);
    this.statusText
      .setScale(1 / zoom)
      .setPosition(
        worldCenterX + (16 - worldCenterX) / zoom,
        worldCenterY + (16 - worldCenterY) / zoom,
      );
  }

  private updateStatus(): void {
    this.statusText.setText([
      t('PLAYER APPEARANCE DEBUG  angle {angle}°', { angle: DEBUG_ANGLES[this.angleIndex] }),
      t('state {state}  auto aim {auto}  zoom {zoom}', { state: this.moving ? t('MOVING') : t('IDLE'), auto: this.automaticAim ? t('ON') : t('OFF'), zoom: this.cameras.main.zoom.toFixed(2) }),
      t('Q/E direction  M movement  A auto aim  SPACE muzzle  R recoil'),
      t('1 min zoom  2 default zoom  3 max zoom  ESC menu'),
      t('male-swat                              female-swat'),
    ]);
  }
}
