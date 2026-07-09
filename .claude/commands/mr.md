---
description: 현재 브랜치에서 dev로 Pull Request를 준비한다. 최신 dev를 로컬에 반영하고 충돌을 확인한 뒤 PR 제목·본문·링크를 생성한다.
argument-hint: [타겟 브랜치 (선택, 기본: dev)]
---

# mr — Pull Request 준비

`/push`로 브랜치를 올린 뒤 PR을 만들기 전에 실행한다.

타겟 브랜치는 기본 `dev`. 인자로 다른 브랜치를 지정할 수 있다 (예: `/mr main`).

## 절차

### 1. 현황 파악 — 병렬로 확인

- 현재 브랜치명 (`git branch --show-current`)
- 브랜치 규칙 확인: `feature/이름-작업내용(영어)` 패턴인지. main/dev면 즉시 중단.
- 로컬과 원격 동기화 여부 (`git status`)

### 2. 타겟 브랜치 최신화

```bash
git fetch origin dev
```

로컬 `dev` 브랜치를 직접 체크아웃하지 않고 `origin/dev`와 비교한다.

### 3. 충돌 사전 확인

```bash
git merge-tree $(git merge-base HEAD origin/dev) HEAD origin/dev
```

또는 dry-run 방식:

```bash
git diff HEAD...origin/dev --name-only
```

- 충돌 가능 파일이 있으면 목록과 충돌 예상 이유를 설명한다.
- 충돌이 없으면 "충돌 없음" 확인.

### 4. 변경 요약 수집

```bash
git log origin/dev..HEAD --oneline
git diff origin/dev...HEAD --stat
```

이 브랜치에서 추가된 커밋 목록과 변경 파일 통계를 수집한다.

### 5. PR 제목·본문 작성

수집한 정보를 바탕으로 아래 형식으로 작성한다.

**제목 형식** (한 줄, 50자 내외):
```
feat: [주요 변경 내용 한 줄 요약] — [브랜치명]
```

**본문 형식**:
```markdown
## 변경 내용
- [주요 변경 사항 불릿]
- ...

## 변경 파일
[git diff --stat 결과 요약]

## 체크리스트
- [ ] /preflight 검사 통과
- [ ] 테스트 실행 확인
- [ ] 관련 문서 업데이트

## 관련 커밋
[git log --oneline 목록]
```

### 6. PR 링크 생성

GitHub PR 생성 URL:

```
https://github.com/HHS-code/diary/compare/<타겟브랜치>...<현재브랜치>?expand=1
```

위 URL, PR 제목, PR 본문을 모두 출력한다. 사용자가 GitHub에서 직접 붙여넣을 수 있게.

## 주의

- 이 커맨드는 실제로 PR을 생성하지 않는다. 링크·제목·본문만 만들어 준다.
- 충돌이 있으면 PR 링크를 출력하기 전에 "충돌 먼저 해결 후 재실행" 안내를 출력한다.
- 브랜치가 원격에 push되지 않은 상태이면 "`/push` 먼저 실행하세요"로 안내하고 중단한다.
