"""TDD 게이트 — PreToolUse 훅.

소스 .py를 Write/Edit 하기 전에 대응 테스트가 먼저 있는지 검사한다.
없으면 차단(deny)하고 "테스트 먼저 쓰라"는 사유를 Claude에게 돌려준다.

**STEP_BUILD_RUN(헤드리스 빌드)일 때만 작동한다.** 대화형(사람) 세션에서는 통과시켜
테스트 없는 기존 스크립트의 정상 유지보수를 막지 않는다.

차단 기준은 'pytest 실행'이 아니라 '대응 테스트 파일 존재 + def test_ 1개 이상'이다.
(green/refactor 단계를 막지 않고, 매 수정마다 pytest를 돌리는 비용을 피한다.)
"""

import json
import os
import re
import sys
from pathlib import Path

DUNDER_FILES = {"__init__.py", "__main__.py"}
EXEMPT_DIRS = ("scratch", ".claude")
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__"}
TEST_DEF_PATTERN = re.compile(r"^\s*def test_", re.MULTILINE)


def read_hook_input() -> dict:
    raw = sys.stdin.read()
    return json.loads(raw)


def get_project_root(payload: dict) -> Path:
    env_root = os.environ.get("CLAUDE_PROJECT_DIR")
    if env_root:
        return Path(env_root)
    cwd = payload.get("cwd")
    if cwd:
        return Path(cwd)
    return Path.cwd()


def relativize(path: Path, project_root: Path) -> Path | None:
    try:
        return path.resolve().relative_to(project_root.resolve())
    except ValueError:
        return None


def is_under_dir(relative: Path | None, dir_name: str) -> bool:
    if relative is None:
        return False
    return dir_name in relative.parts


def is_test_file(path: Path, relative: Path | None) -> bool:
    name = path.name
    if name == "conftest.py":
        return True
    if name.startswith("test_"):
        return True
    if name.endswith("_test.py"):
        return True
    return is_under_dir(relative, "tests")


def is_exempt_source(path: Path, relative: Path | None) -> bool:
    if path.name in DUNDER_FILES:
        return True
    return any(is_under_dir(relative, dir_name) for dir_name in EXEMPT_DIRS)


def is_in_skipped_dir(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def has_test_function(path: Path) -> bool:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return False
    return TEST_DEF_PATTERN.search(text) is not None


def find_test_by_pattern(project_root: Path, pattern: str) -> Path | None:
    for candidate in project_root.rglob(pattern):
        if is_in_skipped_dir(candidate):
            continue
        if has_test_function(candidate):
            return candidate
    return None


def find_matching_test(stem: str, project_root: Path) -> Path | None:
    patterns = [f"test_{stem}.py", f"{stem}_test.py"]
    for pattern in patterns:
        match = find_test_by_pattern(project_root, pattern)
        if match is not None:
            return match
    return None


def build_block_reason(stem: str) -> str:
    return (
        f"TDD 게이트 차단: '{stem}'의 실패 테스트가 먼저 없습니다. "
        f"test_{stem}.py (또는 {stem}_test.py)에 'def test_'로 시작하는 "
        f"실패 테스트를 먼저 작성하세요 — 가능하면 test-writer 서브에이전트에 위임하세요. "
        f"(빠른 실험은 scratch/ 아래에서 자유롭게 가능합니다.)"
    )


def find_block_reason(file_path: str, project_root: Path) -> str | None:
    path = Path(file_path)
    # diary는 JS/JSX 프로젝트이며 테스트 러너가 없다 — .py 이외 파일에는
    # TDD 게이트를 적용하지 않는다(강제할 도구 자체가 없으므로 항상 통과).
    if path.suffix != ".py":
        return None
    relative = relativize(path, project_root)
    if relative is None:
        return None  # 프로젝트 밖 파일은 이 게이트의 관할이 아님
    if is_test_file(path, relative):
        return None
    if is_exempt_source(path, relative):
        return None
    if find_matching_test(path.stem, project_root) is not None:
        return None
    return build_block_reason(path.stem)


def emit_deny(reason: str) -> None:
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }
    json.dump(output, sys.stdout)


def main() -> None:
    if not os.environ.get("STEP_BUILD_RUN"):
        return
    payload = read_hook_input()
    file_path = payload.get("tool_input", {}).get("file_path")
    if not file_path:
        return
    project_root = get_project_root(payload)
    reason = find_block_reason(file_path, project_root)
    if reason is None:
        return
    emit_deny(reason)


if __name__ == "__main__":
    main()
