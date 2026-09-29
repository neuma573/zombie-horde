import Phaser from 'phaser';

/** Fade the top camera so the world and HUD share the same black transition. */
export function fadeScene(scene: Phaser.Scene, direction: 'in' | 'out', duration = 350): Promise<boolean> {
  const camera = scene.cameras.cameras[scene.cameras.cameras.length - 1];
  const event = direction === 'in'
    ? Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE
    : Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE;
  return new Promise(resolve => {
    const finish = (completed: boolean) => {
      camera.off(event, complete);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cancel);
      resolve(completed);
    };
    const complete = () => finish(true);
    const cancel = () => finish(false);
    camera.once(event, complete);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cancel);
    if (direction === 'in') camera.fadeIn(duration, 0, 0, 0);
    else camera.fadeOut(duration, 0, 0, 0);
  });
}
