import Phaser from 'phaser';
import { SupplyDropVisual } from '../effects/SupplyDropVisual';
import { CombatEffects } from '../effects/CombatEffects';
import { SUPPLY_DROP_CONFIG } from '../config/supplyDropConfig';
import { resolveSupplyDropSnapshot } from '../logic/supplyDrop';
import { DEBUG_CONSUMABLES, DEBUG_FILE_ASSETS } from '../config/assetDebugCatalog';
import { WEAPON_DEFINITIONS } from '../config/weaponConfig';
import { URBAN_MAP_CONFIG } from '../config/urbanMapConfig';
import { ItemPickup } from '../entities/ItemPickup';
import { WeaponPickup } from '../entities/WeaponPickup';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { BuildingVisual } from '../effects/BuildingVisual';
import { WorldBackdrop } from '../effects/WorldBackdrop';
import { createOwnedWeapon, type WeaponId } from '../logic/weapon';
import { createZombieAppearance } from '../logic/zombieAppearance';
import { weaponTooltipStats, weaponTooltipStatLines } from '../logic/hud';
import { MELEE_MOTION } from '../config/meleeMotionConfig';

type Category = 'Items' | 'Images' | 'Sounds' | 'Models & motion';
interface Entry {
  id: string;
  name: string;
  category: Category;
  description?: () => string;
  url?: string;
  preview?: () => void;
}

/** Isolated viewer: uses production visuals without starting a game session. */
export class AssetDebugScene extends Phaser.Scene {
  private panel?: HTMLElement;
  private results?: HTMLElement;
  private details?: HTMLElement;
  private entries: Entry[] = [];
  private category = 'All';
  private query = '';
  private player?: Player;
  private zombie?: Zombie;
  private item?: ItemPickup;
  private weaponPickup?: WeaponPickup;
  private backdrop?: WorldBackdrop;
  private supply?: SupplyDropVisual;
  private effects?: CombatEffects;
  private supplyElapsed = 0;
  private reloading = false;
  private previewObjects: Phaser.GameObjects.GameObject[] = [];
  private playing = true;
  private moving = false;
  private elapsed = 0;
  private speed = 1;
  private angle = 0;
  private weaponId: WeaponId = 'pistol';
  private selected?: Entry;

  constructor() { super('AssetDebugScene'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#30383c');
    this.entries = this.createEntries();
    this.createPanel();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.refreshPreview, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.refreshPreview, this);
      this.clearPreview();
      this.panel?.remove();
    });
  }

  private createEntries(): Entry[] {
    const entries: Entry[] = Object.values(WEAPON_DEFINITIONS).map((weapon) => ({
      id: weapon.id, name: weapon.name, category: 'Items',
      description: () => [weapon.description, weapon.rarity.toUpperCase(),
        `Damage ${weapon.config.damage}`,
        `Range ${weapon.config.range}`,
        ...weaponTooltipStatLines(weaponTooltipStats(weapon)),
      ].join('\n'),
      preview: () => {
        const texture = { pistol: 'weapon-pistol', burstRifle: 'weapon-rifle', doubleBarrelShotgun: 'weapon-shotgun', policeBaton: 'weapon-police-baton' }[weapon.id];
        this.weaponPickup = new WeaponPickup(this, this.scale.width / 2, this.previewY(), 0, createOwnedWeapon(weapon), texture).setScale(2);
      },
    }));
    for (const kind of Object.keys(DEBUG_CONSUMABLES) as Array<keyof typeof DEBUG_CONSUMABLES>) {
      const item = DEBUG_CONSUMABLES[kind];
      entries.push({ id: kind, name: item.name, category: 'Items',
        description: () => `${kind === 'medical' ? 'Healing' : 'Ammo'} ${item.amount}`,
        preview: () => { this.item = new ItemPickup(this, this.scale.width / 2, this.previewY(), kind).setScale(2); },
      });
    }
    for (const [path, url] of Object.entries(DEBUG_FILE_ASSETS)) {
      entries.push({ id: path, name: path.replace('../assets/', ''), url,
        category: /\.(mp3|wav|ogg)$/.test(path) ? 'Sounds' : 'Images' });
    }
    for (const appearance of ['male-swat', 'female-swat'] as const) {
      entries.push({ id: appearance, name: appearance === 'male-swat' ? 'MALE SURVIVOR' : 'FEMALE SURVIVOR', category: 'Models & motion',
        preview: () => {
          this.player = new Player(this, this.scale.width / 2, this.previewY(), appearance).setScale(2);
          this.player.setWeaponVisual(this.weaponId);
        },
      });
    }
    for (const kind of ['normal', 'fast'] as const) {
      for (let variant = 0; variant < 12; variant++) {
        entries.push({ id: `${kind}-${variant}`, name: `${(kind === 'normal' ? 'Zombie' : 'Fast zombie')} ${variant + 1}`, category: 'Models & motion',
          preview: () => { this.zombie = new Zombie(this, `${kind}-${variant}`, this.scale.width / 2, this.previewY(), createZombieAppearance(0xc0ffee, variant), undefined, kind).setScale(2); },
        });
      }
    }
    entries.push({ id: 'supply', name: 'Supply drop', category: 'Models & motion', preview: () => {
      this.supplyElapsed = 0; this.supply = new SupplyDropVisual(this);
    } });
    for (const name of ['Shot', 'Zombie hit', 'Zombie death', 'Player hit', 'Crate hit', 'Crate destroyed', 'Melee contact']) {
      entries.push({ id: `effect-${name}`, name, category: 'Models & motion', preview: () => {
        this.effects = new CombatEffects(this);
        const position = { x: this.scale.width / 2, y: this.previewY() };
        const impact = { position, radius: 20, direction: { x: 1, y: 0 } };
        const play = () => {
          switch (name) {
            case 'Shot': this.effects?.playShot({ origin: position, endPoint: { x: position.x + 100, y: position.y } }); break;
            case 'Zombie hit': this.effects?.playZombieHit(impact); break;
            case 'Zombie death': this.effects?.playZombieDeath(impact); break;
            case 'Player hit': this.effects?.playPlayerHit(impact); break;
            case 'Crate hit': this.effects?.playSupplyCrateHit(position, false); break;
            case 'Crate destroyed': this.effects?.playSupplyCrateHit(position, true); break;
            case 'Melee contact': this.effects?.playMeleeContact(position, impact.direction); break;
          }
        };
        play(); this.details?.append(this.button(name, play));
      } });
    }
    URBAN_MAP_CONFIG.obstacles.forEach((config, index) => {
      entries.push({ id: `building-${index}`, name: `${('Building')} ${index + 1}`, category: 'Models & motion',
        preview: () => {
          const scale = Math.min(1, this.scale.width * 0.75 / config.width, this.scale.height * 0.32 / config.height);
          new BuildingVisual(this, { ...config, x: this.scale.width / 2 - config.width * scale / 2, y: this.previewY() - config.height * scale / 2 }).setScale(scale);
        },
      });
    });
    entries.push({ id: 'world', name: 'World', category: 'Models & motion', preview: () => {
      this.backdrop = new WorldBackdrop(this);
      this.backdrop.resize(URBAN_MAP_CONFIG.width, URBAN_MAP_CONFIG.height, URBAN_MAP_CONFIG.gridSize,
        URBAN_MAP_CONFIG.roads, URBAN_MAP_CONFIG.pavedAreas, URBAN_MAP_CONFIG.parkingSlotSpacing, URBAN_MAP_CONFIG.sidewalkWidth);
      for (const config of URBAN_MAP_CONFIG.obstacles) new BuildingVisual(this, config);
      this.cameras.main.setViewport(0, this.scale.height * 0.56, this.scale.width, this.scale.height * 0.44);
      this.cameras.main.setZoom(Math.min(this.scale.width / URBAN_MAP_CONFIG.width, this.scale.height * 0.44 / URBAN_MAP_CONFIG.height));
      this.cameras.main.centerOn(URBAN_MAP_CONFIG.width / 2, URBAN_MAP_CONFIG.height / 2);
    } });
    return entries;
  }

  private createPanel(): void {
    this.panel?.remove();
    const panel = document.createElement('section');
    panel.id = 'asset-debug';
    panel.style.cssText = 'position:fixed;inset:0 0 auto;height:56dvh;box-sizing:border-box;z-index:10;overflow:auto;background:#151a20;color:#eee;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) 12px max(12px,env(safe-area-inset-left));font:14px Arial,sans-serif';
    this.panel = panel;
    const heading = document.createElement('h1'); heading.textContent = 'ASSET DEBUG'; heading.style.margin = '0 0 8px';
    const toolbar = document.createElement('div'); toolbar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
    const exit = this.button('MAIN MENU', () => {
      const url = new URL(location.href); url.searchParams.delete('debug'); history.replaceState({}, '', url);
      this.scene.start('MainMenuScene');
    });
    const filter = this.select(['All', 'Items', 'Images', 'Sounds', 'Models & motion'], this.category, (value) => { this.category = value; this.renderResults(); });
    filter.setAttribute('aria-label', 'Category');
    const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Search'; search.setAttribute('aria-label', 'Search'); search.value = this.query;
    search.oninput = () => { this.query = search.value; this.renderResults(); };
    toolbar.append(exit, filter, search);
    this.results = document.createElement('div'); this.results.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;max-height:15vh;overflow:auto';
    this.details = document.createElement('div');
    panel.append(heading, toolbar, this.results, this.details); document.body.append(panel);
    this.renderResults();
    if (this.selected) this.selectEntry(this.entries.find((entry) => entry.id === this.selected?.id) ?? this.selected);
  }

  private renderResults(): void {
    this.results?.replaceChildren();
    const query = this.query.toLocaleLowerCase();
    const filtered = this.entries.filter((entry) => (this.category === 'All' || this.category === entry.category)
      && `${entry.id} ${entry.name}`.toLocaleLowerCase().includes(query));
    for (const entry of filtered) this.results?.append(this.button(entry.name, () => this.selectEntry(entry)));
    if (!filtered.length && this.results) this.results.textContent = 'No results';
  }

  private selectEntry(entry: Entry): void {
    this.selected = entry;
    this.details?.replaceChildren();
    const title = document.createElement('h2'); title.textContent = entry.name; title.style.margin = '8px 0';
    const description = document.createElement('p'); description.style.whiteSpace = 'pre-line'; description.textContent = entry.description?.() ?? entry.id;
    this.details?.append(title, description);
    if (entry.url) {
      if (entry.category === 'Sounds') {
        const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'none'; audio.src = entry.url; this.details?.append(audio);
      } else {
        const img = document.createElement('img'); img.src = entry.url; img.alt = entry.name; img.style.cssText = 'max-width:100%;max-height:22vh;object-fit:contain;background:repeating-conic-gradient(#444 0% 25%,#777 0% 50%) 0/20px 20px'; this.details?.append(img);
      }
    }
    this.refreshPreview();
    if (this.player || this.zombie) this.addMotionControls();
  }

  private addMotionControls(): void {
    const controls = document.createElement('div'); controls.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
    const direction = this.select(['0','45','90','135','180','225','270','315'], String(this.angle), (value) => { this.angle = Number(value); });
    direction.setAttribute('aria-label', 'Direction');
    const speed = this.select(['0.1','0.25','0.5','1'], String(this.speed), (value) => { this.speed = Number(value); }, (value) => `${value}×`);
    speed.setAttribute('aria-label', 'Playback speed');
    controls.append(this.button('Play / Pause', () => { this.playing = !this.playing; }),
      this.button('Movement', () => { this.moving = !this.moving; }), direction, speed);
    if (this.player) {
      const weapon = this.select(Object.keys(WEAPON_DEFINITIONS), this.weaponId, (value) => {
        this.weaponId = value as WeaponId; this.player?.setWeaponVisual(this.weaponId);
      }, (value) => WEAPON_DEFINITIONS[value as WeaponId].name);
      weapon.setAttribute('aria-label', 'Weapon');
      const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = String(MELEE_MOTION.durationMs); slider.value = '0';
      slider.setAttribute('aria-label', 'Attack motion time');
      slider.oninput = () => { this.playing = false; this.elapsed = Number(slider.value); };
      controls.append(weapon, slider, this.button('Muzzle flash', () => this.player?.triggerMuzzleReflection()),
        this.button('Recoil', () => this.player?.triggerWeaponRecoil(7)),
        this.button('Reload animation', () => { this.reloading = !this.reloading; }));
    }
    this.details?.append(controls);
  }

  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button'); button.textContent = label; button.onclick = action;
    button.style.cssText = 'min-height:36px;padding:6px 10px;border:1px solid #687584;border-radius:4px;background:#283341;color:white;cursor:pointer'; return button;
  }

  private select(values: string[], current: string, action: (value: string) => void, label: (value: string) => string = (value) => value): HTMLSelectElement {
    const select = document.createElement('select'); select.style.cssText = 'max-width:100%;min-height:36px';
    for (const value of values) { const option = document.createElement('option'); option.value = value; option.textContent = label(value); select.append(option); }
    select.value = current; select.onchange = () => action(select.value); return select;
  }

  private previewY(): number { return this.scale.height * 0.78; }

  private clearPreview(): void {
    this.supply?.destroy(); this.supply = undefined;
    this.effects?.destroy(); this.effects = undefined;
    this.backdrop?.destroy(); this.backdrop = undefined;
    for (const object of this.previewObjects) if (object.scene) object.destroy();
    this.previewObjects = []; this.player = undefined; this.zombie = undefined; this.item = undefined; this.weaponPickup = undefined;
  }

  private refreshPreview(): void {
    this.clearPreview();
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height).setZoom(1).setScroll(0, 0);
    const before = new Set(this.children.list);
    this.selected?.preview?.();
    this.previewObjects = this.children.list.filter((object) => !before.has(object));
  }

  update(_time: number, deltaMs: number): void {
    const delta = this.playing ? deltaMs * this.speed : 0;
    this.elapsed = (this.elapsed + delta) % MELEE_MOTION.durationMs;
    this.player?.setRotation(Phaser.Math.DegToRad(this.angle));
    if (this.weaponId === 'policeBaton') this.player?.setMeleeSwingElapsed(this.elapsed);
    this.player?.setReloadVisual(this.reloading, this.elapsed / MELEE_MOTION.durationMs);
    this.player?.updateVisual(delta, this.moving);
    this.zombie?.setRotation(Phaser.Math.DegToRad(this.angle));
    this.zombie?.updateAttackVisual();
    this.item?.advanceVisual(delta);
    if (this.supply) {
      this.supplyElapsed = (this.supplyElapsed + delta) % 14000;
      const position = { x: this.scale.width / 2, y: this.previewY() };
      const config = { ...SUPPLY_DROP_CONFIG, target: position, fallHeight: Math.min(100, this.scale.height * 0.15), planeTravel: { x: this.scale.width * 0.7, y: 0 } };
      const snapshot = resolveSupplyDropSnapshot({ elapsedMs: this.supplyElapsed, crateHealth: config.crateHealth, crateOpened: false }, config);
      this.supply.update(snapshot, snapshot.planePosition, snapshot.cratePosition, { width: this.scale.width, height: this.scale.height }, 30);
    }
    // Keep the pickup preview alive while animating its production glow.
    if (this.weaponPickup?.advanceLifetime(delta)) this.refreshPreview();
  }
}
