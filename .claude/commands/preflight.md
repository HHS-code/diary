---
description: GitHub 업로드 전 코드 정합성을 전체 검사한다. UX_PLAN·PRD·TRD·CLAUDE.md 기준으로 문서-코드-테스트를 모두 훑는다. 커밋/푸쉬는 하지 않는다.
argument-hint: [검사 범위 힌트 (선택, 예: "web만", "pipeline만")]
---

# preflight — GitHub 업로드 전 정합성 전체 검사

커밋·푸쉬하기 전에 코드·문서·설정이 프로젝트 기준에 맞는지 확인한다.
**이 커맨드는 아무것도 변경하지 않는다.** 결과 리포트만 출력하고 필요한 수정 사항을 알린다.

검사가 끝나면 `/ship`으로 커밋·푸쉬·MR을 진행한다.

---

## 검사 항목

### 1. UX_PLAN 반영 여부

`capstone/ontology_rule_matching/docs/web/UX_PLAN.md`를 읽고:
- 현재 diff(`git diff HEAD`)의 변경 사항이 UX_PLAN의 어느 항목과 연결되는지 매핑한다.
- UX_PLAN에 명시된 기능 중 **구현은 됐지만 계획에 없는 것**, **계획에 있지만 아직 누락된 것**을 분리해서 표시한다.
- 계획에 없는 추가 구현이면 "계획 외 변경 — 의도 확인 필요"로 표시한다.

### 2. 코드·폴더·문서 정합성

- 변경된 파일 목록(`git status`)과 관련 문서(PRD, TRD, UX_PLAN, README)가 일관되는지 확인한다.
- 새 기능이 추가됐는데 관련 docs/README가 업데이트되지 않은 경우 지적한다.
- 폴더 구조가 CLAUDE.md의 모듈 경계 규칙(`lexical_search` ↔ `ontology_rule_matching` 단방향 의존)을 어기지 않는지 확인한다.

### 3. PRD / TRD 적합성

`capstone/ontology_rule_matching/docs/web/prd.md`와 `trd.md`(그리고 변경 범위에 해당하는 서브 PRD/TRD)를 읽고:
- 구현된 동작이 PRD 기능 명세와 일치하는지.
- TRD의 기술 결정(API 설계, 데이터 모델, 컴포넌트 경계)이 코드에 반영됐는지.
- 어긋나는 부분은 파일명·라인 수와 함께 명시한다.

### 4. requirements.txt · .gitignore

- `capstone/ontology_rule_matching/requirements.txt`에 새로 import한 패키지가 빠져 있으면 지적한다.
- 커밋 예정 파일 중 `.gitignore`에 추가해야 할 것(`.env`, `*.db`, `__pycache__`, `*.pyc`, venv 디렉터리 등)이 빠져 있으면 알린다.
- `capstone/.venv-capstone/` 같은 venv 폴더가 추적 대상에 포함돼 있으면 경고한다.

### 5. 테스트 실행

```bash
# 가상환경 pip 경로로 pytest 실행
capstone/.venv-capstone/bin/python -m pytest capstone/ -q --tb=short 2>&1
```

- 실패한 테스트는 테스트명과 에러 요약을 출력한다.
- 테스트가 아예 없으면 "테스트 없음 — 커버리지 0%" 경고를 낸다.
- import 오류, syntax 오류도 여기서 잡힌다.

### 6. CLAUDE.md 코드 규칙 준수

`CLAUDE.md`의 Python 코딩 규칙을 기준으로 변경된 `.py` 파일을 검토한다:
- depth > 2인 중첩 제어 구조가 있는지.
- 삼항 연산자(`x if cond else y`)가 있는지.
- public 함수에 타입 힌트·반환 타입이 빠진 게 있는지.
- `process`, `handle`, `do_task` 같은 금지 함수명이 있는지.
- 부작용 함수에 부작용을 드러내는 동사(`save_`, `update_`, `fetch_` 등)가 쓰였는지.

### 7. 기타 업로드 전 체크

- **브랜치 규칙**: 현재 브랜치가 `main` 또는 `dev`이면 "직접 push 금지 — feature 브랜치에서 작업하세요"로 경고하고 이후 단계를 진행하지 않는다.
- **브랜치 이름 규칙**: `feature/이름-작업내용(영어)` 패턴인지 확인한다.
- **민감 파일**: `.env`, API 키, 비밀번호가 스테이징됐는지 확인한다 (`git diff --cached`로 `.env` 등 탐색).
- **머지 충돌 마커**: `<<<<<<<`, `=======`, `>>>>>>>` 문자열이 변경 파일에 남아 있는지 확인한다.

---

## 출력 형식

각 항목을 아래 형식으로 리포트한다:

```
✅ 항목명 — 이상 없음
⚠️  항목명 — 주의: [내용]
❌ 항목명 — 수정 필요: [내용]
```

마지막에 전체 요약:
```
[결과] 7개 항목 중 ✅5 ⚠️1 ❌1 — /ship 전에 ❌ 항목을 먼저 해결하세요.
```
