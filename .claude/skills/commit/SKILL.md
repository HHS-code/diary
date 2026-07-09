---
name: commit
description: 이 저장소의 커밋 컨벤션(Conventional Commits + 한글 본문)에 맞춰 스테이징·커밋한다. 사용자가 "커밋해줘", "커밋", "commit" 등을 말하면 사용한다.
---

# commit

이 저장소의 커밋 컨벤션에 맞는 메시지를 작성하고 커밋한다. 빅테크 표준인
[Conventional Commits](https://www.conventionalcommits.org)를 따르되, 본문은 한글로
"왜 + 무엇"을 설명한다.

## 절차

1. **현황 파악** — 한 번에 병렬로 실행:
   - `git status`
   - `git diff HEAD` (스테이징 + 미스테이징 모두)
   - `git log -5 --pretty=format:"%h %s"` (직전 스타일 재확인)
2. **변경 묶기** — 서로 다른 목적의 변경이 섞여 있으면 사용자에게 나눠 커밋할지 묻는다.
   한 커밋은 하나의 논리적 변경만 담는다.
3. **타입 선택** — 아래 표에서 변경의 *주된 의도*에 맞는 하나를 고른다.
4. **메시지 작성** — 아래 형식대로. 제목은 한글, 본문도 한글.
5. **스테이징 후 커밋** — `git add`로 의도한 파일만 스테이징하고 커밋한다.
   `git commit -A`나 무분별한 `git add .`는 피한다.
6. **결과 보고** — `git log -1 --stat`으로 커밋된 내용을 보여준다.

## 메시지 형식

```
<type>: <한글 요약 — 명령형/요약형, 마침표 없음>

<본문: 이 변경이 왜 필요했고 무엇을 했는지. 한 줄로 충분하면 한 줄.
핵심 결정·검증된 동작은 불릿으로.>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

규칙:
- 제목은 50자 내외(한글은 다소 길어도 무방), 끝에 마침표 금지, "무엇을 했다"가 한눈에.
- 제목과 본문 사이 빈 줄 1개.
- 본문은 *어떻게*보다 *왜*. diff를 보면 아는 내용 반복 금지.
- 부수적으로 곁들인 변경이 있으면 "부수 작업:" 불릿으로 분리(직전 커밋 예시 참고).
- 트레일러 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`는 항상 마지막 줄.
- 스코프(`feat(scope):`)는 이 저장소에서 쓰지 않는다 — 타입만.

## 타입

| type | 쓰는 경우 |
|------|-----------|
| `feat` | 새 기능·스크립트·동작 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 (PRD, README, 주석) |
| `refactor` | 동작 변화 없는 구조 개선·이동·rename |
| `chore` | 설정·빌드·폴더 구조·.gitignore 등 잡무 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가·수정 |
| `style` | 포맷·세미콜론 등 동작 무관 정리 |

## 멀티라인 커밋 (Windows PowerShell)

PowerShell에서 여러 줄 메시지는 single-quoted here-string으로 전달한다.
닫는 `'@`는 반드시 0열(들여쓰기 없음)에 둔다.

```powershell
git commit -m @'
feat: 장갑 온톨로지 검색 데모 추가

표현→그룹→후보 경로를 LLM 없이 시연.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

## 주의

- 사용자가 명시적으로 요청할 때만 커밋한다. push는 별도 요청이 있을 때만.
- 훅을 건너뛰지 않는다 (`--no-verify` 금지). 훅이 실패하면 원인을 고친다.
- 현재 브랜치가 main/master이면 커밋 전에 사용자에게 확인한다.
- 커밋할 변경이 없으면 그 사실만 보고하고 빈 커밋을 만들지 않는다.
