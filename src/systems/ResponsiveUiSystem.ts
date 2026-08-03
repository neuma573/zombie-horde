import {
  createGameUiLayout,
  type GameUiLayout,
  type GameUiLayoutInput,
} from '../logic/gameUiLayout';

export interface ResponsiveHudTarget {
  setMobileInputMode(enabled: boolean): void;
  applyLayout(
    width: number,
    height: number,
    safeArea: GameUiLayoutInput['safeArea'],
    layout: GameUiLayout['hud'],
  ): void;
}

export interface ResponsivePauseTarget {
  resize(
    layout: Omit<GameUiLayoutInput, 'mobileControls'>,
    pauseBounds: GameUiLayout['pauseButton'],
  ): void;
  setMobileVisible(visible: boolean): void;
}

export interface ResponsiveMobileControlsTarget {
  setVisible(visible: boolean): void;
  setLayout(layout: NonNullable<GameUiLayout['mobileControlsLayout']>): void;
}

export class ResponsiveUiSystem {
  constructor(
    private readonly hud: ResponsiveHudTarget,
    private readonly pause: ResponsivePauseTarget,
    private readonly mobileControls: ResponsiveMobileControlsTarget,
  ) {}

  apply(input: GameUiLayoutInput, pauseVisible: boolean): GameUiLayout {
    const layout = createGameUiLayout(input);
    this.hud.setMobileInputMode(input.mobileControls);
    this.hud.applyLayout(input.width, input.height, input.safeArea, layout.hud);
    this.pause.resize({
      width: input.width,
      height: input.height,
      safeArea: input.safeArea,
    }, layout.pauseButton);
    this.pause.setMobileVisible(input.mobileControls && pauseVisible);
    this.mobileControls.setVisible(input.mobileControls);
    if (layout.mobileControlsLayout) {
      this.mobileControls.setLayout(layout.mobileControlsLayout);
    }
    return layout;
  }
}
