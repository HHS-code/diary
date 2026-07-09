---
description: 현재 브랜치를 원격(origin)에 푸쉬한다. main/dev 직접 push를 막고, 업스트림이 없으면 자동 설정한다.
---

# push — 현재 브랜치 푸쉬

`/commit`으로 커밋한 뒤 원격에 올릴 때 사용한다.

## 절차

1. **현황 파악** — 병렬로 확인:
   - 현재 브랜치명 (`git branch --show-current`)
   - 커밋 대기 여부 (`git status`)
   - 원격 업스트림 설정 여부 (`git rev-parse --abbrev-ref --symbolic-full-name @{u}`)

2. **안전 체크**
   - 브랜치가 `main` 또는 `dev`이면 **즉시 중단**: "main/dev 직접 push 금지 — Merge Request로만 반영하세요."
   - 커밋되지 않은 변경이 있으면 경고: "`/commit`으로 먼저 커밋하세요."

3. **푸쉬 실행**
   - 업스트림이 설정돼 있으면: `git push`
   - 업스트림이 없으면: `git push --set-upstream origin <브랜치명>`

4. **결과 보고** — 성공 시 원격 URL과 브랜치명 출력. 실패 시 에러 전문을 그대로 출력하고 해결 방법을 제안한다.

## 주의

- `--force` / `--force-with-lease`는 사용하지 않는다. 필요하다고 판단될 때는 반드시 사용자에게 먼저 확인한다.
- `--no-verify`는 절대 사용하지 않는다.
