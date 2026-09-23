# Zombie Horde: The Last Stand
## Night Combat System 개발 상세 문서

---

# 1. 문서 목적

본 문서는 `Zombie Horde`의 **The Last Stand 모드 야간 전투 시스템**의 개발 요구사항을 정의한다.

The Last Stand는 하나의 도시에서 계속 방어하는 고정형 디펜스 모드가 아니다.

플레이어는 여러 도시를 이동하며 생존하고, 각 도시에서 낮 동안 물자를 확보하고 방어 준비를 한 뒤 밤에는 해당 도시의 임시 거점을 방어한다.

각 도시의 방어 환경은 서로 다르다.

예를 들어 첫 번째 도시인 **Hazard**는 방어에 유리한 건물 내부에 거점을 잡고 있기 때문에 한 방향의 진입로만 방어하면 된다.

반대로 게임 후반 도시에서는 여러 방향에서 좀비가 진입하며, 플레이어와 동료가 여러 방어선을 동시에 유지해야 할 수 있다.

따라서 전투 시스템은 특정 맵의 구조를 하드코딩하지 않고 **도시별 방어 구조를 데이터 기반으로 표현할 수 있어야 한다.**

---

# 2. The Last Stand 전체 게임 루프

The Last Stand의 기본 진행은 다음과 같다.

```text
Day 시작

↓

낮 시간 탐색

↓

식량 / 탄약 / 연료 획득

↓

생존자 발견 및 동료 영입

↓

바리케이드 수리 및 방어 준비

↓

무기고에서 무기 배정

↓

23:00

↓

야간 방어전

↓

05:00

↓

생존 성공

↓

다음 Day

↓

도시 내 활동 또는 다음 도시로 이동
```

게임은 여러 Day와 여러 도시를 거치면서 진행된다.

야간 방어전은 이 전체 게임 루프 중 하나의 핵심 단계이다.

---

# 3. 이번 개발의 기본 원칙

The Last Stand를 위해 기존 Zombie Horde 전투 시스템 전체를 다시 만들지 않는다.

기존에 구현되어 있는 다음 시스템을 최대한 재사용한다.

- 플레이어 이동
- 조준
- 사격
- 근접 공격
- 재장전
- 무기 전환
- 총기별 탄창
- 총기별 발사 속도
- 명중 및 피격 판정
- 좀비 체력
- 좀비 사망
- 좀비 이동
- 전투 효과
- 기존 카메라
- PC 입력
- 모바일 입력
- 기존 Game Time 시스템

The Last Stand에서는 기존 전투 위에 **별도의 게임 규칙을 추가한다.**

```text
Existing Combat Engine
        │
        │ reuse
        ▼
Last Stand Combat Rules
```

기존 Horde 모드와 The Last Stand가 서로 다른 규칙을 사용할 수 있어야 한다.

---

# 4. 핵심 설계 방향

The Last Stand의 야간 전투는 다음 요소의 조합으로 구성한다.

```text
City
 └─ Defense Layout
      ├─ Defense Sector
      │    ├─ Barricade
      │    └─ Zombie Inflow
      │
      ├─ Defense Sector
      └─ ...
```

즉 핵심 단위는 단순히 `Barricade` 하나가 아니라 다음 세 단계이다.

```text
도시
→ 방어 구조
→ 방어 구역(Defense Sector)
```

초기 도시에서는 Defense Sector가 하나일 수 있다.

후반 도시에서는 여러 개가 존재할 수 있다.

---

# 5. 도시별 방어 구조

모든 도시가 같은 구조를 사용하지 않는다.

각 도시의 야간 방어 맵은 별도의 구조를 가진다.

예:

```text
Hazard
Defense Sectors: 1
Difficulty: Easy
```

후반 도시 예:

```text
City B
Defense Sectors: 2
```

```text
City C
Defense Sectors: 3
```

최종 지역 예:

```text
Final City
Defense Sectors: 4
```

단순히 좀비의 체력과 숫자만 증가시키는 방식으로 난이도를 높이지 않는다.

**플레이어가 관리해야 하는 방어 방향 자체가 증가하는 것**도 핵심 난이도 요소이다.

---

# 6. Hazard의 역할

Hazard는 The Last Stand에서 처음 등장하는 도시이다.

따라서 전투 구조도 가장 단순하다.

Hazard에서 플레이어는 슈퍼마켓과 유사한 건물 내부에 방어 거점을 구축한다.

건물 내부로 연결되는 주요 진입로는 하나뿐이다.

플레이어는 해당 진입로를 바리케이드로 차단한다.

개념:

```text
OUTSIDE / ENTRANCE

Zombie
Zombie
Zombie
   ↓
   ↓
   ↓

===================
    BARRICADE
===================

     Player

     Allies

BUILDING INTERIOR
```

Hazard에서는 플레이어가 한 방향만 관리하면 된다.

따라서 플레이어는 다음 시스템을 자연스럽게 학습할 수 있다.

- 좀비 유입
- 사격
- 재장전
- 바리케이드 방어
- 바리케이드 내구도
- 동료
- 방어 실패

Hazard는 사실상 **Last Stand 전투 튜토리얼 역할**을 한다.

---

# 7. Hazard 콘티

Hazard의 맵 제작에는 제공된 콘티를 참고한다.

기존 프로젝트 기준:

```text
docs/references/barricade situation.png
```

콘티는 정확한 타일 배치를 의미하지 않는다.

다음 요소의 관계를 보여주기 위한 공간 설계 자료이다.

```text
좀비 유입 방향
        →
        →
        →

                         █████
                         █   █
                         █   █
                         █████
                       Barricade
```

핵심은 다음이다.

```text
Zombie Spawn
      ↓
Zombie Inflow
      ↓
Approach Area
      ↓
Barricade
      ↓
Player Defense Area
```

그래픽이나 정확한 크기는 실제 개발 과정에서 조정할 수 있다.

---

# 8. 후반 도시

Hazard의 구조를 모든 도시에 그대로 적용하지 않는다.

게임이 진행될수록 방어하기 불리한 장소를 사용하게 된다.

예:

## 2방향 방어

```text
Zombie →
Zombie →

        BARRICADE A

          Player

        BARRICADE B

Zombie →
Zombie →
```

플레이어는 두 방어선을 동시에 확인해야 한다.

---

## 3방향 방어

```text
        Zombie
          ↓

      Barricade A

Zombie → B         C ← Zombie

          Player
```

---

## 4방향 방어

```text
           Zombie
             ↓

        Barricade A

Zombie → B Player C ← Zombie

        Barricade D

             ↑
           Zombie
```

후반으로 갈수록 플레이어가 직접 이동해야 하는 거리와 관리해야 하는 방어선 수가 늘어난다.

---

# 9. Defense Sector

각 공격 방향을 `Defense Sector`라는 논리적 단위로 관리한다.

예:

```ts
interface DefenseSector {
    id: string;

    barricadeId: string;

    zombieSpawnAreas: ZombieSpawnArea[];

    approachArea: Area;

    breachArea: Area;
}
```

실제 인터페이스 구조는 기존 프로젝트 스타일을 따른다.

중요한 것은 **방어 방향을 데이터로 표현할 수 있어야 한다는 것**이다.

예:

```text
Hazard

Sector A
 ├─ Spawn Area
 ├─ Approach Path
 └─ Barricade
```

후반 도시:

```text
Sector A
Sector B
Sector C
Sector D
```

---

# 10. 도시 전투 설정

도시별 전투 구조는 Scene 코드 내부에 흩어져서 하드코딩하지 않는다.

개념적으로 다음과 같은 설정을 사용할 수 있다.

```ts
interface CityDefenseConfig {
    cityId: string;

    sectors: DefenseSectorConfig[];

    playerSpawn: Position;

    allyPositions: Position[];

    combatArea: Area;
}
```

예:

```ts
const hazardDefense = {
    cityId: "hazard",

    sectors: [
        {
            id: "mainEntrance",
            barricadeId: "hazard-main",
        }
    ]
};
```

후반 도시에서는 단순히 sector를 추가할 수 있어야 한다.

```ts
sectors: [
    north,
    east,
    south,
    west
]
```

---

# 11. 전투 시작 시간

야간 방어전은 매일 다음 시간에 시작한다.

```text
23:00
```

전투 종료 시간은 다음이다.

```text
05:00
```

따라서 게임 시간 기준 야간 전투 시간은 총 6시간이다.

기존에 구현된 Time System을 사용한다.

별도의 Last Stand용 시간 시스템을 만들지 않는다.

---

# 12. 전투 종료

다음 조건을 만족하면 야간 방어에 성공한다.

```text
Current Time >= 05:00

AND

Player Alive
```

전투 성공:

```text
05:00

↓

Defense Complete
```

이후 다음 Day 진행 시스템으로 연결할 수 있다.

다음 Day 처리 자체는 별도 기능으로 구현할 수 있다.

---

# 13. 플레이어 전투

플레이어의 전투 방식은 기존 Zombie Horde와 동일하다.

PC 기준 예:

```text
WASD
→ 이동

Mouse
→ 조준

Left Click
→ 공격

R
→ 재장전

1 / 2
→ 무기 전환
```

모바일 역시 기존 모바일 전투 입력을 사용한다.

The Last Stand 전용 조작 체계를 별도로 만들지 않는다.

---

# 14. 플레이어 이동 범위

플레이어는 해당 도시의 방어 거점 내부에서 이동할 수 있다.

도시마다 이동 가능 영역은 다르다.

Hazard에서는 건물 내부의 제한된 구역을 이동한다.

플레이어가 전투 중 도시 전체를 돌아다니는 형태는 아니다.

개념:

```text
Combat Area
```

를 정의하고 플레이어는 해당 영역 내부에서만 이동한다.

---

# 15. 탄약 규칙

The Last Stand 야간 전투에서 플레이어는 **무제한의 예비 탄약**을 가진다.

다만 탄창은 무제한이 아니다.

예:

```text
Magazine Capacity: 15

Current Magazine: 15

Reserve Ammo: Infinite
```

사격:

```text
15
↓
14
↓
13
↓
...
↓
0
```

탄창이 비면 기존과 동일하게 재장전해야 한다.

```text
Magazine 0

↓

Reload

↓

Magazine 15
```

따라서 다음 시스템은 그대로 유지된다.

- 탄창 용량
- 재장전
- 재장전 시간
- 재장전 애니메이션
- 총기별 탄창 차이

무제한인 것은 **Reserve Ammo**뿐이다.

---

# 16. 낮 시간 Ammo 자원과의 차이

탐색 시스템에는 다음 자원이 존재한다.

```text
Food
Ammo
Fuel
```

여기서 `Ammo`는 야간 전투 중 플레이어가 직접 사용하는 총알 개수와 동일한 개념이 아니다.

현재 Last Stand 기본 규칙에서는 플레이어 전투 중 예비 탄약은 무제한이다.

따라서 탐색을 통해 얻는 `Ammo` 자원의 실제 하루 소비 규칙은 야간 전투의 실시간 총알 소비와 분리한다.

이 두 개념을 코드에서 혼동하지 않는다.

---

# 17. 바리케이드

각 Defense Sector에는 기본적으로 하나의 방어선이 존재한다.

대표적인 방어선은 바리케이드이다.

바리케이드는 내구도를 가진다.

```text
0% ~ 100%
```

예:

```text
100%
75%
50%
25%
10%
0%
```

---

# 18. 바리케이드 초기 내구도

바리케이드의 야간 시작 내구도는 낮 동안 플레이어가 수행한 수리 결과를 사용한다.

기존 탐색 시스템 요구사항에서는 바리케이드 수리가 이미 정의되어 있다.

예:

```text
Day 시작

Barricade 50%

↓

Repair 6 Hours

↓

Barricade 80%

↓

Night Combat 시작

Barricade 80%
```

따라서 야간 전투용 바리케이드를 별도로 초기화하지 않는다.

낮에 관리된 상태를 그대로 사용한다.

---

# 19. 다중 바리케이드

여러 Defense Sector가 존재하는 도시에서는 바리케이드도 독립적으로 존재할 수 있다.

예:

```text
North Barricade  80%

East Barricade   65%

South Barricade  100%

West Barricade   45%
```

모든 바리케이드를 하나의 통합 HP로 처리하지 않는다.

각 방어선의 상태를 독립적으로 관리할 수 있어야 한다.

---

# 20. 좀비 Spawn

좀비는 각 Defense Sector에 연결된 Spawn Area에서 생성된다.

Hazard:

```text
Sector A

Spawn Area A
```

후반 도시:

```text
Sector A
→ Spawn A

Sector B
→ Spawn B

Sector C
→ Spawn C
```

각 Sector는 자신의 진입 방향을 가진다.

---

# 21. 좀비 목표 우선순위

바리케이드가 살아 있는 동안 해당 Sector에서 생성된 좀비의 기본 목표는 플레이어가 아니다.

기본 목표는 해당 Sector의 바리케이드이다.

```text
Zombie
   ↓
Assigned Barricade
```

즉:

```text
Spawn Sector A

↓

Barricade A
```

가 기본이다.

Sector A에서 생성된 좀비가 아무 이유 없이 Sector C의 바리케이드로 이동해서는 안 된다.

---

# 22. 좀비 접근

기본 좀비 행동:

```text
Spawn

↓

Sector Barricade 탐색

↓

Barricade 방향으로 이동

↓

Attack Range 진입

↓

Barricade 공격
```

플레이어가 근처에 있더라도 바리케이드가 존재하는 동안 기본 목표는 바리케이드이다.

---

# 23. 바리케이드 공격

좀비가 바리케이드 공격 거리까지 도달하면 바리케이드를 공격한다.

```text
Zombie Attack

↓

Barricade Damage

↓

Barricade Integrity 감소
```

구체적인 공격력과 공격 주기는 밸런스 값으로 관리한다.

예:

```ts
barricadeDamage
attackInterval
```

초기 구현 단계에서 Scene 내부 여러 위치에 숫자를 하드코딩하지 않는다.

---

# 24. 플레이어의 전투 목적

플레이어의 목적은 좀비가 바리케이드에 충분히 도달하기 전에 제거하는 것이다.

```text
Zombie Spawn

↓

Player Fire

↓

Zombie Kill
```

제거하지 못한 좀비:

```text
Zombie

↓

Barricade

↓

Barricade Damage
```

따라서 기본 전투 루프는 다음이다.

```text
좀비 생성

↓

좀비 접근

↓

플레이어 공격

↓

일부 제거

↓

생존 좀비 바리케이드 공격

↓

바리케이드 내구도 감소

↓

추가 좀비 등장
```

---

# 25. 바리케이드 붕괴

특정 바리케이드의 내구도가 다음에 도달하면:

```text
0%
```

해당 Defense Sector는 `BREACHED` 상태가 된다.

예:

```text
Sector A

Barricade 0%

↓

Sector A Breached
```

다른 Sector의 바리케이드는 그대로 유지된다.

---

# 26. Breach 이후 좀비 행동

Sector가 붕괴되면 해당 방향에서 좀비가 방어 구역 내부로 들어올 수 있다.

기존:

```text
Zombie
↓
Barricade
```

붕괴 후:

```text
Zombie
↓
Interior
↓
Player
```

이후 해당 Sector에서 생성되는 좀비 역시 플레이어 쪽으로 침입할 수 있다.

---

# 27. 다중 방어선 붕괴

후반 도시에서는 일부 방어선만 먼저 붕괴할 수 있다.

예:

```text
North: 65%

East: 0% ← BREACHED

South: 40%

West: 90%
```

이 경우 East 방향에서만 좀비가 내부로 유입된다.

다른 방어선은 계속 정상적으로 작동한다.

즉 하나의 바리케이드가 무너졌다고 전체 도시의 모든 바리케이드를 즉시 제거하지 않는다.

---

# 28. 플레이어 즉사 조건

바리케이드가 붕괴된 이후 좀비가 방어 거점 내부로 들어와 플레이어에게 도달하면 플레이어는 즉사한다.

조건:

```text
Zombie reaches Player
```

그리고 해당 Zombie가 이미 breach된 Sector를 통해 방어 구역 내부에 진입한 상태라면:

```text
Player Death
```

이 규칙에서는 기존의 일반적인 플레이어 HP 시스템보다 Last Stand의 방어 실패 규칙이 우선한다.

---

# 29. 방어 실패

플레이어가 사망하면 해당 야간 방어는 실패한다.

```text
Player Death

↓

Defense Failed

↓

Game Over 또는 Last Stand 실패 처리
```

구체적인 Game Over UI는 기존 시스템을 재사용하거나 향후 별도 UI로 구현할 수 있다.

---

# 30. 동료 시스템

> 2026-09-23 동료 요구사항은 [동료 시스템 설계](COMPANION_SYSTEM.md)에 정리했다.
> 아래 30~38절은 기존 설계다. 사기 명칭은 `courage`로 통일하며,
> 35~36절의 일괄 도주 조건 대신 새 문서의 사기별 조건을 우선한다.
> 기본 사기의 동료는 내구도 10% 미만에서, 가장 충성스러운 동료도 0%에서는 도주한다.

플레이어는 낮 시간 탐색을 통해 생존자를 발견할 수 있다.

생존자는 이후 동료가 되어 야간 방어에 참가할 수 있다.

현재 동료 전투 시스템은 아직 구현되어 있지 않다.

따라서 신규 개발 대상이다.

---

# 31. 동료 기본 데이터

최소한 다음 상태를 표현할 수 있어야 한다.

```ts
interface Ally {
    id: string;

    morale: number;

    combatState: AllyCombatState;
}
```

개념적인 상태:

```text
ACTIVE

FLEEING

LEFT_COMBAT
```

향후 추가 데이터가 필요할 수 있다.

---

# 32. 동료 전투

동료는 자동으로 좀비를 공격한다.

기본적으로 플레이어가 직접 조종하지 않는다.

동료 AI는 지나치게 복잡하게 만들지 않는다.

초기 구현에서는 최소한 다음만 필요하다.

```text
적 탐색

↓

사격 가능 여부 확인

↓

좀비 공격
```

---

# 33. 동료 배치

여러 Defense Sector가 존재하는 도시에서는 향후 동료를 특정 방어 구역에 배치할 수 있어야 한다.

예:

```text
North

Player
Ally A

East

Ally B

South

Ally C
```

Hazard처럼 Sector가 하나뿐이라면 모든 동료가 동일한 방어선에 참가한다.

다중 Sector 배치 UI와 세부 규칙은 별도 개발 단계에서 확정할 수 있다.

---

# 34. 동료 사기

동료는 `Morale` 값을 가진다.

사기가 낮아지면 동료가 전투에서 이탈할 수 있다.

기본 조건:

```text
Morale <= Flee Threshold
```

정확한 임계값은 밸런스 설정으로 관리한다.

---

# 35. 바리케이드와 동료 도주

현재 확정된 기본 규칙은:

```text
Barricade < 10%
```

이면 동료의 도주 조건이 발생한다.

Hazard에서는 바리케이드가 하나뿐이기 때문에 의미가 명확하다.

```text
Hazard Barricade < 10%

↓

Ally Flee
```

다중 Defense Sector 도시에서는 동료가 특정 Sector에 배치되는 구조를 기준으로 확장한다.

기본 설계 방향:

```text
Assigned Sector Barricade < 10%

↓

해당 Sector의 Ally Flee
```

즉 다른 방향의 방어선이 무너질 위기라는 이유만으로 모든 동료가 자동으로 동시에 사라지는 구조는 기본값으로 하지 않는다.

---

# 36. 동료 도주 조건

다음 조건 중 하나를 만족하면 동료는 즉시 도주 상태에 들어간다.

```text
Assigned Barricade < 10%

OR

Morale <= Flee Threshold
```

개념:

```ts
if (
    barricadeIntegrity < 10
    || morale <= fleeThreshold
) {
    flee();
}
```

---

# 37. 동료 도주

도주 조건이 발생했다고 동료 객체를 즉시 삭제하지 않는다.

상태 변화:

```text
ACTIVE

↓

FLEEING

↓

LEFT_COMBAT
```

`FLEEING` 상태에서는 실제로 전투 구역 밖으로 이동하는 연출을 사용할 수 있다.

완전히 이탈하면 전투에는 다시 참가하지 않는다.

---

# 38. 동료의 전투 이후 상태

전투에서 도망친 동료가 이후 완전히 파티에서 탈퇴하는지, 다음 날 다시 등장하는지 등은 별도 시스템에서 결정한다.

현재 전투 시스템은 최소한 다음 사실만 기록한다.

```text
This Ally left the combat
```

파티 전체 데이터 자체를 삭제하지 않는다.

---

# 39. 야간 전투 상태

야간 전투는 최소한 다음 상태를 가진다.

```text
PREPARING
COMBAT
VICTORY
DEFEAT
```

각 Sector는 별도로:

```text
ACTIVE
DANGER
BREACHED
```

상태를 가질 수 있다.

---

# 40. Sector 상태

예:

```text
100% ~ 10%
ACTIVE
```

```text
< 10%
DANGER
```

```text
0%
BREACHED
```

주의:

```text
10%
```

는 `< 10%` 조건에 포함되지 않는다.

---

# 41. 전체 전투 흐름

```text
무기고

↓

Defense Start

↓

City Defense Config Load

↓

Player Spawn

↓

Allies Spawn

↓

23:00

↓

Zombie Spawn 시작

↓

각 Zombie는 자신이 속한 Sector Barricade로 이동

↓

Player / Ally 공격

↓

생존 Zombie가 Barricade 공격

↓

Barricade HP 감소

↓

필요한 경우 Sector Danger / Breach

↓

05:00까지 반복
```

---

# 42. 승리 흐름

```text
Player Alive

AND

05:00 도달

↓

Combat Stop

↓

Defense Complete

↓

Night Result

↓

다음 Day
```

모든 바리케이드가 반드시 살아 있어야 승리하는 것은 아니다.

일부 방어선이 붕괴했더라도 플레이어가 살아남아 05:00에 도달했다면 방어 성공으로 처리할 수 있다.

---

# 43. 패배 흐름

```text
Sector Barricade 0

↓

Zombie Interior Entry

↓

Zombie reaches Player

↓

Player Death

↓

Defense Failed
```

---

# 44. 도시 난이도 증가 방식

도시 진행에 따른 난이도는 단순히 Zombie HP를 증가시키는 방식에 한정하지 않는다.

주요 난이도 요소:

```text
Defense Sector 수

Zombie 유입 방향 수

Player 이동 거리

Barricade 간 거리

Zombie Spawn Rate

동시 Zombie 수

Zombie 종류

동료 수

동료 사기

Barricade 초기 상태
```

---

# 45. Hazard 난이도

Hazard는 첫 도시이다.

따라서:

```text
Defense Sector: 1
Main Entrance: 1
Barricade: 1
```

플레이어가 한 방향에만 집중할 수 있다.

---

# 46. 후반 도시 난이도

게임 진행에 따라:

```text
1 Direction
↓
2 Directions
↓
3 Directions
↓
4 Directions
```

등으로 방어 구조가 어려워질 수 있다.

반드시 모든 도시가 순차적으로 정확히 1, 2, 3, 4가 될 필요는 없다.

중요한 것은 각 도시가 고유한 방어 구조를 가질 수 있다는 것이다.

---

# 47. 맵 시스템과 전투 시스템 분리

전투 로직은 특정 도시 좌표를 직접 알아서는 안 된다.

좋은 구조:

```text
Combat System
        ↑
        │
City Defense Config
```

나쁜 구조:

```ts
if (city === "hazard") {
    zombieTargetX = 850;
}
```

이런 도시별 좌표 하드코딩을 전투 로직에 계속 추가하지 않는다.

---

# 48. 권장 구조

개념적인 구조:

```text
lastStand/
│
├─ combat/
│  ├─ LastStandCombat
│  ├─ DefenseSector
│  ├─ Barricade
│  ├─ ZombieDefenseTargeting
│  └─ CombatRules
│
├─ cities/
│  ├─ hazard/
│  │  └─ defenseConfig
│  │
│  ├─ city2/
│  │  └─ defenseConfig
│  │
│  └─ ...
│
├─ ally/
│  ├─ Ally
│  ├─ AllyCombat
│  └─ Morale
│
└─ scenes/
   └─ LastStandCombatScene
```

실제 디렉터리명은 현재 Zombie Horde 프로젝트 구조를 우선한다.

이 문서를 이유로 기존 구조와 전혀 다른 아키텍처를 억지로 만들지 않는다.

---

# 49. 기존 Horde 모드 보호

The Last Stand의 기능 때문에 기존 Horde 모드 동작이 변경되어서는 안 된다.

특히 다음은 반드시 분리한다.

```text
Unlimited Reserve Ammo
Barricade Targeting
Defense Sector
Instant Death on Breach
Ally Combat
```

예:

```text
Normal Horde
→ 기존 전투 규칙

The Last Stand
→ Last Stand Combat Rules
```

---

# 50. 밸런스 설정

다음 값은 조정 가능한 설정값으로 관리한다.

```text
전투 시작 시간

전투 종료 시간

바리케이드 최대 내구도

Danger Threshold

좀비 공격력

좀비 공격 간격

Spawn Interval

동료 Flee Threshold
```

예:

```ts
const LAST_STAND_COMBAT_CONFIG = {
    startHour: 23,
    endHour: 5,

    barricade: {
        maxIntegrity: 100,
        dangerThreshold: 10,
    }
};
```

---

# 51. 현재 확정되지 않은 요소

아래 내용은 아직 임의로 구현하지 않는다.

## Zombie Wave

- 정확한 Spawn 속도
- 시간별 Spawn 증가량
- 최대 동시 좀비 수
- Fast Zombie 출현 비율
- 특수 좀비

## Ally

- 정확한 명중률
- 사격 속도
- 재장전
- 무기 종류
- 탄약
- 사기 감소 공식
- 사망 가능 여부

## City

- Hazard 이후 실제 도시 목록
- 도시별 Sector 수
- 도시별 방어 건물
- 도시별 Spawn 구조

## Battle Result

- 야간 전투 결과 보상
- 전투 후 Barricade 상태 유지 방식
- 도망간 동료 처리
- 다음 Day 자동 저장

이 값들은 요구사항이 결정되기 전에 Codex가 임의로 확정하지 않는다.

---

# 52. 1차 개발 범위

첫 번째 야간 전투 개발에서는 **Hazard 전투를 구현하되, 시스템 구조는 이후 다중 Sector를 지원할 수 있도록 한다.**

구현 대상:

```text
Hazard Combat Map

1 Defense Sector

1 Barricade

1 Zombie Spawn Direction

23:00 Start

05:00 End

Existing Player Combat

Infinite Reserve Ammo

Zombie Barricade Targeting

Barricade Damage

Barricade Destruction

Zombie Breach

Zombie Player Targeting

Player Instant Death

Victory

Defeat
```

---

# 53. 1차 개발에서 동료

동료 시스템은 전체 Last Stand 설계에는 포함되지만 현재 별도 신규 기능이다.

따라서 1차 전투 기반을 만드는 과정에서 반드시 완성할 필요는 없다.

우선 다음 구조를 깨뜨리지 않도록 한다.

```text
Player-only Defense
```

향후:

```text
Player + Allies Defense
```

로 확장 가능해야 한다.

---

# 54. 1차 구현 금지 사항

첫 번째 Hazard 전투를 구현하면서 다음을 선제적으로 만들지 않는다.

```text
4방향 맵 실제 구현

모든 미래 도시

복잡한 동료 전술

Cover System

Trap System

Turret

Barricade Upgrade Tree

Dynamic Base Building

Boss Zombie

복잡한 Morale Simulation

도시 자동 생성

절차적 Defense Layout
```

다중 Sector를 **지원할 수 있는 구조**와 다중 Sector를 **지금 전부 구현하는 것**은 다르다.

이번에는 전자를 목표로 한다.

---

# 55. Hazard 1차 완료 조건

다음 시나리오가 성공하면 Hazard 기본 전투 구현을 완료한 것으로 본다.

```text
1. The Last Stand 무기고에서 방어 시작을 선택한다.

2. Hazard Combat Scene으로 이동한다.

3. Hazard Defense Config가 로드된다.

4. 플레이어가 건물 내부 방어 구역에 생성된다.

5. 게임 시간이 23:00에서 시작한다.

6. 하나의 진입 방향에서 좀비가 생성된다.

7. 좀비는 플레이어가 아니라 Hazard의 바리케이드로 이동한다.

8. 플레이어는 기존 전투 시스템으로 좀비를 공격할 수 있다.

9. 탄창은 정상적으로 감소한다.

10. 탄창이 비면 재장전한다.

11. 예비 탄약 부족으로 재장전이 차단되지 않는다.

12. 바리케이드에 도달한 좀비는 바리케이드를 공격한다.

13. 바리케이드 내구도가 감소한다.

14. 바리케이드가 0%가 되면 Hazard Sector가 BREACHED 상태가 된다.

15. 좀비가 바리케이드를 넘어 건물 내부로 진입한다.

16. 이후 좀비는 플레이어를 추적한다.

17. 좀비가 플레이어에게 도달하면 플레이어는 즉사한다.

18. 플레이어가 살아 있는 상태로 05:00에 도달하면 방어에 성공한다.
```

---

# 56. 다중 Sector 확장 완료 조건

향후 다중 방향 도시 구현 시 다음이 가능해야 한다.

```text
1. 하나의 도시가 둘 이상의 Defense Sector를 가진다.

2. Sector별 Zombie Spawn Area가 존재한다.

3. Zombie는 자신의 Sector Barricade를 목표로 한다.

4. 각 Barricade HP는 독립적이다.

5. 특정 Barricade만 파괴될 수 있다.

6. 파괴된 Sector를 통해서만 Zombie가 침입한다.

7. 다른 Sector는 계속 정상 방어된다.

8. Player는 방어선 사이를 이동할 수 있다.

9. Ally를 특정 Sector에 배치할 수 있다.

10. 도시마다 Sector 수와 배치가 다를 수 있다.
```

---

# 57. 개발 원칙 요약

The Last Stand 야간 전투를 다음처럼 이해한다.

```text
The Last Stand

≠ 하나의 바리케이드 디펜스 맵

= 여러 도시를 여행하면서
  서로 다른 방어 거점에서
  매일 밤 살아남는 시스템
```

Hazard:

```text
한 방향 방어
```

게임 진행:

```text
여러 방향 방어
```

후반:

```text
다수의 방어선과 제한된 인력을 동시에 관리
```

---

# 핵심 요구사항

**The Last Stand는 여러 도시를 이동하며 밤마다 서로 다른 구조의 임시 거점을 방어하는 모드이다. 기존 Zombie Horde의 사격 및 전투 시스템을 재사용하고, 도시별 Defense Sector와 Barricade를 데이터 기반으로 구성하여 Hazard의 단일 방향 방어부터 후반 도시의 다방향 방어까지 확장할 수 있도록 구현한다.**
