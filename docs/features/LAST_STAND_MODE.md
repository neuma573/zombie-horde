# 현재 브랜치 요구사항 변경

아래 초기 제안서의 개별 SEARCH 확정 흐름은 다음 요구사항으로 대체한다.

- 모드 시작 시 메인 메뉴가 500ms 동안 검게 페이드 아웃되고 일기가 700ms 동안 아래에서 올라온다.
- 지도에서 건물을 누르면 즉시 계획에 추가되고, 다시 누르면 해제된다. 별도 추가·제외 버튼은 없다. 선택 시 빨간 펜으로 동그라미를 그리는 340ms 연출을 표시한다. 선택 단계에서는 결과를 공개하거나 자원을 지급하지 않는다.
- 플레이어 1명이 수색과 바리케이드 수리에 총 12시간을 나누어 배분한다.
- 바리케이드는 초기 50%이며 1인당 시간당 5%포인트씩, 최대 100%까지 수리한다. 초기값은 밸런스 설정으로 분리한다.
- 계획을 한 번 확정하면 모든 선택 건물의 수색 결과와 수리를 일괄 반영한다. 미사용 시간이 있어도 추가 확정은 불가하다.
- 수리만 배정할 수 있다. 빈 계획은 확정할 수 없다.
- 장소 또는 수리 시간이 계획에 배정되어 있는 동안 직접 수색 API는 `PLAN ACTIVE`로 거부한다. 배정된 계획은 `confirmPlan()`으로 일괄 확정하며, 배정을 모두 해제하면 직접 수색을 다시 사용할 수 있다.
- 결과에는 합산 자원, 수색 건물 수, 소요 시간, 수리량과 현재 바리케이드를 표시한다.
- 우측 상단에 현재 Day를 표시하고 12칸 시간 막대로 수색·수리·미배정을 구분한다. 시간 초과 선택 시 지도 위에 필요/미배정 시간 경고를 표시한다.
- 건물 선택 시 상세 메모는 즉시 갱신한다. 계획 전체 확정 시에만 종이가 접히며 결과 페이지가 나타난다. 확정 후 지도 화면을 유지한 채 1.5초 동안 푸른 어둠을 45% 농도로 덮는다. 어두워진 뒤에 결과 페이지를 넘긴다. 어두워지는 동안 입력을 막아 중복 확정과 선택 변경을 방지한다.
- 결과의 다음 버튼은 목재·페그보드 무기 거치대 형태의 무기고로 연결한다. 초기 보유 무기는 권총 1정이며 두 방어 슬롯은 모두 비어 있다. 진열대 권총을 선택하면 은은한 하이라이트가 표시되고, 빈 슬롯을 누르면 배정된다. 배정된 권총은 진열대에서 흐리게 표시되며 선택할 수 없다. 장착된 슬롯을 누르면 무기가 해제되고 진열대에서 다시 선택할 수 있다. 같은 무기 중복 장착은 금지하며, 슬롯에 무기가 없으면 방어 시작 버튼을 비활성화한다. 무기 선택은 해당 세션 동안 유지한다.
- 무기고 권총은 투명 배경 이미지로 거치대 좌측 상단에 작게 배치한다. 장착 슬롯에는 권총 이미지·장착 체크를, 빈 슬롯에는 + 표시와 비어 있음만 표시한다. 우측 상단 일기 복귀 메뉴는 표시하지 않는다.
- 거치대 내부 무기명, 하단 보조 슬롯 안내 및 탐색 완료 링크를 제거한다. 하단에는 현재 Day를 반영한 방어 시작 버튼을 표시한다. 현재는 전용 방어 전투가 없어 클릭 시 준비 중 안내를 표시하고 무기고와 선택 상태를 유지한다.
- 무기고는 진열대만 PC와 모바일 공통의 1120×520 기준 배치를 사용하고, 진열대 안에서 핀치 확대·축소 및 드래그 이동을 지원한다. 제목·장착 슬롯 두 개·방어 시작 버튼은 줌 영역 밖의 반응형 UI로 유지한다. 모바일 세로에서는 슬롯과 버튼을 하단에, 높이가 짧은 가로 화면에서는 오른쪽에 표시하며 진열대 확대에도 위치와 크기가 변하지 않는다. PC에서는 진열대 전체가 보이는 배율로, 모바일에서는 무기를 누르기 쉬운 1배율로 시작한다. 모바일에서도 같은 진열대 전체가 보일 때까지 축소할 수 있고, 확대 후에는 PC와 동일한 배치와 경계를 드래그로 탐색한다. 축소 시 진열대 바깥은 어두운 배경으로 구분한다.
- 다음 날, 밤 전투, 동료 모집은 이번 범위에 포함하지 않는다.

---

# 초기 제안서 (이력 참고용)

# Zombie Horde: The Last Stand
## Exploration Foundation 개발 요구사항

## 1. 개발 목적

기존 **Zombie Horde**에 추가할 **The Last Stand 모드**의 첫 번째 파운데이션을 구현한다.

이번 개발 단계에서는 전체 게임을 구현하지 않는다.

구현 대상은 오직 다음 하나이다.

> **낮 시간 동안 Hazard의 지도를 보고 탐색할 장소를 선택하고, 시간을 소비하여 자원을 획득하는 탐색 시스템**

이번 작업을 통해 향후 다음 시스템들이 올라갈 수 있는 기반을 만든다.

- 하루 진행
- 도시 이동
- 밤 전투
- 자원 관리
- 생존자
- 차량
- 저장/로드
- 이벤트

하지만 위 기능들은 **이번 작업에서 구현하지 않는다.**

---

# 2. 기술 환경

기존 Zombie Horde 프로젝트의 기술 구조를 그대로 사용한다.

- Phaser 3
- TypeScript
- 기존 프로젝트 구조와 코딩 컨벤션 준수
- 기존 공용 UI, Scene 관리, Asset 관리 방식이 존재하면 재사용

기존 구조를 확인하지 않고 새로운 아키텍처를 별도로 만들지 않는다.

---

# 3. MVP 범위

이번 구현 범위는 다음과 같다.

- 도시: Hazard, Kentucky 한 곳
- 하루 탐색 가능 시간: 12시간
- Hazard 탐색 지도 표시
- 지도 위 탐색 장소 표시
- 장소 선택
- 탐색 정보 표시
- 탐색 최종 확정
- 탐색 시간 소비
- 탐색 결과 계산
- 랜덤한 자원 획득
- 이미 탐색한 장소 상태 관리
- 남은 시간 표시
- 시간이 부족한 장소 탐색 차단

다음 기능은 구현하지 않는다.

- 저장
- 로드
- 밤 전투
- 좀비
- 캐릭터 전투
- 도시 이동
- 다른 도시
- 최종 목적지
- 생존자 NPC
- 동료 시스템
- 차량 시스템
- 장비 시스템
- 무기 시스템
- 게임 오버
- 엔딩
- 복잡한 이벤트
- 일기 시스템

---

# 4. 기본 플레이 흐름

게임에 진입하면 Hazard의 탐색 화면을 표시한다.

기본 흐름은 다음과 같다.

```text
Hazard 탐색 화면 진입

↓

12시간의 탐색 가능 시간 부여

↓

플레이어가 지도 위 탐색 장소 선택

↓

해당 장소의 정보 표시

↓

필요 탐색 시간 확인

↓

플레이어가 SEARCH 버튼으로 최종 확정

↓

탐색 시간 소비

↓

Loot 계산

↓

탐색 결과 표시

↓

자원 증가

↓

해당 장소를 탐색 완료 상태로 변경

↓

다시 지도에서 장소 선택
```

남은 탐색 시간이 부족하거나 플레이어가 탐색 가능한 장소를 모두 탐색하면 사실상 해당 날의 탐색이 종료된 상태가 된다.

이번 구현에서는 다음 날로 실제 전환할 필요는 없다.

---

# 5. 하루 탐색 시간

하루 동안 사용할 수 있는 탐색 시간은 고정적으로 다음과 같다.

```text
12 Hours
```

초기 상태:

```text
Remaining Search Time: 12h
```

장소를 탐색하면 해당 장소에 설정된 시간이 차감된다.

예:

```text
현재 남은 시간: 12h

Gas Station 탐색
소요 시간: 3h

탐색 후:

남은 시간: 9h
```

시간은 현재 단계에서는 정수 단위의 `hour`만 사용한다.

분 단위 시간은 구현하지 않는다.

---

# 6. 탐색 지도

Hazard 전체를 실제 GIS 지도처럼 구현하지 않는다.

게임용으로 단순화된 **사람이 직접 그린 지도 같은 스타일의 이미지**를 사용한다.

지도는 실제 Hazard, Kentucky를 모티브로 하지만 실제 도로 및 건물을 완전히 정확하게 재현할 필요는 없다.

목표는 다음과 같은 분위기이다.

- 종이 지도
- 생존자가 직접 표시한 지도
- 주요 도로 표시
- 건물 또는 탐색 지점 표시
- 손으로 표시한 마커 느낌
- 복잡하지 않은 구조

지도 자체는 하나의 배경 이미지로 사용한다.

각 탐색 지점은 이미지 안에 직접 박아 넣지 말고 별도의 게임 오브젝트로 관리한다.

예:

```text
Hazard Map
├─ Grocery Store
├─ Gas Station
├─ Pharmacy
├─ Residential House A
├─ Residential House B
└─ Police Station
```

실제 장소 숫자는 개발 과정에서 변경할 수 있도록 데이터 기반으로 구현한다.

---

# 7. 탐색 장소

각 탐색 장소는 최소한 다음 데이터를 가진다.

```ts
interface SearchLocation {
    id: string;
    name: string;

    x: number;
    y: number;

    searchHours: number;

    lootTable: LootTable;

    searched: boolean;
}
```

`x`, `y`는 지도 위 마커 위치이다.

단, 기존 프로젝트에서 별도의 좌표 또는 config 구조를 사용한다면 기존 방식을 우선한다.

---

# 8. 지도 위 장소 선택

플레이어는 지도 위 마커를 클릭하여 장소를 선택한다.

선택했다고 바로 탐색하면 안 된다.

반드시 다음 두 단계로 나눈다.

```text
장소 선택

↓

탐색 확정
```

예:

플레이어가 Grocery Store를 클릭한다.

화면에 다음과 같은 정보가 표시된다.

```text
GROCERY STORE

Search Time
4 Hours

Expected Resources

Food
HIGH

Ammo
LOW

Fuel
NONE

[ SEARCH ]
```

`SEARCH` 버튼을 눌러야 실제 탐색을 시작한다.

잘못 클릭했다고 바로 4시간이 증발하는 UX는 만들지 않는다.

---

# 9. 탐색 가능 여부

장소 탐색 전에 다음 조건을 확인한다.

## 이미 탐색한 장소

이미 탐색했다면 다시 탐색할 수 없다.

```text
SEARCHED
```

상태로 표시한다.

SEARCH 버튼 역시 사용할 수 없도록 처리한다.

---

## 시간이 부족한 경우

예:

```text
Remaining Time: 2h
Search Required: 4h
```

이 경우 탐색할 수 없다.

UI에서는 다음과 같이 표시할 수 있다.

```text
NOT ENOUGH TIME

Required: 4h
Remaining: 2h
```

SEARCH 버튼은 비활성화한다.

---

# 10. 탐색 실행

플레이어가 SEARCH를 최종 확정하면 다음 순서로 처리한다.

```text
1. 탐색 가능 여부 검증
2. 남은 시간 차감
3. Loot 계산
4. 획득 자원 반영
5. 장소를 searched 상태로 변경
6. 탐색 결과 UI 표시
```

---

# 11. 자원

현재 구현할 자원은 다음 세 종류이다.

```ts
interface Resources {
    food: number;
    ammo: number;
    fuel: number;
}
```

이번 단계에서 자원을 소비하는 기능은 구현하지 않는다.

즉 현재 자원은 **탐색을 통해 획득하고 누적만 한다.**

향후 하루 종료, 이동, 전투 시스템에서 자원을 소비하게 된다.

---

# 12. 탐색 랜덤성

탐색 결과는 완전히 고정하지 않는다.

각 장소는 자신만의 Loot Table을 가진다.

예:

```ts
interface LootRule {
    chance: number;
    min: number;
    max: number;
}

interface LootTable {
    food?: LootRule;
    ammo?: LootRule;
    fuel?: LootRule;
}
```

예시:

```ts
const groceryStoreLoot = {
    food: {
        chance: 0.9,
        min: 2,
        max: 7
    },

    ammo: {
        chance: 0.15,
        min: 1,
        max: 2
    }
};
```

주유소 예:

```ts
const gasStationLoot = {
    food: {
        chance: 0.4,
        min: 1,
        max: 3
    },

    fuel: {
        chance: 0.8,
        min: 1,
        max: 5
    }
};
```

장소별로 어떤 자원을 얻기 쉬운지가 달라야 한다.

---

# 13. 플레이어에게 확률 숫자를 직접 보여주지 않는다

다음과 같은 UI는 사용하지 않는다.

```text
Food: 82%
Ammo: 14%
Fuel: 3%
```

대신 대략적인 기대치를 보여준다.

예:

```text
Food: HIGH
Ammo: LOW
Fuel: NONE
```

필요하면 내부 확률을 기준으로 다음 등급을 사용할 수 있다.

```text
NONE
LOW
MEDIUM
HIGH
```

이 값은 실제 Loot Table로부터 계산하거나 장소 데이터에 별도로 정의할 수 있다.

구현이 단순한 방향을 선택한다.

---

# 14. 탐색 결과

탐색 완료 후 결과창을 표시한다.

예:

```text
SEARCH COMPLETE

Grocery Store

Food +5
Ammo +1

Time Spent
4 Hours

Remaining Time
8 Hours

[ CONTINUE ]
```

획득하지 않은 자원은 굳이 `+0`으로 표시하지 않는다.

예:

```text
Food +5
Ammo +1
```

이면 충분하다.

---

# 15. 탐색 완료 상태

MVP에서는 장소 상태를 복잡하게 만들지 않는다.

다음 두 상태만 존재한다.

```text
UNSEARCHED
SEARCHED
```

한 번 탐색한 장소는 다시 탐색할 수 없다.

향후 필요하다면 다음과 같은 시스템으로 확장할 수 있다.

```text
UNSEARCHED
PARTIALLY_SEARCHED
SEARCHED
DEPLETED
```

그러나 이번 작업에서는 절대 구현하지 않는다.

---

# 16. 화면에 필요한 최소 정보

탐색 화면에서는 최소한 다음 정보를 확인할 수 있어야 한다.

```text
HAZARD, KENTUCKY

Remaining Search Time
8 / 12 Hours

Resources

Food   7
Ammo   3
Fuel   2
```

그리고 그 아래 또는 중앙에 Hazard 지도와 탐색 마커가 존재한다.

---

# 17. 상태 관리

탐색 시스템의 상태는 최소한 다음과 같다.

```ts
interface ExplorationState {
    remainingHours: number;
    resources: Resources;
    locations: SearchLocation[];
}
```

초기값:

```ts
remainingHours = 12;
```

이번 구현에서는 저장하지 않는다.

브라우저를 새로고침하거나 Scene을 완전히 종료하면 상태가 초기화되어도 된다.

저장 시스템은 별도 작업으로 구현한다.

---

# 18. 코드 구조 원칙

Phaser Scene에 탐색 규칙 전체를 직접 작성하지 않는다.

Scene은 다음을 담당한다.

- 화면 표시
- 사용자 입력
- 지도 마커 표시
- UI 업데이트

탐색 규칙은 별도의 로직으로 분리한다.

예:

```text
TheLastStand/
├─ exploration/
│  ├─ ExplorationState
│  ├─ ExplorationSystem
│  ├─ SearchLocation
│  ├─ LootTable
│  └─ hazardLocations
│
└─ scenes/
   └─ ExplorationScene
```

실제 디렉터리 구조는 기존 Zombie Horde 프로젝트 구조를 먼저 확인한 후 그 구조에 맞춘다.

새로운 패턴을 억지로 도입하지 않는다.

---

# 19. ExplorationSystem 책임

가능하다면 탐색 처리 로직은 Scene과 분리한다.

예:

```ts
canSearch(locationId: string): boolean

search(locationId: string): SearchResult

getRemainingHours(): number

getResources(): Resources
```

탐색 결과 예:

```ts
interface SearchResult {
    locationId: string;

    hoursSpent: number;

    loot: {
        food?: number;
        ammo?: number;
        fuel?: number;
    };
}
```

Scene은 `SearchResult`를 받아 결과 화면만 표현한다.

---

# 20. Hazard 임시 탐색 장소

MVP 테스트를 위해 다음 정도의 장소를 임시로 구성한다.

정확한 상호명이나 실제 Hazard의 건물명은 이후 변경 가능하다.

```text
Grocery Store
Search: 4h
Food: HIGH
Ammo: LOW

Gas Station
Search: 3h
Food: LOW
Fuel: HIGH

Pharmacy
Search: 2h
Food: LOW

Residential House A
Search: 2h
Food: MEDIUM
Ammo: LOW

Residential House B
Search: 2h
Food: MEDIUM
Ammo: LOW

Police Station
Search: 5h
Ammo: HIGH
Food: LOW
```

숫자는 밸런스 확정값이 아니다.

현재 목적은 탐색 시스템 작동 검증이다.

---

# 21. UI 품질

이번 작업에서는 최종 디자인 품질을 요구하지 않는다.

다만 다음은 지킨다.

- 게임 내에서 정상적으로 읽을 수 있을 것
- 지도와 마커를 쉽게 구분할 수 있을 것
- 선택된 장소가 명확히 표시될 것
- SEARCH 가능/불가능 상태가 명확할 것
- 남은 시간이 항상 확인 가능할 것
- 이미 탐색한 장소가 시각적으로 구분될 것

임시 UI를 사용해도 된다.

---

# 22. 완료 조건

다음 시나리오가 정상적으로 동작하면 이번 작업은 완료이다.

```text
1. The Last Stand 탐색 화면에 진입한다.

2. Hazard 지도와 탐색 가능한 장소들이 표시된다.

3. 초기 탐색 가능 시간이 12시간으로 표시된다.

4. 지도에서 Gas Station을 선택한다.

5. 장소 이름, 탐색 시간, 예상 자원이 표시된다.

6. SEARCH를 누른다.

7. 3시간이 감소한다.

8. 랜덤한 Loot 결과가 계산된다.

9. 획득한 자원이 Resources에 반영된다.

10. Gas Station이 SEARCHED 상태가 된다.

11. 다시 Gas Station을 탐색할 수 없다.

12. 다른 장소를 선택하여 같은 작업을 반복할 수 있다.

13. 남은 시간보다 탐색 시간이 긴 장소는 탐색할 수 없다.

14. 여러 번 실행할 경우 같은 장소에서도 획득량에 어느 정도 차이가 발생한다.
```

---

# 23. 이번 작업에서 하지 말아야 할 것

요구사항에 없는 기능을 선제적으로 구현하지 않는다.

특히 다음 기능은 만들지 않는다.

```text
Save System
Night Combat
Zombie Spawn
NPC Survivor
Party System
Vehicle System
City Travel
Inventory
Weapon System
Equipment System
Journal System
Quest System
Random Event System
Game Over
Ending
```

미래 확장을 고려해 구조를 지나치게 추상화하지 않는다.

현재 필요한 탐색 시스템을 단순하고 명확하게 구현하고, 확장 가능한 정도의 경계만 유지한다.

---

# 핵심 요구사항 한 줄 요약

**Hazard의 손그림 스타일 지도에서 장소를 선택하고, 하루 12시간이라는 제한된 탐색 시간을 소비하여 장소별 확률에 따라 Food, Ammo, Fuel을 획득하는 The Last Stand 탐색 시스템을 구현한다.**

## 무기고 권총 에셋

- 경로: `src/assets/weapons/pistol-armory.png`
- 생성: built-in image_gen, 기존 권총 이미지의 배경 제거 편집
- 최종 프롬프트: “Use case: background-extraction. Asset type: existing game pistol sprite for a wooden gun rack. Remove only the square gray background and cast background shadow from the reference. Preserve the single pistol's shape, dark metal and grip details, exact left-facing side profile, proportions and orientation. Actual transparent alpha background, including the opening inside the trigger guard; no border, no frame, no halo, no extra objects. Center the isolated pistol with a small transparent margin. Save the transparent PNG asset.”
