"""안전장치 보호 게이트 — PreToolUse(Write|Edit) 훅.

headless 빌드 세션(STEP_BUILD_RUN=1)이 자기 안전장치(.claude/hooks/·settings.json)를
수정해 무력화하지 못하게 막는다. 대화형(사람) 세션에서는 작동하지 않아 정상 유지보수를 막지 않는다.
"""

import json
import os
import sys
from pathlib import Path

PROTECTED_FILES = {"settings.json", "settings.local.json"}


def is_protected(file_path: str) -> bool:
    parts = Path(file_path).parts
    if ".claude" not in parts:
        return False
    after = parts[parts.index(".claude") + 1:]
    if not after:
        return False
    if after[0] == "hooks":
        return True
    if len(after) == 1 and after[0] in PROTECTED_FILES:
        return True
    return False


def emit_deny(file_path: str) -> None:
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"빌드 중 안전장치 수정 금지(P0): {file_path}. "
                f"훅·settings는 대화형 세션에서만 바꾼다."
            ),
        }
    }
    json.dump(output, sys.stdout)


def main() -> None:
    if not os.environ.get("STEP_BUILD_RUN"):
        return
    payload = json.loads(sys.stdin.read())
    file_path = payload.get("tool_input", {}).get("file_path")
    if not file_path:
        return
    if not is_protected(file_path):
        return
    emit_deny(file_path)


if __name__ == "__main__":
    main()
