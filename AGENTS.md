# Project Goal

브라우저에서 실행되는 2D 탑다운 좀비 생존 게임을 개발한다.

# Constraints

- Phaser 3와 TypeScript를 사용한다.
- 백엔드는 개발하지 않는다.
- 모든 게임 로직은 프레임 속도와 독립적으로 동작해야 한다.
- 플레이어, 무기, 좀비, 웨이브 로직을 분리한다.
- 에셋은 임시 도형으로 시작한다.
- 한 작업에서 여러 기능을 동시에 구현하지 않는다.
- 변경 후 테스트와 빌드를 반드시 실행한다.
- 기존 테스트를 삭제하거나 완화하지 않는다.

# Architecture

- src/scenes: Phaser Scene
- src/entities: Player, Zombie, Bullet
- src/systems: Weapon, Spawn, Wave, Collision
- src/config: 밸런스 설정
- src/tests: 순수 게임 로직 테스트

# Definition of Done

- npm test 통과
- npm run build 통과
- 변경 파일과 설계 이유 요약
- 알려진 문제 명시