# Zombie Horde

Phaser 3와 TypeScript로 개발하는 2D 탑다운 좀비 생존 게임입니다.

## Play

[zombie-horde.neuma573.com](https://zombie-horde.neuma573.com/)

PC와 모바일 브라우저를 지원하며, 모바일은 세로와 가로 화면에서 모두 플레이할 수 있습니다.

## Controls

### PC

- `WASD`: 이동
- 마우스: 조준
- 마우스 왼쪽 버튼: 발사
- `R`: 재장전
- `F`: FOG OF WAR 켜기/끄기
- `Enter` 또는 클릭: Game Over 후 재시작

### Mobile

- 왼쪽 가상 스틱: 이동
- 게임 화면 터치 및 드래그: 조준
- `FIRE`: 발사
- `R`: 수동 재장전

탄창이 비고 예비 탄약이 남아 있으면 모바일에서는 자동으로 재장전합니다.

## Development

```bash
npm install
npm run dev
```

검증 명령:

```bash
npm test
npm run build
```

## Tech Stack

- Phaser 3
- TypeScript
- Vite
- Vitest
