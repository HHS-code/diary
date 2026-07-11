#!/usr/bin/env bash
# Stop 훅 — 세션 종료 전, '이번 빌드가 바꾼 파일'만 lint+build로 재검증한다.
# diary는 React/Vite(JS) 프로젝트다. 도구(oxlint/vite)가 없으면 건너뛴다(거짓 차단 방지).
# 실패하면 exit 2로 세션 종료를 막아 에이전트가 스스로 고치게 한다.
#
# 전체 프로젝트가 아니라 '바뀐 파일만' lint 보는 이유:
#  - 기존 코드에 이미 남아있는 잔여 lint 이슈로 이번 step과 무관하게 항상 막히는 걸 피하기 위해.
#  - build는 전체 프로젝트 단위로만 성립하므로(모듈 그래프 전체) 파일 필터 없이 전체 실행한다.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 대화형(사람) 세션에서는 건너뛴다 — 기존 코드의 미해결 린트로 종료를 막지 않기 위해.
[ -n "${STEP_BUILD_RUN:-}" ] || exit 0

command -v npm >/dev/null 2>&1 || exit 0
[ -f package.json ] || exit 0

# 바뀐 src/**/*.{js,jsx} 수집: step-build는 step마다 한 커밋이므로 '직전 커밋'이 이번 step의 변경이다.
# (직전 커밋 HEAD~1..HEAD) + (워킹트리) + (스테이지) + (새 untracked 파일).
changed="$(
  {
    if git rev-parse --verify --quiet HEAD~1 >/dev/null 2>&1; then
      git diff --name-only HEAD~1 HEAD
    fi
    git diff --name-only HEAD
    git diff --name-only --cached
    git ls-files --others --exclude-standard
  } 2>/dev/null | sort -u | grep -E '^src/.*\.(js|jsx)$'
)"

# 실제로 존재하는 파일만 위치 인자에 적재(삭제된 건 제외).
set --
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -f "$f" ] && set -- "$@" "$f"
done <<< "$changed"

[ "$#" -gt 0 ] || exit 0   # 바뀐 .js/.jsx 없음 → 통과

# 1) oxlint: 바뀐 파일만.
npx --no-install oxlint "$@" || exit 2

# 2) vite build: 전체 프로젝트 단위로만 성립하므로 파일 필터 없이 실행.
npm run build || exit 2

exit 0
