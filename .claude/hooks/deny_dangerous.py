"""위험 명령 거부 게이트 — PreToolUse(Bash) 훅.

headless 자동 실행 중 파괴적/유출 위험 명령을 차단한다.
--dangerously-skip-permissions를 켜도 PreToolUse 훅은 작동하므로, 이 훅이 진짜 안전망이다. (P0)

차단 정책(OQ-4):
- 파괴/주입 류는 **대화형·헤드리스 양쪽 모두** 항상 차단.
- 단순 네트워크 송수신(curl/wget/nc 등)은 **헤드리스(STEP_BUILD_RUN)일 때만** 차단
  — 대화형에서는 헬스체크 등 정상 사용을 막지 않는다.

주의(잔여 위험): denylist는 원리적으로 완전할 수 없다. `python -c "..."` 인라인 실행은
정상 작업을 자주 막으므로 차단하지 않는다 — 수용된 잔여 위험.
"""

import json
import os
import re
import sys

# 항상 차단 — 파괴/주입 류. (정규식, 사유)
ALWAYS_DENY_RULES = [
    (r"\brm\s+-\w*[rR]\w*[fF]", "rm -rf 류 대량 삭제"),
    (r"\brm\s+-\w*[fF]\w*[rR]", "rm -fr 류 대량 삭제"),
    (r"\bgit\s+push\b.*(--force|-f)\b", "force push"),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard"),
    (r"\bgit\s+clean\s+-\w*f", "git clean -f"),
    (r"\bdd\s+if=", "dd 디스크 쓰기"),
    (r"\bmkfs\b", "파일시스템 포맷"),
    (r":\(\)\s*\{", "fork bomb"),
    (r"\bDROP\s+(TABLE|DATABASE)\b", "DROP TABLE/DATABASE"),
    (r">\s*/dev/sd", "블록 디바이스 직접 쓰기"),
    (r"\bchmod\s+-R\s+777\b", "chmod -R 777"),
    # W1-a 보강: 확실히 안전하게 추가 가능한 우회 패턴
    (r"\bbase64\s+-d\b.*\|\s*(sh|bash|zsh)\b", "base64 디코드 후 셸 실행"),
    (r"\bcurl\b.*\|\s*(sh|bash|zsh)\b", "원격 스크립트 파이프 실행"),
    (r"\bwget\b.*\|\s*(sh|bash|zsh)\b", "원격 스크립트 파이프 실행"),
    (r"\beval\b", "eval 동적 실행"),
    (r"\bsudo\b", "sudo 권한 상승"),
    (r">\s*/etc/", "/etc 시스템 경로 쓰기"),
    (r">\s*/usr/", "/usr 시스템 경로 쓰기"),
    (r">\s*~/\.ssh", "~/.ssh 쓰기"),
]

# 헤드리스(STEP_BUILD_RUN)에서만 차단 — 단순 네트워크 송수신.
NETWORK_DENY_RULES = [
    (r"\b(curl|wget|nc|ncat|telnet)\b", "네트워크 송수신(유출 위험) — 의존성은 pip/uv로"),
]

ALWAYS_COMPILED = [(re.compile(pattern, re.IGNORECASE), reason) for pattern, reason in ALWAYS_DENY_RULES]
NETWORK_COMPILED = [(re.compile(pattern, re.IGNORECASE), reason) for pattern, reason in NETWORK_DENY_RULES]


SAFETY_PATH = re.compile(r"\.claude/(hooks|settings)", re.IGNORECASE)


def find_deny_reason(command: str, build_run: bool) -> str | None:
    if build_run and SAFETY_PATH.search(command):
        return "빌드 중 안전장치(.claude/hooks·settings) 수정 금지"
    for pattern, reason in ALWAYS_COMPILED:
        if pattern.search(command):
            return reason
    if not build_run:
        return None
    for pattern, reason in NETWORK_COMPILED:
        if pattern.search(command):
            return reason
    return None


def emit_deny(reason: str) -> None:
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"위험 명령 차단(P0 안전층): {reason}",
        }
    }
    json.dump(output, sys.stdout)


def main() -> None:
    payload = json.loads(sys.stdin.read())
    command = payload.get("tool_input", {}).get("command", "")
    if not command:
        return
    build_run = bool(os.environ.get("STEP_BUILD_RUN"))
    reason = find_deny_reason(command, build_run)
    if reason is None:
        return
    emit_deny(reason)


if __name__ == "__main__":
    main()
