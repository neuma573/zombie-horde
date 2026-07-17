# 모바일 자동 조준 보정 및 락온 표시 설계

## 1. 문서 상태와 작업 범위

이 문서는 `origin/main`의 `244e933` 구현을 기준으로 모바일 수동 조준 주변의 Zombie를 보조하는 소프트 락과 그 결과를 보여주는 최소 락온 표시를 설계한다.

이번 작업은 하나의 기능과 그 판정 결과를 표현하는 시각 피드백만 포함한다.

- 포함: 모바일 자동 조준 후보 필터, 결정론적 대상 선택, 락 유지·해제, `finalAimDirection`, 모바일 락온 도형
- 제외: 모바일 자동 재장전, 재장전 진행 UI, PC 자동 조준, 자동 사격, FOG OF WAR, 장애물 및 line-of-sight

## 2. 작업 목적

- PC의 WASD, 마우스 조준, 왼쪽 클릭 발사, R 재장전 및 기존 전투 판정을 유지한다.
- 모바일의 `manualAimDirection` 주변에 있는 화면 내 Zombie만 제한적으로 보정한다.
- 수동 방향과 실제 Player 회전·hitscan에 쓰는 `finalAimDirection`을 구분한다.
- 모바일 입력 계층이 Zombie 목록을 참조하지 않게 한다.
- 자동 조준 판정과 락온 도형을 분리한다.
- 사용자의 FIRE 요청 없이 발사하지 않는다.

## 3. 현재 구현 분석

### 입력과 조준

- `src/logic/playerInput.ts`의 `PlayerInputSnapshot.manualAimDirection`이 마지막 유효 수동 단위 방향을 보관한다.
- 후보 방향이 거의 0이면 `resolveAimDirection`이 이전 수동 방향을 유지한다.
- `GameScene.updateAimDirection`은 mouse와 모바일 aim touch 모두 같은 수동 방향을 갱신하고 즉시 Player를 회전한다.
- `GameScene.resolveFireRequest`는 현재 `manualAimDirection`을 `resolveHitscan`에 직접 전달한다.
- 모바일 조작 활성 여부는 `navigator.maxTouchPoints > 0`과 coarse primary pointer를 함께 사용한다.
- 모바일 UI가 활성화된 경우에만 touch를 모바일 입력으로 처리한다. 하이브리드 장치의 mouse 입력은 기존 PC 경로를 사용한다.

### Zombie 생명 주기

- `Zombie`는 `health`, Phaser GameObject의 `active`, 위치, `hitRadius`, 안정적인 문자열 `id`를 가진다.
- 별도의 `isAlive`, 제거 예정 또는 사망 애니메이션 상태는 없다.
- 사격으로 체력이 0이 되면 같은 `resolveFireRequest` 안에서 즉시 `destroy()`되고 현재 `zombies` 배열에서 제거된다.
- 따라서 후보 데이터는 현재 `zombies` 배열에 포함되고, `health > 0`이며, `active === true`인 객체에서만 만든다. 존재하지 않는 제거 예정 상태를 추가하지 않는다.

### 카메라와 전투 순서

- camera viewport는 현재 canvas 전체로 resize되며 camera scroll이나 zoom을 변경하는 코드는 없다.
- 화면 내 판정의 의미는 screen viewport가 아니라 camera가 현재 보여주는 월드 사각형이다. Phaser 통합부가 `camera.worldView`에 해당하는 순수 사각형 데이터를 전달한다.
- 현재 발사 순서는 입력 소비, `WeaponSystem.fire`, hitscan, 피해, 사망 객체 제거, HUD, tracer·피격·사망 Effect 순이다.
- 자동 조준은 발사 여부·탄약·피해·Effect 순서를 변경하지 않고 hitscan에 전달할 방향만 결정한다.
- 장애물, FOG, line-of-sight 시스템은 존재하지 않는다.

### 수명 주기

- 일반 resize는 모바일 입력을 유지하고 UI 배치만 갱신한다.
- 방향 전환, blur, visibility hidden, 입력 모드 변경, Game Over 및 shutdown은 모바일 입력 상태를 정리한다. lifecycle cancel은 조준 출처를 `none`으로 바꿔 새 aim touch 전까지 자동 조준을 재활성화하지 않는다.
- Scene restart는 같은 Scene을 새 상태로 다시 생성하며 기존 이벤트와 UI 객체는 shutdown에서 해제한다.

## 4. 입력 및 조준 정책

### PC

PC 흐름은 다음과 같다.

```text
mouse 위치
  → manualAimDirection
  → finalAimDirection = manualAimDirection
  → Player 회전 / Weapon / hitscan
```

- mouse aim 이벤트가 들어오면 현재 조준 출처를 PC로 기록하고 기존 모바일 락을 즉시 해제한다.
- 하이브리드 장치에서 모바일 UI가 보여도 mouse로 조준하는 동안 자동 보정을 적용하지 않는다.
- PC에는 락온 도형을 표시하지 않는다.

### 모바일

모바일 흐름은 다음과 같다.

```text
touch/drag 수동 조준
  → manualAimDirection
  → 자동 조준 후보 필터와 대상 선택
  → finalAimDirection
  → Player 회전 / Weapon / hitscan
```

- 모바일 조작 환경에서는 초기 조준 출처를 모바일로 둔다. 하이브리드 장치에서 mouse가 사용되면 PC로 바뀌고, 다음 aim touch가 들어올 때 다시 모바일로 바뀐다.
- blur, visibility hidden, pointer cancel 또는 방향 전환으로 입력이 취소되면 조준 출처를 `none`으로 바꾼다. 이후 update, 스틱 또는 FIRE만으로는 락을 재획득하지 않으며 새 aim touch가 들어와야 모바일로 돌아간다.
- 스틱, FIRE 및 RELOAD touch는 수동 조준 방향이나 조준 출처를 변경하지 않는다.
- 자동 조준은 FIRE 요청을 만들지 않으며 기존 `pendingFireCount`를 변경하지 않는다.

## 5. 데이터와 책임 경계

### 순수 자동 조준 로직

`src/logic/aimAssist.ts`에 Phaser 비의존 데이터와 함수를 둔다. 최소 입력은 다음 의미를 가진다.

- Player 월드 위치
- 유효한 `manualAimDirection`
- 현재 락 대상 ID 또는 `null`
- 현재 Zombie 목록에서 투영한 후보: `id`, 위치, 반경, health, active
- camera world view 사각형
- 모바일 보정 활성 여부
- 자동 조준 설정

순수 로직은 현재 무기 hitscan 사거리도 입력받아 선택된 `targetId`와 `finalAimDirection`을 반환한다. 대상이 없거나 보정이 비활성화되면 `targetId`는 `null`이고 최종 방향은 수동 방향과 같다.

### Scene 통합

`GameScene`은 다음만 담당한다.

- mouse와 mobile aim touch 중 현재 조준 출처 기록
- 현재 Zombie와 camera를 순수 후보 데이터로 투영
- 순수 자동 조준 함수 호출과 현재 락 ID 보관
- 반환된 하나의 `finalAimDirection`으로 Player 회전
- 발사 직전에 같은 상태를 다시 평가하고 동일한 최종 방향을 hitscan에 전달
- 수명 주기 이벤트에서 락 상태 정리

모바일 입력 및 포인터 소유권 로직은 Zombie를 알지 않는다.

### 시각 효과

`src/effects/AimAssistVisual.ts`는 선택된 Zombie의 위치와 반경만 받아 얇은 원 또는 네 모서리 reticle을 그린다. 판정 로직과 후보 선택에는 참여하지 않는다.

## 6. 설정값

`src/config/aimAssistConfig.ts`에 다음 최소 설정을 둔다.

| 설정 | 초기값 | 근거 |
|---|---:|---|
| 획득 반각 | 12도 | 권장 10~15도 안에서 화면 반대편 대상 선택을 막는 보수적 값 |
| 유지 반각 | 16도 | 획득보다 4도 넓어 경계 떨림 완화 |
| 최대 대상 거리 | 480px | 기본 hitscan 사거리 600px보다 좁혀 화면 전체 자동 선택을 제한 |
| viewport margin | 0px | 실제로 보이는 Zombie만 허용 |
| 각도 가중치 | 1.0 | 선택의 주 기준 |
| 거리 가중치 | 0.15 | 조준선 중앙의 조금 먼 대상을 보호 |
| 전환 페널티 | 0.08 | 유효한 기존 락의 작은 입력 변화에 대한 안정성 제공 |

각도 설정은 config에서 radians로 보관한다. Scene 안에 각도, 거리 또는 점수 숫자를 반복하지 않는다.

## 7. 후보 필터

새 대상은 다음 조건을 모두 만족해야 한다.

1. 모바일 자동 조준 경로가 활성화되고 Session이 `playing`이다.
2. 현재 Scene의 `zombies` 배열에 포함된다.
3. `health > 0`이고 Phaser `active === true`이다.
4. Player 중심에서 Zombie 중심까지 거리가 480px 이하이다.
5. Zombie 원이 camera world view와 교차한다.
6. Player에서 Zombie 중심을 향한 방향과 `manualAimDirection`의 각도 차이가 획득 반각 12도 이하이다.

현재 구현에는 제거 예정 상태가 없으므로 별도 플래그를 만들지 않는다. 현재 배열에서 사라졌거나 destroy된 대상은 후보 DTO에 포함하지 않는다. 장애물과 FOG 판정도 추가하지 않는다.

화면 경계에서는 Zombie 중심이 아니라 hit circle과 world view의 교차를 사용한다. 화면에 일부라도 실제로 보이는 기존 도형을 후보로 인정하며, `viewportMargin`은 초기 0이다.

## 8. 선택 점수와 결정성

각 후보는 다음 점수를 사용하며 낮을수록 우선한다.

```text
normalizedDistance = distance / maxTargetDistance
switchCost = candidate.id === currentTargetId ? 0 : switchPenalty

score =
  angleErrorRadians * angleWeight
  + normalizedDistance * distanceWeight
  + switchCost
```

- 각도 오차가 거리보다 우선하도록 각도 가중치 1.0, 거리 가중치 0.15를 사용한다.
- 현재 락이 없는 최초 선택에서는 모든 후보의 `switchCost`를 0으로 계산한다.
- 점수가 같으면 `id`의 오름차순으로 결정한다.
- 입력 배열 순서와 관계없이 동일한 데이터는 같은 대상을 반환한다.
- 점수순 후보의 중심 방향으로 `resolveHitscan(..., maxTargets: 1)`을 실행해 첫 명중 ID가 후보 자신일 때만 락할 수 있다.
- 더 가까운 Zombie가 ray를 가리면 그 Zombie가 후보 조건을 만족할 경우 해당 후보의 정상 점수 순서에서 선택되고, 후보 조건을 만족하지 않으면 가려진 원거리 대상에는 락하지 않는다.

## 9. 락 유지와 해제

현재 락 대상은 획득 후보보다 넓은 유지 반각 16도를 적용한다. 기존 대상도 health, active, 거리, 화면 교차 조건을 계속 만족해야 점수 비교에 참여할 수 있다.

- 기존 락에는 전환 페널티가 붙지 않고 다른 후보에만 페널티가 붙는다.
- 더 나은 후보가 페널티 차이까지 극복할 때만 대상이 바뀐다.
- 기존 대상이 획득 원뿔 밖이지만 유지 원뿔 안이면 유지 후보로만 참여한다.
- 사용자가 수동 방향을 유지 원뿔 밖으로 돌리면 기존 대상은 즉시 제외되고 정상 획득 후보 중 새 대상을 고른다.

다음 상황에서는 락을 즉시 해제한다.

- health가 0이 됨
- destroy 또는 현재 Zombie 배열에서 제거됨
- Phaser `active`가 false가 됨
- 최대 거리 또는 camera world view 밖으로 이동
- 수동 방향이 유지 반각 밖으로 이동
- 현재 조준 출처가 mouse로 변경됨
- 모바일 입력 모드 비활성화
- Game Over
- blur 또는 visibility hidden
- 방향 전환에 따른 전체 모바일 입력 reset
- Scene shutdown 또는 restart

일반 resize는 무조건 락을 지우지 않는다. 새 camera world view로 즉시 재평가해 여전히 유효하면 유지하고 화면 밖이면 해제한다.

## 10. `finalAimDirection`과 발사 일관성

- 락이 없으면 `finalAimDirection`은 `manualAimDirection`의 복사본이다.
- 락이 있으면 Player 위치에서 선택 대상 중심으로 향하는 단위 방향이다.
- Player와 대상 중심이 거의 같으면 NaN을 만들지 않고 `manualAimDirection`을 fallback으로 사용한다.
- Zombie와 Player가 이동하므로 모바일 보정 활성 중에는 Scene update마다 최종 방향을 다시 계산한다.
- aim touch가 움직인 시점에도 즉시 계산해 조작 반응을 갱신한다.
- FIRE pointerdown에서는 `WeaponSystem.fire()`를 호출하기 전에 현재 위치로 최종 방향을 한 번 계산하고 지역 변수에 고정한다.
- 그 발사에서 Player 회전과 `resolveHitscan`은 반드시 그 동일한 지역 `finalAimDirection`을 사용한다. 발사 도중 대상 사망·제거로 방향을 다시 계산하지 않는다.
- 무기 cooldown, 탄약 소비, hitscan 대상 순서, 피해, 사망 제거, HUD와 Effect 순서는 변경하지 않는다.

## 11. 모바일 락온 표시

- Phaser Graphics로 얇은 네 모서리 reticle을 그린다. 이미지 에셋은 추가하지 않는다.
- 현재 모바일 자동 조준 대상이 있을 때만 표시한다.
- Zombie의 현재 위치와 `hitRadius`를 사용하고 충돌·hitscan 반경에는 영향을 주지 않는다.
- 대상 변경과 이동에 따라 위치를 갱신한다.
- PC 조준 전환, 락 해제, 대상 사망, Game Over에서 즉시 숨긴다.
- 일반 resize에서는 선택 상태를 재평가한 결과에 따라 유지하거나 숨긴다.
- Scene create마다 한 번 만들고 shutdown에서 destroy해 restart 중복을 막는다.
- 시각 객체를 비활성화하거나 제거해도 순수 조준 결과는 같아야 한다.

## 12. 게임 루프 및 이벤트 흐름

### Scene update

1. Game Over면 락을 해제하고 락온 표시를 숨긴 뒤 기존 재시작 처리만 수행한다.
2. 기존 Weapon timer와 수동 재장전 요청을 처리한다.
3. 기존 PC/mobile movement로 Player를 이동한다.
4. 기존 Zombie 이동과 접촉 피해를 처리한다.
5. Player가 사망하면 락과 표시를 정리하고 Game Over로 전환한다.
6. 모바일 조준 출처일 때 현재 위치와 camera world view로 락과 `finalAimDirection`을 갱신한다. PC 조준 출처이면 수동 방향을 그대로 사용한다.
7. 기존 Wave와 Spawn을 처리한다.
8. HUD, Player 회전 및 락온 표시를 현재 상태에 맞게 갱신한다.

Wave spawn을 같은 frame에 바로 자동 획득할 필요는 없다. 새 Zombie는 다음 정상 update 또는 aim/fire 평가에서 후보가 된다.

### 발사 이벤트

1. 기존 primary mouse 또는 모바일 FIRE 입력과 Session 차단을 확인한다.
2. mouse 발사는 수동 방향을 사용하고 기존 락을 해제한다.
3. 모바일 FIRE는 현재 수동 방향과 현재 월드 상태로 락 및 최종 방향을 재평가한다.
4. 최종 방향을 지역 값으로 고정하고 Player 회전에도 적용한다.
5. 기존 `WeaponSystem.fire()`가 성공한 경우에만 동일 방향으로 hitscan한다.
6. 기존 피해, 사망 제거, HUD 및 Effect 순서를 유지한다.
7. 사망한 락 대상은 즉시 락과 표시에서 제거한다. 다음 후보 획득은 다음 정상 평가에서 수행한다.

## 13. 테스트 전략

### 순수 후보 필터

- health가 0인 Zombie 제외
- active가 false인 Zombie 제외
- 현재 후보 목록에 없는 ID를 기존 락으로 유지하지 않음
- 최대 거리 밖 제외
- 획득 원뿔 밖 제외
- hit circle이 camera world view와 교차하지 않으면 제외
- 자동 조준 비활성 시 대상 없음과 수동 방향 반환

### 대상 선택과 락

- 조준선 중앙의 조금 먼 Zombie가 원뿔 가장자리의 가까운 Zombie보다 우선
- 입력 순서를 바꿔도 동일한 ID 선택
- 완전히 같은 점수에서 ID 오름차순 선택
- 유효한 기존 락에 전환 페널티 적용
- 작은 수동 방향 변화에서 기존 락 유지
- 유지 원뿔 밖으로 방향을 바꾸면 해제 또는 정상적인 새 후보 선택
- 대상 사망·비활성·제거·거리 이탈·화면 이탈 시 해제

### 최종 방향과 통합 경계

- 락 없음: 최종 방향과 수동 방향 동일
- 락 있음: Player에서 대상 중심까지의 단위 방향
- Player와 대상 위치가 같은 경우 수동 방향 fallback 및 유한한 값
- PC 조준 경로는 항상 수동 방향 사용
- Player 회전과 한 발의 hitscan이 동일한 최종 방향을 소비
- 자동 조준 선택만으로 발사 요청이나 탄약 상태가 바뀌지 않음
- 혼잡한 배치에서 락 대상 ID와 같은 최종 방향의 비관통 hitscan 첫 명중 ID가 일치
- 후보 조건 밖의 가까운 Zombie가 ray를 가리면 뒤의 후보에 락하지 않음

### 수명 주기와 시각 효과

- Game Over, mouse 전환, blur, visibility hidden, 방향 전환에서 락 해제
- lifecycle cancel 뒤 update만 진행하거나 스틱·FIRE만 입력해도 재획득하지 않고, 새 aim touch 뒤에만 재활성화
- 일반 resize 후 화면 안 대상은 유지하고 화면 밖 대상은 해제
- 대상 사망 직후 락온 표시가 남지 않음
- 표시 활성 여부가 순수 조준 결과를 바꾸지 않음
- Scene restart 후 이전 target ID가 없음
- shutdown에서 reticle 객체 정리

Phaser 없이 가능한 후보 필터, 점수, 최종 방향은 `src/tests/aimAssist.test.ts`에서 검증한다. 실제 Scene 이벤트와 도형 수명 주기는 최소 통합 검증과 수동 브라우저 검증으로 구분한다. 기존 테스트는 삭제하거나 완화하지 않는다.

## 14. 수동 검증 시나리오

### PC

- 기존 WASD와 mouse 조준으로 5분 이상 플레이
- Zombie가 mouse 방향 근처에 있어도 커서 방향으로 정확히 회전·발사
- 모바일 UI가 보이는 하이브리드 환경에서 mouse 사용 시 락과 reticle이 없음
- R 재장전, cooldown, 탄약, tracer와 피해 순서가 기존과 같음

### 모바일

- 세로와 가로에서 수동 방향 근처 Zombie만 선택
- 반대편과 화면 밖 Zombie를 선택하지 않음
- 가까운 원뿔 가장자리 대상보다 조준선 중앙 대상을 우선
- 작은 drag에서 대상이 과도하게 바뀌지 않음
- 큰 방향 변경 시 기존 락 해제 또는 정상 변경
- 이동·aim·FIRE 멀티터치 중 Player 회전과 tracer 방향 일치
- 대상 사망 후 reticle이 즉시 사라짐
- 일반 주소창 resize에서 유효한 락 유지
- 방향 전환, 앱 전환, Game Over 및 restart 후 이전 reticle이 없음

실제 모바일 기기에서 수행하지 않은 항목은 검증 완료로 보고하지 않는다.

## 15. 완료 조건

- PC 입력, 조준, 발사, 재장전 및 게임 판정이 이전과 동일하다.
- PC와 mouse 조준에는 자동 보정이나 락온 표시가 없다.
- 모바일에서만 수동 방향 주변의 살아 있고 active인 화면 내 Zombie를 선택한다.
- 거리, 획득·유지 원뿔과 camera world view 조건이 적용된다.
- 점수와 ID tie-break로 결과가 결정론적이다.
- 작은 입력 변화에서는 기존 락이 안정적으로 유지된다.
- 큰 수동 방향 변경, 대상 사망·제거·비활성·거리·화면 이탈에서 락이 해제된다.
- Player 회전과 한 발의 hitscan이 동일한 `finalAimDirection`을 사용한다.
- 자동 조준만으로 발사하지 않는다.
- 모바일 락 대상에 판정과 분리된 Phaser 도형 reticle을 표시한다.
- Game Over, blur, visibility hidden, 방향 전환, restart 및 shutdown 뒤 락과 표시가 남지 않는다.
- 일반 resize는 유효한 락을 불필요하게 초기화하지 않는다.
- FOG, 장애물, line-of-sight, 자동 재장전 및 재장전 UI를 구현하지 않는다.
- 기존 테스트를 삭제하거나 완화하지 않는다.
- 구현 작업에서 `npm test`와 `npm run build`가 통과한다.

## 16. 제외 범위

- 모바일 자동 재장전
- PC·모바일 재장전 진행 UI
- PC 자동 조준
- 자동 사격
- 화면 전체 최단 거리 대상 선택
- FOG OF WAR와 적 가시성 시스템
- 장애물, pathfinding 및 line-of-sight
- 타깃 잠금 설정 UI와 보정 강도 UI
- 회전 보간
- 헤드샷과 부위 조준
- 복수 무기 및 무기별 자동 조준 규칙
- 스프라이트, 이미지 에셋, 오디오와 진동

## 17. 문서 자체 검토

- 실제 `GameScene`, `PlayerInputSnapshot`, `Zombie`, `WeaponSystem`, `resolveHitscan`, `CombatEffects`, camera resize 경로만 현재 구현으로 기술했다.
- 현재 없는 Zombie 제거 예정 상태, 장애물, FOG 또는 line-of-sight 인터페이스를 만들지 않는다.
- PC mouse 입력은 수동 방향을 최종 방향으로 그대로 사용한다.
- 모바일 입력 어댑터와 포인터 로직은 Zombie 목록을 참조하지 않는다.
- 획득·유지 원뿔, 거리, 화면 교차, 점수와 ID tie-break가 결정론적으로 정의됐다.
- `manualAimDirection`과 `finalAimDirection`의 의미 및 한 발 안에서의 일관성을 구분했다.
- 판정 로직과 Phaser reticle을 분리했다.
- 일반 resize와 전체 입력 reset 상황을 구분했다.
- 자동 재장전과 재장전 진행 UI는 별도 작업으로 제외했다.
- `AGENTS.md`의 단일 기능 작업, 판정/시각 효과 분리, 순수 로직 테스트 및 선행 구현 금지와 충돌하지 않는다.
- 구현 전에 추가 결정을 요구하는 중대한 모호성은 없다.
