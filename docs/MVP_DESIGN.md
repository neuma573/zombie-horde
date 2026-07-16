# 최소 플레이어블 버전 설계 및 구현 기준

## 문서 상태

- MVP 작업 1~12는 완료되었다.
- 이 문서는 프로젝트 시작 시점의 설계 의도와 현재 저장소의 실제 구현 기준을 함께 기록한다.
- 사실 관계가 초기 설계와 다르면 현재 코드를 기준으로 한다.
- Post-MVP 기능은 이 문서에서 작업 단위로 관리하지 않는다.
- 오디오는 MVP 범위가 아니며 제외 범위에서만 다룬다.

## 문서 목적과 저장소 상태

이 문서는 게임 코드와 `package.json`이 없던 신규 프로젝트 시작 시점에 최초 작성되었다. 당시에는 구현할 최소 범위와 Phaser 의존 경계를 먼저 정하는 것이 목적이었다.

현재 저장소에는 Phaser 3, TypeScript, Vite, Vitest 기반 실행 환경과 작업 1~12의 게임 코드가 존재한다. 브라우저 진입점은 `src/main.ts`, 실제 게임 Scene은 `src/scenes/GameScene.ts`이며, `npm test`는 `vitest run`, `npm run build`는 `tsc --noEmit && vite build`를 실행한다.

초기 설계의 핵심 원칙은 현재도 유지한다.

- 기본 무기는 이동하는 Bullet 객체가 없는 hitscan이다.
- 실제 게임 판정과 시각 효과를 분리한다.
- 시간 기반 로직은 Phaser의 밀리초 단위 `deltaMs`를 사용한다.
- Phaser에 의존하지 않는 핵심 로직을 `src/logic`에 둔다.
- MVP에 필요하지 않은 Projectile, 복수 무기, ECS 등의 구조를 선행 구현하지 않는다.

## 1. MVP 포함 범위

- Phaser 3와 TypeScript 기반 브라우저 게임
- Vite 개발 서버와 프로덕션 빌드
- PC 및 모바일 브라우저 크기에 대응하는 Phaser canvas
- 단일 원형 플레이어와 WASD 이동
- 포인터 위치 기반 조준과 기본 마우스 버튼 또는 터치 발사
- 기본 hitscan 무기 1종
- 탄창, 유한 예비 탄약, 발사 쿨다운, 재장전
- 단일 원형 좀비와 플레이어 추적 이동
- 원형 접촉 구간을 사용하는 좀비 접촉 공격
- 플레이어와 좀비의 체력, 피해, 사망
- 종료 횟수 제한이 없는 증가형 웨이브
- `Playing`, `GameOver` 세션 상태와 Scene 재시작
- 반응형 camera viewport, 이동 경계 및 생성 영역
- safe-area를 고려하는 반응형 HUD
- 총구 섬광, hitscan tracer, 플레이어·좀비 피격 및 좀비 사망 효과
- 이동, 무기, 웨이브, 접촉 공격 등 핵심 로직의 delta 기반 처리
- Phaser 비의존 순수 로직 테스트와 10웨이브 통합 시뮬레이션
- `npm test`와 `npm run build` 검증

## 2. MVP 제외 범위

- 오디오와 배경음악
- 정식 스프라이트, 캐릭터 애니메이션 및 조명
- 남성·여성 캐릭터 선택
- 복수 캐릭터 능력치
- 복수 무기, 무기 교체, 구매 및 습득
- 로켓 등 실제 이동 Projectile 무기
- 단발 이외의 별도 발사 모드 UI와 무기별 조작
- 경험치, 레벨업 및 스킬
- 아이템 드롭, 회복 및 방어 아이템
- 점수, 킬 카운터, 미니맵 및 설정 메뉴
- 스토리 모드
- 저장, 최고 기록, 계정, 서버 및 온라인 기능
- 좀비 넉백과 플레이어·좀비 간 위치 분리
- 모바일 가상 이동 스틱이나 별도 터치 이동 UI

## 3. 실제 디렉터리 구조

```text
.
├── AGENTS.md
├── docs/
│   └── MVP_DESIGN.md
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts
    ├── config/
    │   ├── mvpConfig.ts
    │   ├── playerConfig.ts
    │   ├── waveConfig.ts
    │   ├── weaponConfig.ts
    │   └── zombieConfig.ts
    ├── effects/
    │   └── CombatEffects.ts
    ├── entities/
    │   ├── Player.ts
    │   └── Zombie.ts
    ├── logic/
    │   ├── aim.ts
    │   ├── combatEffects.ts
    │   ├── contactDamage.ts
    │   ├── damage.ts
    │   ├── fireInput.ts
    │   ├── hitscan.ts
    │   ├── hud.ts
    │   ├── movement.ts
    │   ├── session.ts
    │   ├── spawn.ts
    │   ├── wave.ts
    │   └── weapon.ts
    ├── scenes/
    │   └── GameScene.ts
    ├── systems/
    │   ├── DamageSystem.ts
    │   ├── HudSystem.ts
    │   ├── SpawnSystem.ts
    │   ├── WaveSystem.ts
    │   └── WeaponSystem.ts
    └── tests/
        ├── aim.test.ts
        ├── contactDamage.test.ts
        ├── damage.test.ts
        ├── fireInput.test.ts
        ├── hitscan.test.ts
        ├── hud.test.ts
        ├── movement.test.ts
        ├── mvpIntegration.test.ts
        ├── projectSetup.test.ts
        ├── session.test.ts
        ├── spawn.test.ts
        ├── wave.test.ts
        └── weapon.test.ts
```

초기 설계에서 제안했던 `src/types`와 개별 효과 파일은 생성하지 않았다. 현재 공통 타입은 사용하는 순수 로직 파일에 함께 정의하고, 최소 효과는 `CombatEffects` 하나로 묶는다. `Projectile` 관련 파일도 MVP에 필요하지 않아 존재하지 않는다.

## 4. 클래스와 모듈 책임

### `GameScene`

- Phaser 객체와 순수 로직 사이의 조정자다.
- Player, Zombie 목록, WeaponSystem, WaveSystem, SpawnSystem, HUD 및 Effect 수명주기를 관리한다.
- WASD, 포인터 이동, 기본 포인터 입력, R 및 Enter 입력을 연결한다.
- 매 프레임 이동, 접촉 피해, 웨이브, HUD와 효과 호출 순서를 조정한다.
- resize 시 camera viewport, 플레이 영역, 객체 위치와 HUD 배치를 갱신한다.
- Game Over에서 도메인 업데이트를 중지하고 `this.scene.restart()`로 새 세션을 시작한다.

### `Player`

- Phaser `Arc`로 그리는 단일 플레이어 엔티티다.
- 위치와 회전 외에 체력, 생존 상태, 피격 무적 남은 시간과 hit radius를 가진다.
- 이동 계산, 피해 계산 및 세션 전환 로직을 직접 수행하지 않는다.

### `Zombie`

- Phaser `Arc`로 그리는 단일 좀비 엔티티다.
- ID, 체력, hit radius와 개별 접촉 공격 쿨다운을 가진다.
- 추적 이동과 피해 계산은 순수 로직 및 시스템에서 수행한다.

### 무기 모듈

- `logic/weapon.ts`는 무기 초기 상태, 발사 가능 여부, 탄약 소비, 쿨다운, 재장전 시작과 완료를 계산한다.
- `WeaponSystem`은 순수 WeaponState를 보관하고 `update`, `fire`, `reload`, `getState`를 제공한다.
- Scene은 발사에 성공한 경우에만 hitscan 판정과 효과를 실행한다.

### hitscan 모듈

- 별도 `HitscanSystem` 클래스는 없다.
- `logic/aim.ts`가 포인터 오프셋을 정규화하고 마지막 유효 조준 방향 fallback을 처리한다.
- `logic/hitscan.ts`의 `resolveHitscan`이 ray-circle 교차, 거리 정렬, `maxTargets` 제한과 종료점을 계산한다.
- Scene은 결과에 포함된 Zombie에만 DamageSystem을 적용한다.

### 피해와 접촉 공격 모듈

- `logic/damage.ts`는 체력을 0 아래로 내리지 않고 최초 사망 여부를 반환한다.
- `DamageSystem`은 일반 피해 적용과 Player/Zombie Phaser 상태를 접촉 피해 순수 로직에 투영하는 어댑터다.
- `logic/contactDamage.ts`는 이동 전·후 위치로 실제 원형 접촉 구간을 계산하고, 좀비별 쿨다운, 플레이어 무적 시간, 피해 이벤트와 사망을 처리한다.

### 생성과 웨이브 모듈

- `logic/spawn.ts`는 현재 화면 가장자리 후보를 계산하고 플레이어 최소 거리 조건을 적용한다.
- `SpawnSystem`은 증가하는 Zombie ID를 부여하고 현재 플레이 영역에 Phaser Zombie를 만든다.
- `logic/wave.ts`는 `waiting`, `spawning`, `active` 상태와 타이머, 웨이브별 생성 수를 계산한다.
- `WaveSystem`은 WaveState를 보관하고 한 update에서 생성해야 할 수를 Scene에 반환한다.

### HUD

- `logic/hud.ts`는 게임 상태를 문자열 중심의 읽기 전용 HudViewModel로 변환하고 화면 크기와 safe-area로 배치 좌표를 계산한다.
- `HudSystem`은 Phaser Text 3개를 생성하며 문자열이나 표시 상태가 바뀔 때만 갱신한다.
- 좁은 화면에서는 상태 블록을 세로로 쌓고, 넓은 화면에서는 좌우에 배치한다.
- HUD는 도메인 상태를 변경하지 않는다.

### Effect

- `logic/combatEffects.ts`는 Phaser 비의존 Shot/Impact 이벤트 타입을 정의한다.
- `CombatEffects`는 총구 섬광, tracer, 피격 flash와 사망 ring을 생성한다.
- 효과는 Zombie 목록과 hitscan 대상에 포함되지 않으며 짧은 tween 완료 후 제거된다.
- Scene 종료 시 남은 효과 객체를 정리한다.

### 세션 상태와 재시작

- `logic/session.ts`는 `playing`, `gameOver` 상태 생성과 단방향 Game Over 전환을 처리한다.
- 사망 전환은 한 번만 `changed: true`를 반환한다.
- 재시작은 기존 객체를 부분 초기화하지 않고 Scene을 restart한다.
- Scene `create`에서 Player, WeaponSystem, WaveSystem, SpawnSystem, HUD와 Effect를 새로 만든다.

### 설정

- 실제 밸런스 값은 `config/mvpConfig.ts`의 `MVP_CONFIG`에 모여 있다.
- player, weapon, zombie, wave 설정 파일은 기존 모듈 경계를 유지하는 re-export 역할을 한다.
- 현재 주요 값은 플레이어 체력 100, 무기 피해 25, 탄창 12, 예비 탄약 300, 좀비 체력 50, 웨이브 기본 3마리와 웨이브당 2마리 증가다.
- 예비 탄약은 유한하며 무한 웨이브 전체의 진행 가능성을 보장하지 않는다.

## 5. Hitscan 명중 판정과 관통 규칙

### 발사 원점과 조준 방향

1. 발사 원점은 발사 시점 Player 중심 좌표다.
2. 포인터의 `worldX`, `worldY`에서 Player 좌표를 빼 조준 벡터를 만든다.
3. `resolveAimDirection`은 유효한 벡터를 정규화한다.
4. 길이가 hitscan epsilon보다 작은 벡터는 마지막 유효 방향을 유지한다.
5. 마지막 유효 방향의 초기값은 오른쪽 `(1, 0)`이다.

`resolveHitscan` 자체에 0 벡터가 직접 전달되면 명중 없이 발사 원점을 종료점으로 반환한다. 정상 Scene 입력 경로에서는 aim fallback이 먼저 적용된다.

### ray-circle 교차와 사거리

- 각 Zombie는 중심점과 hit radius를 가진 원으로 취급한다.
- ray 원점이 대상 원 내부면 교차 거리는 0이다.
- 그 외에는 ray와 원의 이차식 판별식으로 첫 진입 거리를 구한다.
- ray 뒤쪽, 판별식이 음수인 대상, 반지름이 음수인 대상, 사거리보다 먼 대상은 제외한다.
- 조준 방향은 판정 전에 다시 정규화한다.

### 정렬과 동일 거리 처리

- 후보는 ray 진입 거리 오름차순으로 정렬한다.
- 진입 거리가 같으면 `targetId` 문자열 오름차순을 결정적 tie-breaker로 사용한다.

### `maxTargets`, 비관통 및 관통

- `maxTargets`는 한 발이 명중시킬 수 있는 전체 대상 수다. 추가 관통 횟수가 아니다.
- 값은 내림한 정수로 사용한다.
- 현재 기본 무기는 `maxTargets: 1`이므로 가장 가까운 첫 대상만 맞고 판정을 끝낸다.
- 값이 2 이상인 설정을 주입하면 정렬된 가까운 대상부터 최대 해당 수만큼 명중한다.
- 현재 게임에는 관통 무기가 없지만 순수 hitscan 로직은 이 규칙을 지원한다.

### 탄도선 종료점

- 명중 수가 `maxTargets`에 도달하면 마지막으로 선택된 대상의 원 진입점이 종료점이다.
- 선택된 명중 수가 `maxTargets`보다 적으면 최대 사거리 지점이 종료점이다.
- 따라서 현재 비관통 기본 무기는 명중 시 첫 대상 진입점, 빗나가면 최대 사거리까지 tracer를 표시한다.

## 6. 게임 루프와 상태 흐름

### 게임 세션 상태

```text
playing
  └─ Player 최초 사망 → gameOver

gameOver
  ├─ Enter → Scene restart → 새 playing 상태
  └─ 기본 클릭/터치 → Scene restart → 새 playing 상태
```

Game Over에서는 이동, 무기 타이머, 재장전, 좀비 이동·공격, 웨이브 및 생성 업데이트를 실행하지 않는다. HUD와 재시작 입력만 유지한다.

### 웨이브 상태

```text
waiting
  └─ 대기 타이머 종료 → waveNumber 증가 → spawning

spawning
  └─ 설정 간격으로 남은 Zombie 생성
      └─ 생성 완료 → active

active
  ├─ 생존 Zombie 존재 → 유지
  └─ 생존 Zombie 0 → waiting
```

웨이브별 수는 `baseZombieCount + (waveNumber - 1) * zombiesPerWave`이며 최종 웨이브 제한은 없다.

### Scene update 순서

`playing` 상태의 한 update는 다음 순서다.

1. Player 이동 전 위치 저장
2. 무기 쿨다운·재장전 시간 갱신
3. R 입력 시 재장전 요청
4. WASD 입력으로 Player 이동 및 현재 플레이 영역 제한
5. Zombie 이동 전 위치 저장
6. 모든 Zombie를 Player 방향으로 이동
7. 이동 구간을 사용해 접촉 시간, 공격 쿨다운, 무적 시간과 Player 피해 계산
8. Player 사망이면 Game Over 전환, HUD와 피격 효과 갱신 후 update 종료
9. WaveSystem 갱신
10. 반환된 수만큼 현재 화면 경계와 Player 최소 거리를 사용해 Zombie 생성
11. HUD 갱신
12. 해당 update에서 발생한 Player 피격 효과 생성

### 포인터 발사 흐름

포인터 발사는 Scene update와 별도 입력 이벤트로 처리한다.

1. 기본 마우스 버튼 또는 주 포인터인지 확인
2. Game Over면 발사하지 않고 Scene restart
3. 포인터 좌표로 조준 방향 갱신
4. WeaponSystem에 발사 요청
5. 발사 실패면 탄약, 피해 및 효과 변경 없이 종료
6. 발사 성공이면 Zombie 목록으로 hitscan 계산
7. 선택된 대상에만 피해 적용
8. 최초 사망 Zombie를 즉시 destroy하고 목록에서 제거
9. HUD 갱신
10. 실제 hitscan 종료점의 발사 효과와 명중·사망 효과 생성

## 7. 프레임 독립성과 delta 정책

- Phaser가 제공하는 `deltaMs`를 밀리초 단위로 사용한다.
- 이동은 `speed * max(0, deltaMs) / 1000`으로 거리를 계산한다.
- 무기 쿨다운과 재장전 시간은 경과 delta만큼 감소한다.
- 웨이브는 남은 delta를 `while`에서 소비하므로 한 프레임이 여러 생성 간격을 지나도 생성 이벤트를 잃지 않는다.
- 접촉 공격은 이동 전·후 위치의 swept-circle 교차로 실제 접촉 시작·종료 시간을 구하고, 프레임 내부 공격 시점을 순서대로 소비한다.
- 큰 delta에서 여러 접촉 피해가 발생하면 각 피해 시간과 피해량을 결과 이벤트로 남긴다.
- delta 상한과 고정 timestep은 구현하지 않았다.
- 음수 delta는 핵심 순수 로직에서 0으로 제한한다.
- 매우 큰 delta는 결과를 보존하지만 한 update 안의 반복 계산량과 동시 효과 수를 늘릴 수 있다.

## 8. 테스트 구조와 대상

### 프로젝트 설정과 입력

- `projectSetup.test.ts`: 브라우저 진입점, portrait 차단 부재, responsive Phaser 설정과 safe-area CSS
- `fireInput.test.ts`: 기본 마우스·터치 허용, 우클릭·중간 버튼 등 비주 포인터 거부
- `aim.test.ts`: 방향 정규화와 0 벡터 fallback

### 이동과 반응형 경계

- `movement.test.ts`: delta 분할 이동 동등성, 대각선 정규화, 경계 제한, resize 후 위치 보정
- `spawn.test.ts`: portrait·landscape 가장자리 생성, Player 최소 거리 및 작은 화면 fallback

### hitscan과 무기

- `hitscan.test.ts`: 최근접 비관통, 다중 대상 관통 순서, 사거리, 동일 거리 ID tie-breaker, 원점 내부, 무효 방향
- `weapon.test.ts`: 발사 성공 시 탄약 소비, 쿨다운, 빈 탄창, 재장전 차단과 완료, 예비 탄약 제한

### 피해와 접촉 공격

- `damage.test.ts`: hitscan 선택 대상 피해, 최초 사망 한 번, 음수 피해 방어
- `contactDamage.test.ts`: 원 접촉, 실제 이동 접촉 시간, 좀비별 쿨다운, Player 무적, delta 분할 동등성, 큰 delta, 피해 이벤트와 사망

### 웨이브와 세션

- `wave.test.ts`: 초기 대기, 생성 간격, 전멸 조건, 증가 공식, 큰 delta 이벤트 보존
- `session.test.ts`: 새 playing 상태, Game Over 단일 전환, 새 상태를 사용하는 재시작

### HUD와 통합

- `hud.test.ts`: 읽기 전용 화면 모델, Game Over 안내, portrait stack, landscape split과 safe-area
- `mvpIntegration.test.ts`: 10웨이브의 이동·조준·hitscan·피해·재장전·웨이브 통합, Game Over 초기화, resize 후 좌표와 HUD 연계

자동 테스트는 Phaser 렌더링을 직접 검증하지 않는다. 실제 모바일 방향 전환, 브라우저 콘솔 및 장시간 플레이는 수동 검증 대상이다.

## 9. 완료된 구현 작업과 완료 조건

모든 작업은 완료 상태이며, 아래 항목은 현재 구현의 목적과 검증 기준을 요약한다.

### 작업 1 완료: 프로젝트 실행 기반

- 목적: Phaser 3, TypeScript, Vite, Vitest의 최소 브라우저 실행 환경 구축
- 범위: `main.ts`, `GameScene`, npm script와 최소 설정 테스트
- 핵심 규칙: 불필요한 게임 객체와 추상화를 선행하지 않음
- 완료 조건: 빈 Phaser 실행 기반, `npm test`, `npm run build` 성공

### 작업 2 완료: 플레이어 이동

- 목적: 단일 Player를 프레임 독립적으로 이동
- 범위: WASD 입력, 속도 정규화, 화면 경계 제한
- 핵심 규칙: 이동 수학은 Phaser 비의존 함수로 분리
- 완료 조건: 직선·대각선 이동과 delta 분할 테스트 통과

### 작업 3 완료: 순수 hitscan 판정

- 목적: 이동 Bullet 없이 즉시 명중 판정
- 범위: ray-circle 교차, 사거리, 정렬, `maxTargets`, 종료점
- 핵심 규칙: 효과와 피해를 hitscan 계산에서 분리
- 완료 조건: 비관통·다중 대상·동일 거리·무효 입력 테스트 통과

### 작업 4 완료: 기본 무기 연결

- 목적: 탄약과 시간 제약이 있는 기본 hitscan 무기 제공
- 범위: 탄창, 예비 탄약, 발사 간격, R 재장전, 포인터 발사
- 핵심 규칙: 발사 성공 시에만 탄약 소비와 hitscan 실행
- 완료 조건: 우클릭 차단, 0 조준 fallback, 발사·재장전 테스트 통과

### 작업 5 완료: 좀비와 피해

- 목적: 추적 가능한 단일 Zombie와 사격 피해 연결
- 범위: Zombie 체력, Player 추적, hitscan 선택 대상 피해와 제거
- 핵심 규칙: 추적 및 피해 계산은 순수 로직 또는 시스템에 둠
- 완료 조건: 피해, 최초 사망 및 추적 이동 테스트 통과

### 작업 6 완료: 무한 웨이브

- 목적: 종료 횟수 제한 없는 방어 모드 제공
- 범위: waiting/spawning/active 상태, 생성 간격, 웨이브별 수 증가
- 핵심 규칙: 생성 완료와 전멸을 모두 만족해야 다음 웨이브 진행
- 완료 조건: 큰 delta와 증가 공식 테스트 통과

### 작업 7 완료: 접촉 공격과 Player 피해

- 목적: Zombie 접촉 공격, Player 체력·무적·사망 구현
- 범위: 실제 이동 접촉 구간, 개별 공격 쿨다운, 피해 이벤트
- 핵심 규칙: 최종 위치만으로 전체 delta를 접촉 처리하지 않음
- 완료 조건: delta 분할 동등성, 동시 접촉, 큰 delta 및 사망 테스트 통과

### 작업 8 완료: Game Over와 재시작

- 목적: Player 사망 후 도메인 정지와 새 세션 시작
- 범위: playing/gameOver, Enter·터치 재시작, 상태 보유 시스템 재생성
- 핵심 규칙: 기존 세션 상태를 부분 수정하지 않고 Scene restart 사용
- 완료 조건: 단일 상태 전환, 새 세션·무기·웨이브 초기 상태 검증

### 작업 9 완료: 반응형 플레이 영역

- 목적: 다양한 viewport에서 canvas와 게임 좌표 유지
- 범위: camera viewport, 이동 경계, 기존 객체 제한, 현재 화면 기준 생성
- 핵심 규칙: resize로 세션과 웨이브를 초기화하지 않음
- 완료 조건: portrait·landscape 경계 및 생성 위치 테스트 통과

### 작업 10 완료: 반응형 HUD

- 목적: 필수 상태와 재시작 안내를 다양한 화면에서 표시
- 범위: 체력, 탄약, 재장전, 웨이브, Zombie 수, Game Over, safe-area
- 핵심 규칙: 읽기 전용 ViewModel과 Phaser Text 렌더러 분리
- 완료 조건: 상태 투영과 portrait·landscape 배치 테스트 통과

### 작업 11 완료: 최소 전투 시각 효과

- 목적: 발사, 피격 및 사망을 임시 도형으로 구분
- 범위: muzzle flash, tracer, Player·Zombie hit flash, Zombie death ring
- 핵심 규칙: 판정 완료 후 효과 생성, tween 종료 및 Scene 종료 시 정리
- 완료 조건: 발사 성공과 실제 명중·피해 이벤트에만 효과 호출

### 작업 12 완료: MVP 통합 검증과 밸런스

- 목적: 작업 1~11의 연결과 최소 10웨이브 진행 가능성 검증
- 범위: 중앙 설정, 유한 예비 탄약 300, 최소 생성 거리 160, 순수 통합 시뮬레이션
- 핵심 규칙: 동일 입력과 delta에서 결정적 결과, Phaser 없이 자동 실행
- 완료 조건: 10웨이브, Zombie 120마리, 240발 시뮬레이션과 전체 테스트·빌드 통과

## 10. 예상 성능 문제와 현재 대응

### hitscan 대상 탐색

발사마다 모든 생존 Zombie에 ray-circle 검사를 수행하고 후보 전체를 정렬하므로 `O(n log n)`이다. 현재는 생존 목록만 전달하며 MVP 규모에서 공간 분할을 구현하지 않았다.

### Zombie 수 증가

웨이브 수에 따라 생성 수가 선형 증가한다. 매 update의 Zombie 이동, 접촉 후보 생성 및 상태 복사는 대체로 `O(n)`이며 생존 상한은 없다. 장시간 플레이에서는 CPU 비용과 화면 중첩이 증가할 수 있다.

### Effect 생성과 제거

효과는 발사와 피해마다 Phaser 객체와 tween을 만든다. 각 효과는 70~180ms 후 제거되고 active set에서도 삭제되며, Scene 종료 시 남은 객체를 정리한다. 객체 풀은 구현하지 않았다.

### 객체 누적과 Scene 재시작

사망 Zombie는 즉시 destroy하고 목록에서 제거한다. Scene shutdown에서 포인터·resize 리스너, HUD 및 Effect를 정리하고 재시작 시 상태 보유 시스템을 새로 만든다. 현재 구조는 재시작에 따른 명시적 리스너와 효과 객체 중복을 방지한다.

### 큰 delta

무기, 웨이브와 접촉 공격은 큰 delta의 시간 및 이벤트를 소비한다. delta 상한이 없으므로 매우 큰 값에서는 한 update의 반복 횟수가 늘고 여러 Player 피격 효과가 같은 프레임에 겹칠 수 있다.

### Zombie 겹침

Zombie와 Player 사이, Zombie 상호 간 위치 분리나 물리 충돌 해결은 없다. Zombie는 Player 중심까지 이동할 수 있어 도형이 겹친다. 접촉 피해 판정은 정상적으로 수행되지만 시각적 겹침은 현재 알려진 제한이다.

### resize 비용

resize 이벤트마다 camera viewport와 Player, 모든 Zombie 위치를 현재 영역에 맞추고 HUD를 재배치하므로 `O(n)`이다. resize는 일반 update마다 실행되지 않는다.

## 11. 의도적으로 미룬 기능

- 오디오 재생과 브라우저 AudioContext 처리
- 정식 이미지, 스프라이트 시트와 애니메이션 상태 머신
- Projectile 및 폭발·범위 피해 시스템
- 복수 무기, 무기 교체와 무기별 발사 모드
- 캐릭터 선택, 스토리, 상점, 아이템과 성장 시스템
- 모바일 가상 이동 입력
- 저장 및 네트워크 기능
- ECS, 서비스 로케이터, 이벤트 버스 등 현재 규모에 필요하지 않은 범용 구조
- spatial hash, quadtree, 객체 풀 등 측정 전 최적화
- Zombie 충돌 분리와 넉백

## 12. 초기 설계와 실제 구현의 차이

- 초기 설계의 `HitscanSystem` 대신 `resolveHitscan` 순수 함수를 Scene이 직접 호출한다.
- 효과별 클래스 대신 `CombatEffects`가 최소 효과를 통합 관리한다.
- 별도 `src/types` 없이 타입을 사용하는 로직 파일에 함께 둔다.
- 재시작은 별도 Session 객체 그래프가 아니라 Phaser Scene restart를 사용한다.
- 반응형 처리는 고정 논리 해상도와 letterbox가 아니라 `Phaser.Scale.RESIZE`와 현재 canvas 크기를 사용한다.
- HUD는 DOM이 아니라 Phaser Text이며 CSS custom property로 safe-area 값을 읽는다.
- 무한 웨이브는 구현됐지만 무기는 유한 탄약이므로 무한 시간 동안 공격 가능함을 보장하지 않는다.

## 남은 검증과 알려진 문제

- 모바일 화면과 HUD는 반응형이지만 Player 이동 입력은 WASD뿐이다. 터치는 조준·발사와 Game Over 재시작에만 사용한다.
- 실제 모바일 기기의 세로·가로 방향 전환과 노치별 safe-area는 자동 브라우저 테스트로 검증하지 않았다.
- 실제 브라우저 10분 플레이와 콘솔의 처리되지 않은 예외 검사는 자동 테스트 범위가 아니다.
- 유한 예비 탄약 300은 자동 10웨이브를 통과하지만 무한 웨이브 전체를 보장하지 않는다.
- Zombie 충돌 분리가 없어 여러 도형이 하나로 겹칠 수 있다.
- Vite 빌드에서는 Phaser가 포함된 단일 chunk 크기 경고가 발생할 수 있다.

MVP 구현에 필요한 값은 현재 코드에서 결정되어 있으므로 사전 미결정 항목 섹션은 두지 않는다. 미래 기능의 상세 결정은 Post-MVP 문서에서 관리한다.
