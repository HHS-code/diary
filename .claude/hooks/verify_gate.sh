#!/usr/bin/env bash
# Stop 훅 — 세션 종료 전, '이번 빌드가 바꾼 파일'만 린트+테스트 재검증한다.
# 코드·테스트는 capstone/ 아래에 있다. 도구(ruff/pytest)가 없으면 건너뛴다(거짓 차단 방지).
# 실패하면 exit 2로 세션 종료를 막아 에이전트가 스스로 고치게 한다.
#
# 전체 capstone가 아니라 '바뀐 파일만' 보는 이유(OQ-8):
#  - 기존 코드엔 이미 ruff 잔흠 다수 + 일부 테스트는 환경 의존성 부재로 import 실패.
#  - 전체를 보면 빌드가 건드리지도 않은 사전 문제로 항상 막힌다(트랩).
#  - 그래서 빌드가 '자기가 손댄 파일'만 깨끗·통과로 두었는지 본다.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 대화형(사람) 세션에서는 건너뛴다 — 기존 코드의 미해결 린트/테스트로 종료를 막지 않기 위해.
[ -n "${STEP_BUILD_RUN:-}" ] || exit 0

# 바뀐 capstone/*.py 수집: step-build는 step마다 한 커밋이므로 '직전 커밋'이 이번 step의 변경이다.
# (직전 커밋 HEAD~1..HEAD) + (워킹트리) + (스테이지) + (새 untracked 파일).
# main 기준이 아니라 직전 커밋 기준 — feat 브랜치가 main이 아닌 현재 HEAD에서 갈리기 때문.
changed="$(
  {
    if git rev-parse --verify --quiet HEAD~1 >/dev/null 2>&1; then
      git diff --name-only HEAD~1 HEAD
    fi
    git diff --name-only HEAD
    git diff --name-only --cached
    git ls-files --others --exclude-standard
  } 2>/dev/null | sort -u | grep -E '^capstone/.*\.py$'
)"

# 실제로 존재하는 파일만 위치 인자에 적재(삭제된 건 제외).
set --
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -f "$f" ] && set -- "$@" "$f"
done <<< "$changed"

[ "$#" -gt 0 ] || exit 0   # 바뀐 .py 없음 → 통과

# 1) ruff: 바뀐 파일 전부.
command -v ruff >/dev/null 2>&1 && { ruff check "$@" || exit 2; }

# 2) pytest: 바뀐 파일 중 테스트 파일만.
testset=""
for f in "$@"; do
  case "$(basename "$f")" in
    test_*.py|*_test.py) testset="${testset}${f}"$'\n' ;;
  esac
done

if [ -n "$testset" ] && command -v pytest >/dev/null 2>&1; then
  set --
  while IFS= read -r f; do
    [ -n "$f" ] && set -- "$@" "$f"
  done <<< "$testset"
  pytest -q "$@"
  code=$?
  # 0=통과, 5=수집된 테스트 없음 — 둘 다 통과로 본다.
  [ "$code" -eq 0 ] || [ "$code" -eq 5 ] || exit 2
fi

exit 0
