# Git 커밋 및 Pull Request 규칙

이 문서는 사람과 Codex가 동일한 형식으로 브랜치, 커밋, Pull Request를 작성하기 위한 실행 규칙이다. 별도 지시가 없다면 아래 규칙을 기본값으로 적용한다.

## 1. 기본 원칙

- 작업은 최신 원격 `main`을 기준으로 새 브랜치에서 시작한다.
- 브랜치를 만들기 전에 원격을 fetch하고 `origin/main`의 최신 커밋을 확인한다.
- 한 브랜치는 하나의 명확한 기능, 수정 또는 문서 작업을 다룬다.
- 사용자 변경과 현재 작업에 관계없는 파일은 커밋하지 않는다.
- 기존 커밋을 임의로 amend, rebase, squash 또는 force push하지 않는다.
- 커밋 전 `npm test`, `npm run build`, `git diff --check`를 실행한다.
- 실패한 검증을 성공으로 보고하지 않는다.

## 2. 브랜치 이름

형식:

```text
<type>/<short-kebab-case-description>
```

허용하는 주요 type:

- `feat`: 새로운 게임 기능
- `fix`: 버그 수정
- `docs`: 문서 작성 및 갱신
- `test`: 테스트만 변경
- `refactor`: 동작을 바꾸지 않는 구조 개선
- `ci`: GitHub Actions 등 CI/CD 변경
- `chore`: 위 항목에 속하지 않는 유지보수

예시:

```text
feat/toggleable-fog-of-war
fix/github-pages-permissions
docs/project-documentation
ci/github-pages-deploy
```

여러 관련 문서를 순차적으로 추가하는 브랜치는 개별 문서 이름보다 목적을 나타내는 범용 이름을 사용할 수 있다.

## 3. 커밋 메시지

커밋 메시지는 영어 Conventional Commits 형식을 사용한다.

형식:

```text
<type>[optional scope]: <description>
```

규칙:

- type은 소문자로 작성한다.
- description은 영어 명령형 또는 간결한 동사구로 작성한다.
- description 첫 글자를 불필요하게 대문자로 쓰지 않는다.
- 제목 끝에 마침표를 붙이지 않는다.
- 하나의 커밋에는 하나의 논리적 변경을 담는다.
- 작업 번호가 있다는 이유만으로 의미 없는 `task 1` 같은 제목을 사용하지 않는다.

예시:

```text
feat: add toggleable fog of war
fix: preserve aim after mobile input cancel
docs: add project README
test: cover reload progress edge cases
ci: deploy app to GitHub Pages
```

호환성을 깨는 변경이 필요한 경우에만 `!` 또는 `BREAKING CHANGE`를 사용한다.

```text
feat!: replace saved session format
```

## 4. 커밋 범위 확인

커밋 직전에 다음 순서를 따른다.

1. `git status -sb`로 현재 브랜치와 변경 파일을 확인한다.
2. `git diff`와 `git diff --stat`으로 변경 내용을 검토한다.
3. `git diff --check`로 공백 오류를 확인한다.
4. 작업에 해당하는 파일만 경로를 명시해 stage한다.
5. `git diff --cached --check`와 `git diff --cached --stat`을 확인한다.
6. 검증을 통과한 변경만 커밋한다.

관련 없는 변경이 섞여 있으면 `git add -A`를 사용하지 않는다. 작업 범위를 판단할 수 없으면 커밋 전에 사용자에게 확인한다.

## 5. Pull Request 제목

PR 제목은 커밋과 동일하게 영어 Conventional Commits 형식을 사용한다.

```text
<type>[optional scope]: <description>
```

좋은 예:

```text
feat: add mobile auto reload
fix: grant Pages read permission to build job
docs: add project documentation
```

피해야 할 예:

```text
모바일 자동 재장전 추가
작업 완료
Update files
feature/mobile
```

커밋이 여러 개라면 PR 전체 변경을 대표하는 제목을 작성한다. 마지막 커밋 메시지를 무조건 복사하지 않는다.

## 6. Pull Request 본문

PR 본문은 한국어로 작성한다. 코드 식별자, 명령어, 파일명과 고유 기술 용어는 원문 표기를 유지할 수 있다.

최소 구성:

```markdown
## 변경 사항

- 무엇을 변경했는지

## 설계 이유

- 왜 이 방식으로 구현했는지
- 기존 동작과 경계를 어떻게 보존했는지

## 검증 결과

- `npm test`: 결과
- `npm run build`: 결과
- `git diff --check`: 결과

## 알려진 사항

- 수동 검증이 필요한 항목
- 현재 범위에서 의도적으로 제외한 기능
```

버그 수정 PR은 가능하면 `원인`을 별도 항목으로 작성한다. UI 또는 모바일 기능은 실제 기기에서 확인하지 않았다면 검증 완료로 표현하지 않는다.

## 7. PR 생성과 상태

- 기본 대상 브랜치는 `main`이다.
- 별도 요청이 없으면 Draft PR로 생성한다.
- PR을 만들기 전에 기능 브랜치를 원격에 push하고 upstream을 설정한다.
- 동일한 head 브랜치의 기존 PR이 있는지 확인해 중복 PR을 만들지 않는다.
- 리뷰 수정은 같은 기능 브랜치에 추가 커밋으로 push한다.
- 리뷰 스레드에 답할 때는 수정 커밋, 변경 내용과 검증 결과를 간결하게 남긴다.
- 사용자가 명시적으로 요청하지 않으면 PR을 merge하거나 닫지 않는다.

## 8. 검증 표기

실제로 실행한 결과만 PR과 완료 보고에 기록한다.

```text
npm test: 18 files, 106 tests passed
npm run build: passed
git diff --check: passed
```

다음 표현은 사용하지 않는다.

```text
테스트가 통과할 것으로 예상됨
모바일에서도 정상일 것임
빌드 문제 없음 (실행하지 않음)
```

기존 경고가 있다면 성공 결과와 분리해 `알려진 사항`에 기록한다.

## 9. Codex 실행 체크리스트

Codex는 커밋, push, PR 요청을 받으면 다음을 수행한다.

1. `AGENTS.md`와 이 문서를 확인한다.
2. 현재 브랜치와 변경 범위를 확인한다.
3. 관계없는 사용자 변경을 제외한다.
4. 필요한 테스트와 빌드를 실제로 실행한다.
5. 영어 Conventional Commit 메시지로 커밋한다.
6. 현재 기능 브랜치를 원격에 push한다.
7. 영어 Conventional Commits 형식의 제목과 한국어 본문으로 Draft PR을 만든다.
8. 브랜치, 커밋 해시, PR 링크와 검증 결과를 보고한다.

사용자의 해당 작업에 대한 명시적 지시가 이 문서와 다르면 사용자 지시를 우선한다. `AGENTS.md`와 충돌하는 경우에는 구현이나 게시 전에 충돌 지점을 보고한다.
