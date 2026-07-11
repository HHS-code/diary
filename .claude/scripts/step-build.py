#!/usr/bin/env python3
"""step-build 러너 — 합의된 계획의 step들을 새 headless 세션으로 순차 실행하고 자가교정한다.

전역 스크립트다. **실행한 현재 폴더(cwd)의 프로젝트**를 대상으로 동작한다.

사용:
    cd <프로젝트 루트>
    python ~/.claude/scripts/step-build.py <plan-dir> [--push]

예: python ~/.claude/scripts/step-build.py docs/plan/tradingview-v1

기대 구조 (plan-dir 기준):
    <plan-dir>/PRD.md, ADR.md, architecture.md   # 가드레일(합의 문서)
    <plan-dir>/steps/index.json                   # 상태머신
    <plan-dir>/steps/step{N}.md                   # step별 지시
    <plan-dir>/reports/                           # 사람용 리포트 (러너/세션이 생성)
"""

import argparse
import contextlib
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import types

if sys.platform == "win32":
    # Windows 콘솔/리다이렉트 기본 인코딩(cp949 등)은 em dash 같은 유니코드 문자를
    # 못 찍고 죽는다(UnicodeEncodeError). stdout/stderr를 UTF-8로 강제한다.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional


@contextlib.contextmanager
def progress_indicator(label: str):
    """터미널 진행 표시기. with로 쓰고 .elapsed로 경과 시간을 읽는다."""
    frames = "|/-\\"
    stop = threading.Event()
    t0 = time.monotonic()

    def _animate() -> None:
        idx = 0
        while not stop.wait(0.2):
            sec = int(time.monotonic() - t0)
            sys.stderr.write(f"\r{frames[idx % len(frames)]} {label} [{sec}s]")
            sys.stderr.flush()
            idx += 1
        sys.stderr.write("\r" + " " * (len(label) + 24) + "\r")
        sys.stderr.flush()

    thread = threading.Thread(target=_animate, daemon=True)
    thread.start()
    info = types.SimpleNamespace(elapsed=0.0)
    try:
        yield info
    finally:
        stop.set()
        thread.join()
        info.elapsed = time.monotonic() - t0


STATUS_MARK = {
    "completed": "[완료]",
    "error": "[실패]",
    "blocked": "[차단]",
    "pending": "[대기]",
}


class StepBuilder:
    """plan 폴더의 step들을 새 세션으로 순차 실행하는 하네스."""

    MAX_RETRIES = 3
    FEAT_MSG = "feat({phase}): step {num} — {name}"
    CHORE_MSG = "chore({phase}): step {num} 메타데이터"
    TZ = timezone(timedelta(hours=9))
    STEP_TIMEOUT = 1800

    def __init__(self, plan_dir_arg: str, *, auto_push: bool = False):
        self._root = Path.cwd()
        self._plan_dir = (self._root / plan_dir_arg).resolve()
        self._steps_dir = self._plan_dir / "steps"
        self._reports_dir = self._plan_dir / "reports"
        self._index_file = self._steps_dir / "index.json"
        self._auto_push = auto_push

        if not self._index_file.exists():
            print(f"ERROR: {self._index_file} 가 없습니다. 먼저 /step-build로 분해하세요.")
            sys.exit(1)

        index = self._read_json(self._index_file)
        self._project = index.get("project", "project")
        self._phase = index.get("phase", self._plan_dir.name)
        self._total = len(index["steps"])

    def run(self) -> None:
        self._print_header()
        self._check_blockers()
        self._checkout_branch()
        guardrails = self._load_guardrails()
        self._ensure_created_at()
        self._execute_all_steps(guardrails)
        self._finalize()

    # --- 타임스탬프 / JSON ---

    def _stamp(self) -> str:
        return datetime.now(self.TZ).strftime("%Y-%m-%dT%H:%M:%S%z")

    @staticmethod
    def _read_json(path: Path) -> dict:
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _write_json(path: Path, data: dict) -> None:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # --- git ---

    def _run_git(self, *args) -> subprocess.CompletedProcess:
        # Windows 기본 로케일(cp949)로 git의 UTF-8 출력(—, ✓ 등)을 읽으면
        # UnicodeDecodeError로 reader thread가 죽는다 — encoding을 명시한다.
        return subprocess.run(
            ["git", *args], cwd=self._root, capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )

    def _checkout_branch(self) -> None:
        branch = f"feat-{self._phase}"
        head = self._run_git("rev-parse", "--abbrev-ref", "HEAD")
        if head.returncode != 0:
            print("  ERROR: git repo가 아니거나 git을 쓸 수 없습니다.")
            print(f"  {head.stderr.strip()}")
            sys.exit(1)
        if head.stdout.strip() == branch:
            return

        exists = self._run_git("rev-parse", "--verify", branch)
        if exists.returncode == 0:
            checkout = self._run_git("checkout", branch)
        else:
            checkout = self._run_git("checkout", "-b", branch)
        if checkout.returncode != 0:
            print(f"  ERROR: 브랜치 '{branch}' checkout 실패. {checkout.stderr.strip()}")
            print("  Hint: 변경사항을 stash하거나 commit 후 다시 시도하세요.")
            sys.exit(1)
        print(f"  Branch: {branch}")

    def _commit_step(self, step_num: int, step_name: str) -> None:
        index_rel = str(self._index_file.relative_to(self._root))
        output_rel = str((self._steps_dir / f"step{step_num}-output.json").relative_to(self._root))

        self._run_git("add", "-A")
        self._run_git("reset", "HEAD", "--", index_rel)
        self._run_git("reset", "HEAD", "--", output_rel)
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = self.FEAT_MSG.format(phase=self._phase, num=step_num, name=step_name)
            committed = self._run_git("commit", "-m", msg)
            if committed.returncode == 0:
                print(f"  Commit: {msg}")

        self._run_git("add", "-A")
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = self.CHORE_MSG.format(phase=self._phase, num=step_num)
            self._run_git("commit", "-m", msg)

    # --- 가드레일 / 컨텍스트 ---

    def _load_guardrails(self) -> str:
        sections = []
        claude_md = self._root / "CLAUDE.md"
        if claude_md.exists():
            sections.append(f"## 프로젝트 규칙 (CLAUDE.md)\n\n{claude_md.read_text(encoding='utf-8')}")
        for doc in sorted(self._plan_dir.glob("*.md")):
            sections.append(f"## 합의 문서: {doc.stem}\n\n{doc.read_text(encoding='utf-8')}")
        return "\n\n---\n\n".join(sections)

    @staticmethod
    def _build_step_context(index: dict) -> str:
        blocks = [
            f"### Step {s['step']} ({s['name']})\n{s['summary']}"
            for s in index["steps"]
            if s["status"] == "completed" and s.get("summary")
        ]
        if not blocks:
            return ""
        return "## 이전 Step 산출물\n\n" + "\n\n".join(blocks) + "\n\n"

    def _report_instruction(self, step_num: int, step_name: str) -> str:
        report_rel = (self._reports_dir / f"step{step_num}-{step_name}.md").relative_to(self._root)
        return (
            f"## 사람용 리포트 작성 (필수)\n"
            f"AC 통과 후 `{report_rel}` 를 아래 형식으로 작성하라.\n"
            f"- 독자: 해당 도메인은 알고 개발 지식은 약한 사람. 도메인 용어는 정의하지 말고,\n"
            f"  독자가 모를 개발 용어만 나오는 즉시 한 줄로 풀이하라.\n"
            f"- 이야기 흐름 / 쉬운 말 / 구체적 숫자 예시 / 시그니처 대신 '무슨 일을 하는지' / 솔직함.\n"
            f"- 이모지 금지. 다이어그램은 ASCII.\n"
            f"- 섹션: '# Step {step_num}: <제목>' / '## 이 단계를 왜 했나?' / '## 무엇을 만들었나?' /\n"
            f"  '## 데이터가 어떻게 흐르나?'(ASCII 그림+풀이+숫자 예시) / '## 쉽게 말하면'(비유) /\n"
            f"  '## 만든 파일' / '## 제대로 됐는지 어떻게 확인했나?'(AC 결과) /\n"
            f"  '## 전체 그림에서 지금 어디?'(진행 지도+다음이 왜 그건지) / '## 아직 안 된 것 (솔직하게)'\n\n"
        )

    def _build_preamble(self, step: dict, guardrails: str, step_context: str,
                        prev_error: Optional[str] = None) -> str:
        step_num, step_name = step["step"], step["name"]
        index_rel = self._index_file.relative_to(self._root)
        commit_example = self.FEAT_MSG.format(phase=self._phase, num=step_num, name=step_name)

        retry_section = ""
        if prev_error:
            retry_section = (
                f"\n## 이전 시도 실패 — 아래 에러를 반드시 참고하여 수정하라\n\n{prev_error}\n\n---\n\n"
            )

        return (
            f"당신은 {self._project} 프로젝트의 개발자입니다. 아래 step을 수행하세요.\n\n"
            f"{guardrails}\n\n---\n\n"
            f"{step_context}{retry_section}"
            f"## 작업 규칙\n"
            f"1. 이전 step의 코드를 읽고 일관성을 유지하라.\n"
            f"2. 이 step에 명시된 작업만 하라. 추가 기능/파일을 만들지 마라.\n"
            f"3. TDD: 실패하는 테스트를 먼저 쓰고, 통과시키는 구현을 작성하라.\n"
            f"4. 기존 테스트를 깨뜨리지 마라.\n"
            f"5. AC(Acceptance Criteria)를 직접 실행해 검증하라.\n"
            f"6. `{index_rel}`의 해당 step status를 갱신하라:\n"
            f"   - AC 통과 → \"completed\" + \"summary\"에 다음 step용 짧은 구조 블록:\n"
            f"       만든 공개 시그니처(함수/클래스) · 핵심 결정/제약 · 다음 step이 읽어야 할 산출 파일 경로.\n"
            f"       3~6줄로 간결히. 한 줄 요약이 아니라, 다음 세션이 이 step 없이도 이어가게 할 핵심 사실.\n"
            f"   - {self.MAX_RETRIES}회 수정 후에도 실패 → \"error\" + \"error_message\"\n"
            f"   - 사람 개입 필요(키·인증·수동설정) → \"blocked\" + \"blocked_reason\" 후 즉시 중단\n"
            f"7. 모든 변경을 커밋하라: {commit_example}\n\n"
            f"{self._report_instruction(step_num, step_name)}"
            f"---\n\n"
        )

    # --- Claude 호출 ---

    @staticmethod
    def _fresh_path_env() -> dict:
        """subprocess에 넘길 환경변수를 만든다.

        Windows에서는 이 파이썬 프로세스를 띄운 부모(터미널/에디터)가 시작된 뒤에
        node/claude 등이 새로 설치되면, 레지스트리 PATH는 갱신돼도 이미 떠 있는
        프로세스의 os.environ은 그대로라 자식 프로세스가 새 실행파일을 못 찾는다.
        그래서 Windows에서는 subprocess를 띄우기 직전에 레지스트리에서 최신
        Machine/User PATH를 다시 읽어 os.environ의 PATH 앞에 붙인다.
        """
        env = {**os.environ}
        if sys.platform != "win32":
            return env
        try:
            import winreg

            def read_path(root, subkey: str) -> str:
                with winreg.OpenKey(root, subkey) as key:
                    value, _ = winreg.QueryValueEx(key, "Path")
                    return value

            machine_path = read_path(
                winreg.HKEY_LOCAL_MACHINE,
                r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
            )
            try:
                user_path = read_path(winreg.HKEY_CURRENT_USER, "Environment")
            except OSError:
                user_path = ""
            fresh = ";".join(p for p in (machine_path, user_path) if p)
            if fresh:
                env["PATH"] = fresh + ";" + env.get("PATH", "")
        except OSError:
            pass
        return env

    @staticmethod
    def _resolve_claude_bin(env: dict) -> str:
        """실행 가능한 claude 경로를 찾는다.

        subprocess는 shell=False라 PATHEXT를 못 읽는다. macOS/Linux는 실행파일이
        확장자 없는 'claude' 그대로라 문제없지만, Windows npm 글로벌 설치본은
        'claude.cmd'/'claude.ps1'이라 바로 이름 'claude'로는 CreateProcess가 못 찾는다.
        shutil.which로 PATHEXT까지 반영해 실제 경로를 확인하고, 못 찾으면 원래
        이름을 그대로 반환해 기존 동작(및 에러 메시지)을 유지한다.
        """
        found = shutil.which("claude", path=env.get("PATH"))
        return found if found else "claude"

    def _invoke_claude(self, step: dict, preamble: str) -> None:
        step_num = step["step"]
        step_file = self._steps_dir / f"step{step_num}.md"
        if not step_file.exists():
            print(f"  ERROR: {step_file} 가 없습니다.")
            sys.exit(1)

        prompt = preamble + step_file.read_text(encoding="utf-8")
        env = {**self._fresh_path_env(), "STEP_BUILD_RUN": "1"}
        claude_bin = self._resolve_claude_bin(env)
        result = subprocess.run(
            [claude_bin, "-p", "--dangerously-skip-permissions", "--output-format", "json"],
            input=prompt, cwd=self._root, capture_output=True, text=True,
            encoding="utf-8", timeout=self.STEP_TIMEOUT, env=env,
        )
        if result.returncode != 0:
            print(f"\n  WARN: Claude 비정상 종료 (code {result.returncode})")
            if result.stderr:
                print(f"  stderr: {result.stderr[:500]}")

        output = {
            "step": step_num, "name": step["name"],
            "exitCode": result.returncode,
            "stdout": result.stdout, "stderr": result.stderr,
        }
        out_path = self._steps_dir / f"step{step_num}-output.json"
        self._write_json(out_path, output)

    # --- 헤더 / 검증 ---

    def _print_header(self) -> None:
        print(f"\n{'=' * 60}")
        print("  step-build 러너")
        print(f"  Project: {self._project} | Phase: {self._phase} | Steps: {self._total}")
        if self._auto_push:
            print("  Auto-push: enabled")
        print(f"{'=' * 60}")

    def _check_blockers(self) -> None:
        index = self._read_json(self._index_file)
        for s in reversed(index["steps"]):
            if s["status"] == "error":
                print(f"\n  Step {s['step']} ({s['name']}) 실패 상태입니다.")
                print(f"  Error: {s.get('error_message', 'unknown')}")
                print("  고친 뒤 status를 'pending'으로 바꾸고 재실행하세요.")
                sys.exit(1)
            if s["status"] == "blocked":
                print(f"\n  Step {s['step']} ({s['name']}) 차단 상태입니다.")
                print(f"  Reason: {s.get('blocked_reason', 'unknown')}")
                print("  해결 뒤 status를 'pending'으로 바꾸고 재실행하세요.")
                sys.exit(2)
            if s["status"] != "pending":
                break

    def _ensure_created_at(self) -> None:
        index = self._read_json(self._index_file)
        if "created_at" not in index:
            index["created_at"] = self._stamp()
            self._write_json(self._index_file, index)

    # --- 실행 루프 ---

    def _mark_timestamp(self, step_num: int, field: str) -> None:
        index = self._read_json(self._index_file)
        for s in index["steps"]:
            if s["step"] == step_num:
                s[field] = self._stamp()
        self._write_json(self._index_file, index)

    def _reset_to_pending(self, step_num: int) -> None:
        index = self._read_json(self._index_file)
        for s in index["steps"]:
            if s["step"] == step_num:
                s["status"] = "pending"
                s.pop("error_message", None)
        self._write_json(self._index_file, index)

    def _mark_error(self, step_num: int, err_msg: str) -> None:
        index = self._read_json(self._index_file)
        for s in index["steps"]:
            if s["step"] == step_num:
                s["status"] = "error"
                s["error_message"] = f"[{self.MAX_RETRIES}회 시도 후 실패] {err_msg}"
                s["failed_at"] = self._stamp()
        self._write_json(self._index_file, index)

    @staticmethod
    def _status_of(index: dict, step_num: int) -> str:
        for s in index["steps"]:
            if s["step"] == step_num:
                return s.get("status", "pending")
        return "pending"

    @staticmethod
    def _field_of(index: dict, step_num: int, field: str) -> str:
        for s in index["steps"]:
            if s["step"] == step_num:
                return s.get(field, "")
        return ""

    def _execute_single_step(self, step: dict, guardrails: str) -> None:
        """단일 step을 재시도 포함 실행. 실패/차단이면 종료한다."""
        step_num, step_name = step["step"], step["name"]
        done = sum(1 for s in self._read_json(self._index_file)["steps"] if s["status"] == "completed")
        prev_error = None

        for attempt in range(1, self.MAX_RETRIES + 1):
            index = self._read_json(self._index_file)
            preamble = self._build_preamble(step, guardrails, self._build_step_context(index), prev_error)

            tag = f"Step {step_num}/{self._total - 1} ({done} done): {step_name}"
            if attempt > 1:
                tag += f" [retry {attempt}/{self.MAX_RETRIES}]"
            with progress_indicator(tag) as pi:
                self._invoke_claude(step, preamble)
                elapsed = int(pi.elapsed)

            index = self._read_json(self._index_file)
            status = self._status_of(index, step_num)

            if status == "completed":
                self._mark_timestamp(step_num, "completed_at")
                self._regenerate_reports_index()
                self._commit_step(step_num, step_name)
                print(f"  완료 Step {step_num}: {step_name} [{elapsed}s]")
                return

            if status == "blocked":
                self._mark_timestamp(step_num, "blocked_at")
                reason = self._field_of(index, step_num, "blocked_reason")
                print(f"  차단 Step {step_num}: {step_name} [{elapsed}s]\n    Reason: {reason}")
                sys.exit(2)

            err_msg = self._field_of(index, step_num, "error_message") or "Step이 status를 갱신하지 않음"
            if attempt < self.MAX_RETRIES:
                self._reset_to_pending(step_num)
                prev_error = err_msg
                print(f"  재시도 Step {step_num}: {attempt}/{self.MAX_RETRIES} — {err_msg}")
            else:
                self._mark_error(step_num, err_msg)
                self._commit_step(step_num, step_name)
                print(f"  실패 Step {step_num}: {step_name} ({self.MAX_RETRIES}회 시도) [{elapsed}s]")
                print(f"    Error: {err_msg}")
                sys.exit(1)

    def _execute_all_steps(self, guardrails: str) -> None:
        while True:
            index = self._read_json(self._index_file)
            pending = next((s for s in index["steps"] if s["status"] == "pending"), None)
            if pending is None:
                print("\n  모든 step 완료!")
                return
            self._mark_timestamp(pending["step"], "started_at")
            self._execute_single_step(pending, guardrails)

    # --- 리포트 줄거리 인덱스 (기계 생성) ---

    def _regenerate_reports_index(self) -> None:
        self._reports_dir.mkdir(parents=True, exist_ok=True)
        index = self._read_json(self._index_file)
        lines = [f"# 빌드 리포트 — {self._project} ({self._phase})", "",
                 "각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.", ""]
        for s in index["steps"]:
            mark = STATUS_MARK.get(s.get("status", "pending"), "[대기]")
            summary = next(iter(s.get("summary", "").splitlines()), "")
            report_file = self._reports_dir / f"step{s['step']}-{s['name']}.md"
            entry = f"- {mark} **Step {s['step']}: {s['name']}** — {summary}"
            if report_file.exists():
                entry += f" ([리포트]({report_file.name}))"
            lines.append(entry)
        (self._reports_dir / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # --- 마무리 ---

    def _finalize(self) -> None:
        index = self._read_json(self._index_file)
        index["completed_at"] = self._stamp()
        self._write_json(self._index_file, index)
        self._regenerate_reports_index()

        self._run_git("add", "-A")
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            self._run_git("commit", "-m", f"chore({self._phase}): phase 완료 표시")

        if self._auto_push:
            branch = f"feat-{self._phase}"
            pushed = self._run_git("push", "-u", "origin", branch)
            if pushed.returncode != 0:
                print(f"\n  ERROR: git push 실패: {pushed.stderr.strip()}")
                sys.exit(1)
            print(f"  Pushed: origin/{branch}")

        print(f"\n{'=' * 60}")
        print(f"  Phase '{self._phase}' 완료!  리뷰: {self._reports_dir.relative_to(self._root)}/README.md")
        print(f"{'=' * 60}")


def main() -> None:
    parser = argparse.ArgumentParser(description="step-build 러너 (cwd 프로젝트 대상)")
    parser.add_argument("plan_dir", help="plan 폴더 (예: docs/plan/tradingview-v1)")
    parser.add_argument("--push", action="store_true", help="완료 후 브랜치 push")
    args = parser.parse_args()
    StepBuilder(args.plan_dir, auto_push=args.push).run()


if __name__ == "__main__":
    main()
