import { fadeScene } from '../effects/sceneFade';
import { renderExplorationLocationNote } from '../effects/ExplorationLocationNote';
import type { LastStandNightVictory } from '../types/lastStandCombat';
import type { WeaponId } from '../logic/weapon';
import Phaser from 'phaser';
import { EXPLORATION_MAP_SELECTION_ZOOM, getCompactResultLayout, getExplorationMapZoom, getPlanningPageLayout, usesExplorationPages } from '../logic/explorationLayout';
import { getArmoryViewportScale } from '../logic/armoryLayout';
import type { ViewportState } from '../logic/pinchViewport';
import { ScrollPanel } from '../effects/ScrollPanel';
import pistolUrl from '../assets/weapons/pistol-armory.png';
import { GAME_IMAGE_ASSETS } from '../effects/gameAssetPreloader';
import { WEAPON_DEFINITIONS } from '../config/weaponConfig';
import { LastStandArmory } from '../systems/LastStandArmory';
import { renderLastStandArmory } from '../effects/LastStandArmoryView';
import mapUrl from '../assets/hazard-map.svg?url';
import { EXPLORATION_HOURS, REPAIR_PERCENT_PER_PERSON_HOUR } from '../config/explorationConfig';
import { turnExplorationPage } from '../effects/ExplorationPageTurn';
import { drawExplorationSelection } from '../effects/ExplorationSelection';
import { ExplorationDiary } from '../effects/ExplorationDiary';
import { ExplorationSystem } from '../systems/ExplorationSystem';
import { t, userSettings } from '../systems/UserSettings';
import { explorationPlanMessage } from '../logic/explorationFeedback';
import { RESOURCE_KEYS, type ExplorationState, type SearchLocation, type DayResult } from '../types/exploration';

const NIGHT_FADE_MS = 1500;
const NIGHT_SHADE_ALPHA = 0.45;
const PISTOL_KEY = 'last-stand-armory-pistol';
const MAP_KEY = 'hazard-exploration-map';
const RESOURCE_LABELS = { food: 'Food', ammo: 'Ammo', fuel: 'Fuel' };
const INK = '#292b25';
const MUTED = '#737467';
const RED = '#982c24';
const HAND = '"Chalkboard SE", "Comic Sans MS", cursive';
interface Box { x: number; y: number; width: number; height: number }

export class ExplorationScene extends Phaser.Scene {
  private exploration!: ExplorationSystem;
  private ui?: Phaser.GameObjects.Container;
  private selectionStartedAt = new Map<string, number>();
  private armory = new LastStandArmory();
  private armoryOpen = false;
  private mapOffset: ViewportState = { x: 0, y: 0 };
  private mapOverviewZoom?: number;
  private pendingMapFocus?: { x: number; y: number; zoom: number; center: boolean };
  private armoryOffset: ViewportState = { x: 0, y: 0 };
  private nightStartedAt: number | null = null;
  private turnResult = false;
  private transitionMap: ExplorationState | null = null;
  private transitionTimer?: Phaser.Time.TimerEvent;
  private feedback: { locationId: string; message: string; until: number } | null = null;
  private selectedId: string | null = null;
  private diaryOpen = true;
  private animateDiary = true;
  private result: DayResult | null = null;
  private planningPage: 'map' | 'site' | 'plan' = 'map';
  private armoryRecipient = 'player';
  private resultOffset: ViewportState = { x: 0, y: 0, zoom: 1 };
  private noteOffset: ViewportState = { x: 0, y: 0, zoom: 1 };

  constructor() { super('ExplorationScene'); }

  preload(): void {
    if (!this.textures.exists(PISTOL_KEY)) this.load.image(PISTOL_KEY, pistolUrl);
    if (!this.textures.exists(MAP_KEY)) this.load.svg(MAP_KEY, mapUrl);
    for (const [key, url] of Object.entries(GAME_IMAGE_ASSETS)) {
      if (key.startsWith('weapon-') && !this.textures.exists(key)) this.load.image(key, url);
    }
  }

  create(): void {
    this.exploration = new ExplorationSystem();
    this.armoryRecipient = 'player';
    this.resultOffset = { x: 0, y: 0, zoom: 1 };
    this.noteOffset = { x: 0, y: 0, zoom: 1 };
    this.transitionMap = null;
    this.input.enabled = true;
    this.armory = new LastStandArmory();
    this.armoryOpen = false;
    this.mapOffset = { x: 0, y: 0 };
    this.mapOverviewZoom = undefined;
    this.pendingMapFocus = undefined;
    this.armoryOffset = { x: 0, y: 0 };
    this.nightStartedAt = null;
    this.selectionStartedAt.clear();
    this.selectedId = null;
    this.feedback = null;

    this.turnResult = false;
    this.diaryOpen = true;
    this.result = null;
    this.planningPage = 'map';
    this.animateDiary = true;
    this.cameras.main.setBackgroundColor('#000000');
    this.scale.on(Phaser.Scale.Events.RESIZE, this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.render, this);
      this.transitionTimer?.remove();
      this.transitionTimer = undefined;
      this.input.enabled = true;
      this.ui?.destroy(true);
      this.ui = undefined;
    });
    this.render();
  }

  private render(): void {
    this.ui?.destroy(true);
    const style = getComputedStyle(this.game.canvas.parentElement ?? this.game.canvas);
    const inset = (side: string) => parseFloat(style.getPropertyValue(`--safe-area-${side}`)) || 0;
    const availableWidth = Math.max(1, this.scale.width - inset('left') - inset('right'));
    const availableHeight = Math.max(1, this.scale.height - inset('top') - inset('bottom'));
    const portrait = availableHeight > availableWidth;
    const paged = !this.armoryOpen && usesExplorationPages(availableWidth, availableHeight);
    const scale = this.armoryOpen
      ? getArmoryViewportScale(availableWidth, availableHeight, this.exploration.companions.getActive().length > 0)
      : paged ? 1 : Math.min(1, availableWidth / (portrait ? 360 : 800), availableHeight / (portrait ? 740 : 500));
    const width = availableWidth / scale;
    const height = availableHeight / scale;
    this.ui = this.add.container(inset('left'), inset('top')).setScale(scale);
    if (this.diaryOpen) {
      this.ui.add(new ExplorationDiary(this, width, height, () => {
        this.diaryOpen = false;
        this.armory.selectWeapon('pistol');
        this.armory.clickSlot(0);
        this.armoryOpen = true;
        void this.startDefense();
      }, this.animateDiary).container);
      this.animateDiary = false;
      this.renderNight(width, height);
      return;
    }
    const boardWidth = Math.min(portrait ? 580 : 1160, width - 32);
    const boardHeight = Math.min(this.armoryOpen && width >= 992 && height >= 624 ? 680 : 820, height - 64);
    const board: Box = { x: (width - boardWidth) / 2, y: (height - boardHeight) / 2 + 12, width: boardWidth, height: boardHeight };
    const compact = board.height < 620;
    const mainMenu = this.text(board.x, board.y - 30, '← ' + t('MAIN MENU'), 12, '#b9b9a6');
    this.onTap(mainMenu, () => this.scene.start('MainMenuScene'));
    if (this.armoryOpen) {
      const roster = this.exploration.companions.getActive();
      this.armory.syncCompanions(roster.map(ally => ally.id));
      renderLastStandArmory(this, this.ui!, board, this.armory, PISTOL_KEY, this.exploration.getState().day, () => this.render(), () => {
        void this.startDefense();
      }, this.armoryOffset, {
        companions: roster, ammo: this.exploration.getState().resources.ammo,
        recipientId: this.armoryRecipient,
        selectRecipient: id => { this.armoryRecipient = id; this.render(); },
      });
      this.renderNight(width, height);
      return;
    }
    this.paper(board);
    const state = this.transitionMap ?? this.exploration.getState();
    if (paged) {
      if (this.result) {
        this.renderCompactResult(board, state);
        if (this.turnResult) turnExplorationPage(this, this.ui!, board);
        this.turnResult = false;
      } else this.renderPlanningPages(board, state);
      this.renderNight(width, height);
      return;
    }
    const pad = portrait ? 16 : 24;
    const headerHeight = compact ? 112 : 128;
    this.text(board.x + pad, board.y + 12, this.result ? t('SEARCH COMPLETE') : t('Hazard, KY'), portrait ? (this.result ? 18 : 24) : compact ? 26 : 34, INK, true);
    this.text(board.x + pad + 2, board.y + (compact ? 43 : 53), this.result ? t('DAY COMPLETE') : t('KENTUCKY'), 11, MUTED);
    this.text(board.x + board.width - pad, board.y + 14, t('DAY {day}', { day: state.day }), 20, RED, true).setOrigin(1, 0);
    if (!this.result) this.renderTimeBudget({ x: board.x + pad, y: board.y + (compact ? 61 : 77), width: board.width - pad * 2, height: 44 }, state);
    this.line(board.x + pad, board.y + headerHeight, board.x + board.width - pad, board.y + headerHeight - 1);

    if (this.result) {
      this.renderResult(board, state, portrait, headerHeight);
      if (this.turnResult) turnExplorationPage(this, this.ui!, board);
      this.turnResult = false;
      this.renderNight(width, height);
      return;
    }

    const selected = state.locations.find(location => location.id === this.selectedId);
    const footerY = board.y + board.height - 150;
    const bodyY = board.y + headerHeight + 12;
    const bodyHeight = footerY - bodyY - 12;
    if (portrait) {
      const companions = this.exploration.getAvailableCompanions().length;
      const noteHeight = companions && selected
        ? Math.min(112 + (companions + 1) * 56, Math.max(154, bodyHeight - 140)) : 154;
      const map = { x: board.x + pad, y: bodyY, width: board.width - pad * 2, height: bodyHeight - noteHeight - 10 };
      this.renderMap(map, state.locations);
      const note = { x: map.x, y: map.y + map.height + 10, width: map.width, height: noteHeight };
      if (selected) this.locationNote(note, selected, true);
      else this.instruction(note);
    } else {
      const sideWidth = 250;
      const sideX = board.x + board.width - pad - sideWidth;
      this.renderMap({ x: board.x + pad, y: bodyY, width: sideX - board.x - pad - 20, height: bodyHeight }, state.locations);
      const note = { x: sideX, y: bodyY, width: sideWidth, height: bodyHeight };
      if (selected) this.locationNote(note, selected, true);
      else this.instruction(note);
    }

    this.renderPlan({ x: board.x + pad, y: footerY, width: board.width - pad * 2, height: 140 }, state);
    this.renderNight(width, height);
  }

  private renderPlanningPages(board: Box, state: ExplorationState): void {
    const x = board.x + 12;
    const width = board.width - 24;
    const layout = getPlanningPageLayout(board.width, board.height);
    const { sideTabs } = layout;
    this.text(x, board.y + 8, t('Hazard, KY'), 20, INK, true);
    this.text(sideTabs ? x : x + width, board.y + (sideTabs ? 34 : 10), t('DAY {day}', { day: state.day }), 16, RED, true).setOrigin(sideTabs ? 0 : 1, 0);
    const body = { ...layout.body, x: board.x + layout.body.x, y: board.y + layout.body.y };
    if (this.planningPage === 'map') this.renderMap(body, state.locations, true);
    else if (this.planningPage === 'site') {
      const selected = state.locations.find(location => location.id === this.selectedId);
      if (selected) this.locationNote(body, selected, true, true);
      else this.instruction(body);
    } else {
      this.renderTimeBudget({ ...layout.budget, x: board.x + layout.budget.x, y: board.y + layout.budget.y }, state);
      this.renderPlan({ ...body, y: board.y + layout.planY, height: layout.planHeight }, state, layout.compactPlan);
    }
    const pages = [['map', 'Map'], ['site', 'Site'], ['plan', 'Plan']] as const;
    pages.forEach(([page, label], index) => {
      const tab = layout.tabs[index];
      this.button(board.x + tab.x, board.y + tab.y, tab.width, t(label),
        () => { this.planningPage = page; this.render(); }, this.planningPage !== page);
    });
  }

  private renderPlan(box: Box, state: ExplorationState, compact = false): void {
    const repairHours = this.exploration.getTeamRepairHours();
    const repair = this.exploration.getTeamRepairSummary();
    const projected = state.confirmed ? state.barricade : Math.min(100, state.barricade + this.exploration.getProjectedRepair());
    this.line(box.x, box.y, box.x + box.width, box.y);
    this.text(box.x, box.y + (compact ? 0 : 7), t('Barricade: {current}% → {next}%', { current: state.barricade, next: projected }), 14, INK, true);
    this.text(box.x, box.y + (compact ? 60 : 28),
      t('Each person repairs {points} points per hour.', { points: REPAIR_PERCENT_PER_PERSON_HOUR }), 12, MUTED);
    const repairY = box.y + (compact ? 22 : 49);
    this.button(box.x, repairY, 40, '−', () => {
      this.exploration.setTeamRepairHours(repairHours - 1); this.render();
    }, !state.confirmed && repairHours > 0);
    this.text(box.x + box.width / 2, repairY + 1, t('Repair {hours} h', { hours: repairHours }), 13, INK).setOrigin(0.5, 0);
    this.text(box.x + box.width / 2, repairY + 20,
      t('Current crew: {count}', { count: 1 + this.exploration.getAvailableCompanions().length }), 11, MUTED).setOrigin(0.5, 0);
    this.button(box.x + box.width - 40, repairY, 40, '+', () => {
      this.exploration.setTeamRepairHours(repairHours + 1); this.render();
    }, !state.confirmed && this.exploration.getUnallocatedHours() >= 1
      && this.exploration.getTeamRepairSummary(repairHours + 1).totalHours > repair.totalHours);
    const action = state.plannedLocationIds.length ? 'START SEARCH' : 'SPEND THE DAY';
    this.button(box.x, box.y + (compact ? 78 : 113), box.width, t(state.confirmed ? 'DAY COMPLETE' : action),
      () => this.confirmDayPlan(), this.exploration.canConfirmPlan());
  }

  private confirmDayPlan(): void {
    if (!this.input.enabled || this.transitionMap || !this.exploration.canConfirmPlan()) return;
    const map = this.exploration.getState();
    const result = this.exploration.confirmPlan();
    if (!result) { this.render(); return; }
    for (const weapon of this.exploration.getRecoveredWeapons()) this.armory.addWeapon(weapon);
    this.armory.syncCompanions(this.exploration.companions.getActive().map(ally => ally.id));
    // Resolve once, but keep the map visible while daylight fades.
    this.transitionMap = map;
    this.nightStartedAt = this.time.now;
    this.input.enabled = false;
    this.render();
    this.transitionTimer = this.time.delayedCall(NIGHT_FADE_MS, () => {
      this.transitionMap = null;
      this.result = result;
      this.resultOffset = { x: 0, y: 0, zoom: 1 };
      this.turnResult = true;
      this.render();
      this.input.enabled = true;
      this.transitionTimer = undefined;
    });
  }

  private paper(box: Box): void {
    this.rect(box.x - 10, box.y - 10, box.width + 20, box.height + 22, 0x302c23);
    this.rect(box.x + 6, box.y + 8, box.width, box.height, 0x090c09, 0.5);
    this.rect(box.x + 3, box.y - 5, box.width - 10, box.height, 0xbabdad);
    this.rect(box.x, box.y, box.width, box.height, 0xe7e5d5);
    const grain = this.add.graphics();
    grain.lineStyle(1, 0x727462, 0.06);
    for (let x = box.x + 12; x < box.x + box.width; x += 19) grain.lineBetween(x, box.y + 4, x + 2, box.y + box.height - 4);
    grain.lineStyle(1, 0xffffff, 0.16);
    for (let y = box.y + 10; y < box.y + box.height; y += 7) grain.lineBetween(box.x + 4, y, box.x + box.width - 4, y + 1);
    this.ui!.add(grain);
  }

  private renderMap(area: Box, locations: SearchLocation[], inspectFirst = false): void {
    const viewport = { ...area, height: area.height - 24 };
    const mapScale = Math.max(1, viewport.width / 800, viewport.height / 620);
    const box = { x: 0, y: 0, width: 800 * mapScale, height: 620 * mapScale };
    const parent = this.ui!;
    if (this.mapOffset.zoom === undefined) {
      const zoom = getExplorationMapZoom(viewport.width, viewport.height, box.width, box.height);
      this.mapOffset = { zoom, x: (box.width * zoom - viewport.width) / 2,
        y: (box.height * zoom - viewport.height) / 2 };
    }
    const panel = new ScrollPanel(this, parent, viewport, box.width, box.height, this.mapOffset, 'contain', {
      dragCursor: true, onNavigate: () => { this.mapOverviewZoom = undefined; },
    });
    this.ui = panel.content;
    const plannedIds = this.exploration.getState().plannedLocationIds;
    this.ui!.add(this.add.image(box.x, box.y, MAP_KEY).setOrigin(0).setDisplaySize(box.width, box.height));
    const buildingWidth = Phaser.Math.Clamp(box.width * 0.105, 34, 72);
    const buildingHeight = Phaser.Math.Clamp(box.height * 0.115, 30, 60);
    locations.forEach(location => {
      const x = box.x + location.x * box.width;
      const y = box.y + location.y * box.height;
      const selected = plannedIds.includes(location.id);
      const color = location.searched ? 0x94958a : 0x33372e;
      const building = this.add.graphics();
      building.fillStyle(0xe7e5d5, 0.95);
      building.fillRect(x - buildingWidth / 2, y - buildingHeight / 2, buildingWidth, buildingHeight);
      building.lineStyle(2, color);
      building.strokePoints([
        new Phaser.Geom.Point(x - buildingWidth / 2, y - buildingHeight / 2 + 1),
        new Phaser.Geom.Point(x + buildingWidth / 2, y - buildingHeight / 2 - 1),
        new Phaser.Geom.Point(x + buildingWidth / 2 - 1, y + buildingHeight / 2),
        new Phaser.Geom.Point(x - buildingWidth / 2 + 1, y + buildingHeight / 2 + 1),
      ], true);
      if (location.searched) {
        building.lineStyle(3, 0x85877d);
        building.lineBetween(x - 9, y - 9, x + 9, y + 9);
        building.lineBetween(x + 9, y - 9, x - 9, y + 9);
      }
      this.ui!.add(building);
      if (selected && !location.searched) {
        drawExplorationSelection(this, this.ui!, x, y, buildingWidth + 24, buildingHeight + 20,
          this.selectionStartedAt.get(location.id));
      }
      const label = t(location.name).replace('Residential House', 'House').toUpperCase();
      const text = this.text(x, y + buildingHeight / 2 + 5, label, box.width < 400 ? 10 : 13,
        location.searched ? MUTED : selected ? RED : INK, true).setOrigin(0.5, 0);
      text.setBackgroundColor('#e7e5d5').setPadding(2, 0);
      const hitWidth = Math.max(48, buildingWidth + 14);
      const hitHeight = Math.max(48, buildingHeight + 26);
      panel.onTap({ x: x - hitWidth / 2, y: y + 8 - hitHeight / 2, width: hitWidth, height: hitHeight }, () => {
          if (this.selectedId !== location.id) this.noteOffset = { x: 0, y: 0, zoom: 1 };
          this.selectedId = location.id;
          this.feedback = null;
          if (inspectFirst) {
            this.planningPage = 'site';
            this.render();
            return;
          }
          if (this.exploration.toggleLocation(location.id)) {
            if (selected) this.selectionStartedAt.delete(location.id);
            else this.selectionStartedAt.set(location.id, this.time.now);
            const currentZoom = this.mapOffset.zoom!;
            const overview = this.mapOverviewZoom ?? (selected
              ? getExplorationMapZoom(viewport.width, viewport.height, box.width, box.height)
              : currentZoom);
            this.pendingMapFocus = { x: location.x, y: location.y, center: !selected,
              zoom: selected ? overview : EXPLORATION_MAP_SELECTION_ZOOM };
            this.mapOverviewZoom = overview;
          } else {
            const message = explorationPlanMessage(this.exploration.getLocationPlanBlock(location.id),
              userSettings.locale);
            this.feedback = { locationId: location.id, message, until: this.time.now + 2200 };
          }
          this.render();
        });
    });
    if (this.pendingMapFocus) {
      const focus = this.pendingMapFocus;
      this.pendingMapFocus = undefined;
      panel.zoomTo({ x: focus.x * box.width, y: focus.y * box.height }, focus.zoom, focus.center);
    }
    this.ui = parent;
    this.text(area.x + area.width / 2, area.y + area.height - 18,
      t('Drag the map to explore'), 11, MUTED)
      .setOrigin(0.5, 0);
    if (this.feedback && this.time.now < this.feedback.until) {
      this.ui = parent;
      const warning = this.text(viewport.x + viewport.width / 2, viewport.y + 8,
        this.feedback.message, 14, '#fff3dc', true)
        .setOrigin(0.5, 0).setBackgroundColor('#982c24').setPadding(10, 8)
        .setWordWrapWidth(viewport.width - 44).setAlign('center');
      const tween = this.tweens.add({ targets: warning, alpha: 0,
        delay: Math.max(0, this.feedback.until - this.time.now - 300), duration: 300 });
      warning.once('destroy', () => tween.remove());
    }
    this.ui = parent;
  }

  private renderTimeBudget(box: Box, state: ExplorationState): void {
    const search = state.locations.filter(location => state.plannedLocationIds.includes(location.id))
      .reduce((hours, location) => hours + this.exploration.getSearchHours(location.id), 0);
    const free = this.transitionMap ? EXPLORATION_HOURS - search - state.repairHours : this.exploration.getUnallocatedHours();
    this.text(box.x, box.y, t('Day plan · {used} / {total} h', { used: search + state.repairHours, total: EXPLORATION_HOURS }), 13, INK, true);
    const gap = 3;
    const cell = (box.width - gap * (EXPLORATION_HOURS - 1)) / EXPLORATION_HOURS;
    for (let hour = 0; hour < EXPLORATION_HOURS; hour++) {
      this.rect(box.x + hour * (cell + gap), box.y + 20, cell, 9,
        hour < search ? 0x982c24 : hour < search + state.repairHours ? 0x637747 : 0xc8c8ba);
    }
    const labels = [t('Search {hours} h', { hours: search }), t('Repair {hours} h', { hours: state.repairHours }), t('Rest {hours} h', { hours: free })];
    labels.forEach((label, index) => this.text(box.x + box.width * index / 3, box.y + 32, label, 11, [RED, '#526537', MUTED][index]));
  }

  private locationNote(box: Box, location: SearchLocation, compact: boolean, noteAction = false): void {
    renderExplorationLocationNote(this, this.ui!, box, location,
      this.transitionMap ?? this.exploration.getState(), this.exploration, this.noteOffset,
      message => {
        this.feedback = message ? { locationId: location.id, message, until: this.time.now + 4000 } : null;
        if (message) this.noteOffset.y = 0;
        this.render();
      }, compact, this.feedback?.locationId === location.id && this.time.now < this.feedback.until
        ? this.feedback.message : undefined, noteAction);
  }

  private instruction(box: Box): void {
    const message = this.exploration.hasPlannableLocations()
      ? 'Tap a building to mark or unmark it.' : 'No searchable locations remain today.';
    this.text(box.x + box.width / 2, box.y + box.height / 2 - 14, t(message), 15, MUTED, true)
      .setOrigin(0.5).setWordWrapWidth(box.width - 30).setAlign('center');
  }

  private resources(box: Box, state: ExplorationState, compact: boolean): void {
    this.rect(box.x + 2, box.y + 3, box.width, box.height, 0x323429, 0.12);
    this.rect(box.x, box.y, box.width, box.height, 0xd4d9c0);
    const column = box.width / 3;
    RESOURCE_KEYS.forEach((key, index) => {
      const x = box.x + column * (index + 0.5);
      this.text(x, box.y + (compact ? 3 : 12), t(RESOURCE_LABELS[key]), 11, MUTED, true).setOrigin(0.5, 0);
      this.text(x, box.y + (compact ? 18 : 34), `${state.resources[key]}`, compact ? 20 : 29, INK, true).setOrigin(0.5, 0);
    });
  }

  private renderCompactResult(board: Box, state: ExplorationState): void {
    const result = this.result!;
    const { summary, table, button } = getCompactResultLayout(board.width, board.height);
    this.text(board.x + 12, board.y + 8, t('SEARCH COMPLETE'), 20, INK, true);
    [
      t('Sites searched: {count} · Barricade +{repair}%', { count: result.locationIds.length, repair: result.repaired }),
      t('Time spent: {hours} h', { hours: result.hoursSpent }),
      t('Barricade: {current}% · Rest {hours} h', { current: state.barricade, hours: state.remainingHours }),
    ].forEach((label, index) => this.text(board.x + summary.x, board.y + summary.y + index * 22, label, 12, MUTED)
      .setWordWrapWidth(summary.width));
    this.renderFindings({ x: board.x + table.x, y: board.y + table.y,
      width: table.width, height: button.y - table.y - 8 }, state, true);
    this.button(board.x + button.x, board.y + button.y, button.width, t('NEXT'), () => { void this.openArmory(); });
  }

  private renderResult(board: Box, state: ExplorationState, portrait: boolean, headerHeight: number): void {
    const result = this.result!;
    const compact = board.height < 620;
    const left = board.x + (portrait ? 24 : board.width * 0.16);
    const width = portrait ? board.width - 48 : board.width * 0.68;
    const top = board.y + headerHeight + (compact ? 16 : 35);
    this.text(left, top, t('Sites searched: {count} · Barricade +{repair}%', { count: result.locationIds.length, repair: result.repaired }), 13, MUTED, true);
    const footerY = board.y + board.height - (compact ? 134 : 178);
    this.renderFindings({ x: left, y: top + 32, width, height: footerY - top - 40 }, state);
    this.text(left, footerY, t('Time spent: {hours} h', { hours: result.hoursSpent }), 14, MUTED);
    this.text(left, footerY + 20, t('Barricade: {current}% · Rest {hours} h', { current: state.barricade, hours: state.remainingHours }), 14, RED);
    this.resources({ x: left, y: footerY + 45, width, height: 44 }, state, true);
    this.button(left, board.y + board.height - (compact ? 42 : 73), width, t('NEXT'), () => { void this.openArmory(); });
  }

  private renderFindings(box: Box, state: ExplorationState, totals = false): void {
    const content = this.add.container(0, 0);
    const label = (x: number, y: number, value: string, size: number, color = INK) => {
      const item = this.add.text(x, y, value, { fontFamily: HAND, fontSize: size, color });
      content.add(item);
      return item;
    };
    let y = 0;
    if (totals) {
      label(box.width * 0.6, y, t('Found'), 12, MUTED).setOrigin(0.5, 0);
      label(box.width * 0.9, y, t('Total'), 12, MUTED).setOrigin(0.5, 0);
      y += 22;
    }
    const loot = RESOURCE_KEYS.filter(key => totals || this.result!.loot[key] > 0);
    if (!loot.length) { label(0, y, t('No resources found.'), 17); y += 32; }
    for (const key of loot) {
      label(0, y, t(RESOURCE_LABELS[key]), totals ? 15 : 20);
      label(box.width * (totals ? 0.6 : 0.98), y, `+${this.result!.loot[key]}`, totals ? 17 : 24, RED)
        .setOrigin(totals ? 0.5 : 1, 0);
      if (totals) label(box.width * 0.9, y, `${state.resources[key]}`, 17).setOrigin(0.5, 0);
      y += totals ? 27 : 40;
    }
    const note = (value: string, color: string) => {
      const item = label(0, y + 8, value, 14, color).setWordWrapWidth(box.width - 4);
      y += item.height + 18;
    };
    const repair = this.exploration.getTeamRepairSummary();
    note(t('Repair: {workers} people · {hours} person-hours · +{repaired}%p', {
      workers: repair.workers, hours: repair.totalHours, repaired: this.result!.repaired,
    }), MUTED);
    const events = this.exploration.companions.getEvents();
    for (const event of events.filter(event => event.type === 'died')) {
      note(t('{name} died at {site}.', {
        name: `${event.companion.firstName} ${event.companion.lastName}`,
        site: t(state.locations.find(location => location.id === event.locationId)?.name ?? event.locationId),
      }), RED);
    }
    const section = (title: string, names: string[]) => {
      if (!names.length) return;
      const heading = label(0, y + 14, t(title), totals ? 18 : 22).setFontStyle('bold')
        .setWordWrapWidth(box.width - 4);
      y += heading.height + 24;
      for (const name of names) note(name, INK);
    };
    section('Companions joined', events.filter(event => event.type === 'joined')
      .map(event => `${event.companion.firstName} ${event.companion.lastName}`));
    section('Weapons recovered', this.exploration.getRecoveredWeapons()
      .map(weapon => t(WEAPON_DEFINITIONS[weapon].name)));
    const panel = new ScrollPanel(this, this.ui!, box, box.width, Math.max(box.height, y),
      this.resultOffset, 'contain', { zoomEnabled: false });
    panel.content.add(content);
  }

  private async openArmory(): Promise<void> {
    if (!this.input.enabled || this.armoryOpen) return;
    this.input.enabled = false;
    if (!await fadeScene(this, 'out')) return;
    this.armoryOpen = true;
    this.render();
    await this.revealScreen();
  }

  private async revealScreen(): Promise<void> {
    this.input.enabled = false;
    if (await fadeScene(this, 'in')) this.input.enabled = true;
  }

  private async startDefense(): Promise<void> {
    if (!this.armory.canStartDefense() || !this.input.enabled) return;
    this.input.enabled = false;
    try {
      const { LastStandCombatScene } = await import('./LastStandCombatScene');
      if (!this.scene.isActive()) return;
      if (!this.scene.manager.keys.LastStandCombatScene) {
        this.scene.add('LastStandCombatScene', LastStandCombatScene, false);
      }
      const state = this.exploration.getState();
      this.armory.syncCompanions(this.exploration.companions.getActive().map(ally => ally.id));
      const deployedIds = this.armory.getDeployedIds();
      if (!this.exploration.beginNight(deployedIds.length)) { this.input.enabled = true; return; }
      if (!await fadeScene(this, 'out')) { this.exploration.retryNight(); return; }
      this.events.once(Phaser.Scenes.Events.WAKE, (_sys: Phaser.Scenes.Systems, victory?: LastStandNightVictory) => {
        if (victory && this.exploration.completeNight(victory.day, victory.barricade, victory.fledCompanionIds)) {
          this.armory.clearDeployments();
          this.armoryOpen = false;
          this.result = null;
          this.turnResult = false;
          this.transitionMap = null;
          this.nightStartedAt = null;
          this.selectedId = null;
          this.feedback = null;
          this.selectionStartedAt.clear();
          this.noteOffset = { x: 0, y: 0, zoom: 1 };
          this.armoryRecipient = 'player';
          this.planningPage = 'map';
        } else this.exploration.retryNight();
        this.render();
        void this.revealScreen();
      });
      this.scene.launch('LastStandCombatScene', {
        companions: this.exploration.companions.getActive().filter(ally => deployedIds.includes(ally.id))
          .map(companion => ({ companion, weaponId: this.armory.getCompanionWeapon(companion.id) as WeaponId | null })),
        day: state.day,
        barricades: { 'hazard-main': state.barricade },
        slots: this.armory.getState().slots as [WeaponId | null, WeaponId | null],
      });
      this.scene.sleep();
    } catch (error) {
      this.exploration.retryNight();
      if (this.scene.isActive()) await this.revealScreen();
      throw error;
    }
  }

  private renderNight(width: number, height: number): void {
    if (this.nightStartedAt === null) return;
    const duration = NIGHT_FADE_MS;
    const elapsed = Math.max(0, this.time.now - this.nightStartedAt);
    const shade = this.add.rectangle(0, 0, width, height, 0x071327)
      .setOrigin(0).setAlpha(NIGHT_SHADE_ALPHA * Math.min(1, elapsed / duration));
    this.ui!.add(shade);
    if (elapsed < duration) {
      const tween = this.tweens.add({ targets: shade, alpha: NIGHT_SHADE_ALPHA, duration: duration - elapsed });
      shade.once('destroy', () => tween.remove());
    }
  }

  private rect(x: number, y: number, width: number, height: number, color: number, alpha = 1): void {
    this.ui!.add(this.add.rectangle(x, y, width, height, color, alpha).setOrigin(0));
  }

  private line(x: number, y: number, endX: number, endY: number, color = 0x45493e): void {
    const graphics = this.add.graphics().lineStyle(1.5, color);
    graphics.lineBetween(x, y, endX, endY);
    this.ui!.add(graphics);
  }

  private text(x: number, y: number, label: string, size: number, color = INK, hand = false): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, label, { fontFamily: hand ? HAND : 'Arial, sans-serif', fontSize: size, color, lineSpacing: 3, fontStyle: hand ? 'bold' : 'normal' });
    this.ui!.add(text);
    return text;
  }

  private button(x: number, y: number, width: number, label: string, action: () => void, enabled = true): void {
    const background = this.add.rectangle(x, y, width, 36, enabled ? 0x982c24 : 0xc6c6b4)
      .setOrigin(0).setStrokeStyle(1, enabled ? 0x742019 : 0xa3a593);
    if (enabled) this.onTap(background, action);
    this.ui!.add(background);
    this.text(x + width / 2, y + 18, label, 15, enabled ? '#f1edda' : '#7a7e70', true).setOrigin(0.5);
  }

  private onTap(target: Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle, action: () => void): void {
    target.setInteractive({ useHandCursor: true }).on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // A map drag released over a control must not confirm the plan or leave the scene.
      if (pointer.getDistance() <= 8 && target.getBounds().contains(pointer.downX, pointer.downY)) action();
    });
  }
}
