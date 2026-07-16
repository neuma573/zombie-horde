# PC·모바일 적응형 입력 설계

## 1. 작업 목적

- PC의 WASD, 마우스 조준, 왼쪽 클릭 발사, R 재장전을 그대로 유지한다.
- 모바일에는 왼쪽 이동 스틱, 게임 영역 기반 시선 조작, 오른쪽 사격 버튼을 제공한다.
- 장치 이벤트를 공통 플레이어 입력 의도로 변환해 게임 규칙이 키 코드, 마우스 버튼, 포인터 ID를 알지 않게 한다.
- 수동 조준 결과를 명확히 제공해 향후 FOG OF WAR와 모바일 자동 조준을 그 다음 단계로 추가할 수 있게 한다.
- 이번 작업에서는 FOG OF WAR, 적 가시성, 자동 조준, 타깃 잠금, 자동 사격을 구현하지 않는다.

## 2. 현재 구현 분석

### 입력과 게임 규칙의 현재 흐름

- `src/scenes/GameScene.ts`가 Phaser 입력을 직접 등록하고 해제한다.
- 이동은 `WASD` 상태로 축별 `-1/0/1` 값을 만들고 `logic/movement.ts`의 `moveWithinBounds`에 전달한다. 이 함수가 입력을 정규화하므로 대각선 속도는 증가하지 않는다.
- 조준은 `POINTER_MOVE`에서 `pointer.worldX/worldY`와 Player 위치의 차이를 구하고 `logic/aim.ts`의 `resolveAimDirection`으로 정규화한다. 0에 가까운 입력은 `lastAimDirection`을 유지한다.
- Player 회전과 hitscan은 같은 `lastAimDirection`을 사용한다.
- 발사는 전역 `POINTER_DOWN`에서 `logic/fireInput.ts`로 기본 버튼인지 확인한 뒤 조준 갱신, `WeaponSystem.fire()`, `resolveHitscan`, 피해 및 Effect 순으로 처리한다.
- 재장전은 Scene update에서 R의 `JustDown`을 확인해 `WeaponSystem.reload()`를 호출한다.
- `WeaponSystem`은 순수 `logic/weapon.ts` 상태 전이를 감싸며 장치 입력을 알지 않는다.
- 모바일 전용 UI나 포인터 소유권은 없다. 현재 터치도 기본 포인터 입력으로 취급되어 터치 위치로 조준한 뒤 즉시 발사한다.

### 반응형, HUD, 수명 주기

- `src/main.ts`는 `Phaser.Scale.RESIZE`와 100% 크기를 사용한다.
- `GameScene.resizePlayArea`가 camera viewport와 플레이 영역을 현재 game size로 갱신하고 Player와 Zombie를 경계 안으로 제한한다.
- `HudSystem`은 Phaser Text를 사용하며 `logic/hud.ts`가 viewport와 safe-area 기반 배치를 계산한다.
- `index.html`은 `viewport-fit=cover`, `100dvh`, CSS `env(safe-area-inset-*)`를 custom property로 제공한다.
- Game Over에서는 도메인 update를 중단하고 Enter 또는 기존 포인터 입력으로 `scene.restart()`한다.
- Scene shutdown에서 pointer와 resize 리스너, HUD, Effect를 정리한다.

### 변경 지점

- `GameScene`의 장치별 입력 해석과 게임 동작 실행 사이에 공통 입력 상태를 둔다.
- 기존 PC 이벤트는 이 상태를 갱신하도록 옮기되 PC의 타이밍과 게임 판정 순서는 유지한다.
- 모바일 포인터 역할, 스틱 계산, control layout은 순수 로직과 Phaser UI로 나눈다.
- 방향 전환, blur, visibility, pointer cancel, shutdown, Game Over에서 모바일 입력 상태를 해제한다. 일반 resize에서는 입력을 유지한다.

## 3. 입력 정책

### PC

- WASD로 이동한다.
- 마우스 위치로 Player 시선과 hitscan 조준 방향을 정한다.
- 마우스 왼쪽 버튼을 누른 시점에 한 번 발사한다. 현재 무기의 단발 입력 정책을 바꾸지 않는다.
- R로 재장전한다.
- 모바일 기능 추가로 기존 cooldown, 탄약 소비, 피해, hitscan 및 Effect 규칙을 바꾸지 않는다.

### 모바일

- 왼쪽 아래 고정형 가상 스틱으로 이동한다. 고정형은 좁은 세로 화면에서도 위치를 예측할 수 있고 HUD와 분리된 하단 영역을 안정적으로 확보한다.
- 스틱과 조작 버튼이 아닌 게임 영역을 터치하거나 드래그해 시선을 바꾼다.
- 오른쪽 아래의 별도 `FIRE` 버튼으로 발사한다. 버튼을 누른 시점에 기존 단발 발사 요청을 한 번 만든다.
- 현재 무기는 수동 재장전만 지원하므로 `FIRE` 위의 작은 `RELOAD` 버튼으로 기존 `WeaponSystem.reload()`를 요청한다. 자동 재장전은 추가하지 않는다.
- 이동, 시선, 사격은 서로 다른 포인터를 동시에 소유할 수 있다.

## 4. 공통 입력 경계

공통 입력 상태는 다음 의미만 제공한다.

- 정규화 전후와 무관하게 게임 이동에 전달할 `movement` 벡터
- 마지막 유효 수동 단위 벡터인 `manualAimDirection`
- 발생 횟수를 보존하며 한 번씩 소비되는 `pendingFireCount`
- 한 번 소비되는 `reloadRequested`

게임 규칙은 키보드 키 코드, 마우스 버튼, `pointerType`, 포인터 ID를 직접 보지 않는다. Scene의 입력 어댑터가 PC와 모바일 이벤트를 공통 상태로 변환하고, update 및 발사 처리 경로가 이를 소비한다.

공통 입력의 `manualAimDirection`은 마지막으로 유효했던 수동 시선을 뜻한다. 현재 Player 회전과 hitscan 발사 방향은 이 값을 그대로 사용한다. 후보 조준 벡터가 0에 가까우면 마지막 방향을 유지한다.

향후 자동 조준은 `수동 입력 의도 → 가시성/자동 조준 보정 → 최종 조준 방향` 사이에 추가한다. 이번 작업에는 자동 조준 결과 타입, FOG 인터페이스 또는 빈 시스템을 만들지 않는다.

## 5. 모바일 입력 세부 규칙

### 입력 모드 판별

- User-Agent 문자열은 사용하지 않는다.
- `navigator.maxTouchPoints > 0`과 `matchMedia('(pointer: coarse)')`를 함께 만족할 때 모바일 조작 UI를 표시한다.
- 실제 이벤트는 Phaser의 touch pointer 여부로 라우팅한다. 모바일 UI가 활성화된 경우에만 touch 이벤트를 모바일 조작으로 처리하며, UI가 비활성화된 환경의 touch 이벤트는 게임 입력으로 사용하지 않는다.
- 하이브리드 장치에서는 모바일 UI가 표시된 상태에서도 마우스 PC 조작을 허용한다. coarse primary pointer가 아닌 터치 노트북에서는 PC UI를 유지하고 touch 게임 입력도 비활성화한다.

### 이동 스틱

- safe-area를 제외한 viewport 왼쪽 아래에 고정 배치한다.
- 바깥 반경과 손잡이 크기, 데드존은 `config/inputConfig.ts`에 둔다.
- 중심에서 포인터까지의 displacement를 최대 반경으로 제한한 뒤 최대 길이 1인 이동 벡터로 바꾼다.
- 데드존 안은 `(0, 0)`이고, 그 밖은 데드존 이후 범위를 0~1로 재매핑한다.
- 포인터가 스틱 원에서 시작할 때만 이동 소유권을 얻는다. 이후 화면 중앙을 넘어도 pointerup/cancel까지 이동 역할을 유지한다.
- 상단 HUD와 반대쪽 하단 버튼 영역을 피한다.

### 시선 조작

- 어떤 control 또는 HUD 제외 영역에도 속하지 않는 touch pointerdown이 aim 소유권을 얻는다.
- Phaser pointer의 현재 camera 기준 `worldX/worldY`를 사용하고 Player 위치에서 해당 월드 지점을 향하는 방향을 계산한다.
- aim 포인터의 이동 중 방향을 계속 갱신한다. 손을 떼어도 마지막 유효 방향은 유지한다.
- Player와 터치 지점이 거의 같으면 기존 마지막 방향을 유지한다.
- 이동, 사격, 재장전 포인터는 aim 입력으로 전달하지 않는다.

### 사격과 재장전 버튼

- safe-area를 제외한 오른쪽 아래에 `FIRE`, 그 위에 `RELOAD`를 배치한다.
- `FIRE` 원 안에서 시작한 pointer는 fire 역할을 소유하고, 한 번의 공통 발사 요청을 만든다. 누르고 있는 동안 추가 연사는 만들지 않아 기존 단발 정책을 유지한다.
- fire 포인터는 aim을 바꾸지 않는다.
- `RELOAD` 버튼은 한 번의 공통 재장전 요청을 만든다.
- 탄약 부족, cooldown, 재장전 중, Game Over 차단은 기존 Weapon 및 Session 규칙에 맡긴다.

### 멀티터치 소유권과 해제

- 이동, 시선, 사격, 재장전은 각각 포인터 ID 하나를 소유할 수 있다.
- pointerdown에서 한 역할만 할당하고 종료 전 역할을 변경하지 않는다.
- 한 포인터가 둘 이상의 역할을 갖지 않는다. 이미 점유된 역할을 두 번째 포인터가 빼앗지 않는다.
- pointerup, pointerupoutside, native pointercancel에서 해당 포인터 소유권을 해제한다. 이동 해제는 movement를 0으로 만들고, fire/reload의 미소비 요청도 안전 초기화 상황에서는 제거한다.
- window blur, document visibility hidden, 방향 전환, Game Over, Scene shutdown 및 재시작에서 모든 모바일 소유권과 일회성 요청을 초기화한다.
- 일반 resize는 브라우저 주소창 변화로도 자주 발생하므로 소유권과 입력을 유지하고 UI 배치만 갱신한다.

## 6. 반응형 및 safe-area

- 모바일 세로를 기본 사용 환경으로 하되 가로에서도 같은 조작을 제공한다.
- resize와 방향 전환은 session을 재시작하지 않는다. 일반 resize는 플레이 영역, HUD, control layout만 재계산하고 입력을 유지하며, 세로와 가로가 바뀌는 방향 전환만 모바일 입력을 해제한다.
- `index.html`의 CSS safe-area custom property를 그대로 읽어 HUD와 control layout에 함께 사용한다.
- 스틱과 버튼의 원 전체가 safe-area 안에 있도록 중심을 배치한다. 작은 viewport에서는 반경을 설정 최소값까지 축소한다.
- HUD 제외 영역은 상단 safe-area와 현재 HUD의 세로 stack을 고려하며, control은 하단에 배치한다.
- canvas에 `touch-action: none`, 사용자 선택 및 길게 누르기 억제를 적용해 스크롤, 확대, 선택 메뉴가 조작을 가로채지 않게 한다.

## 7. 설계 경계

현재 흐름:

```text
장치별 입력
  → 공통 플레이어 입력 의도
  → 마지막 유효 조준 방향
  → 이동 / Player 방향 / Weapon / Hitscan
```

향후 흐름:

```text
수동 입력 의도
  → 가시성 및 자동 조준 보정
  → 최종 조준 방향
  → Player 방향 / Weapon / Hitscan
```

이번 작업은 첫 흐름만 구현한다. 입력 계층은 Zombie 목록, Wave, FOG 상태를 참조하지 않는다.

## 8. 테스트 전략

### 자동 테스트

- 스틱 displacement가 최대 길이 1인 movement로 변환되는지
- 데드존 내부가 0이고 최대 반경 밖이 제한되는지
- screen/world 지점 후보가 단위 aim이 되고 0에 가까울 때 마지막 방향을 유지하는지
- PC와 모바일이 같은 공통 의도를 만들면 기존 이동 및 aim 순수 로직 결과가 같은지
- 포인터 역할이 하나만 할당되고 종료 전 바뀌지 않는지
- pointer release/cancel 및 전체 reset 후 이동과 요청이 남지 않는지
- portrait/landscape와 safe-area에서 control 원이 viewport 안에 배치되는지
- Game Over/restart에 사용하는 reset이 공통 상태를 초기화하는지
- 기존 aim, movement, fire input, weapon, hitscan, session 테스트가 그대로 통과하는지

### 수동 검증

- 실제 브라우저의 마우스/키보드 감각, 실제 멀티터치, native pointercancel, 앱 전환, 주소창 변화, safe-area, 방향 전환은 브라우저 또는 기기에서 확인한다.
- 자동화가 정확한 멀티터치를 제공하지 못하면 해당 항목을 통과로 간주하지 않는다.

## 9. 완료 조건

- PC WASD, 마우스 조준, 왼쪽 클릭 1회 발사, R 재장전이 이전과 동일하다.
- 모바일 세로와 가로에서 왼쪽 스틱으로 이동한다.
- 모바일 게임 영역의 터치/드래그가 시선을 바꾸며 손을 떼도 마지막 방향이 유지된다.
- 별도 사격 버튼으로 발사하고 이동·시선·사격을 서로 다른 손가락으로 동시에 수행할 수 있다.
- 스틱, 사격, 재장전 및 HUD 입력은 시선을 바꾸지 않는다.
- Player 시선과 hitscan 방향이 같다.
- pointercancel, blur, visibility hidden, 방향 전환, Game Over 이후 이동이나 요청이 남지 않는다. 일반 resize에서는 진행 중인 입력을 유지한다.
- 모바일 Game Over는 사망 시점에 눌려 있던 모든 touch pointer가 해제된 뒤에만 새 touch로 재시작할 수 있다.
- 반복 restart에서 이벤트와 UI가 중복되지 않는다.
- resize/방향 전환 후 control이 safe-area 안에 재배치된다.
- PC 환경에는 모바일 UI가 표시되지 않는다.
- FOG OF WAR와 자동 조준이 없다.
- 기존 테스트를 삭제하거나 완화하지 않고 `npm test`와 `npm run build`가 통과한다.

## 10. 제외 범위

- FOG OF WAR와 시야 렌더링
- 적 가시성 판정
- 자동 조준, 타깃 잠금 및 자동 사격
- 스프라이트와 애니메이션
- 오디오와 진동
- 모바일 설정 메뉴와 명시적 모드 전환 UI
- 게임패드 입력
- 복수 무기와 Player 능력치 변경

## 11. 수동 검증 시나리오

- PC에서 기존 조작으로 5분 이상 플레이
- 모바일 세로에서 이동과 시선 동시 조작
- 모바일 세로에서 이동, 시선, 발사 동시 조작
- 모바일 가로에서 같은 조작
- 이동 중 손가락을 화면 및 canvas 밖으로 이동
- 사격 중 pointercancel
- 앱 전환 후 복귀와 document visibility 변경
- 브라우저 주소창 표시/숨김에 따른 resize
- 실행 중 세로/가로 전환
- Game Over 후 터치/Enter 재시작 반복
- 빠른 멀티터치 시작과 종료
- 사격 버튼을 누른 상태에서 다른 손가락으로 시선 이동

## 문서 자체 검토

- 실제 파일인 `GameScene`, `Player`, `WeaponSystem`, `logic/aim.ts`, `logic/movement.ts`, `logic/hitscan.ts`, `HudSystem`만 현재 구현으로 기술했다.
- PC의 입력과 게임 판정 타이밍을 유지하고 장치 이벤트 변환만 공통 경계로 옮긴다.
- FOG와 자동 조준 구현 또는 미래용 빈 타입을 포함하지 않는다.
- 네 모바일 역할의 할당, 유지, 해제 우선순위가 명확하다.
- resize, safe-area, pointercancel, blur, visibility, Game Over, restart 정리를 포함한다.
- Phaser 통합 UI와 스틱/layout/ownership 순수 로직을 분리한다.
- `AGENTS.md`의 반응형 모바일, 판정/효과 분리, 프레임 독립성 및 과도한 선행 구현 금지와 충돌하지 않는다.
- 구현을 중단해야 할 중대한 모호성은 없다.
