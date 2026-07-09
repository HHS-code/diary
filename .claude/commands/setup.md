---
description: 처음 git clone 후 Python 가상환경(venv-capstone)을 생성하고 requirements.txt를 설치한다.
argument-hint: [특정 requirements 파일 경로 (선택, 기본: capstone/ontology_rule_matching/requirements.txt)]
---

# setup — 가상환경 초기 설정

처음 클론하거나 다른 환경에서 시작할 때 `venv-capstone` 가상환경을 만들고 의존성을 설치한다.

## 절차

1. **현황 파악** — 아래를 병렬로 확인:
   - `capstone/.venv-capstone/` 디렉터리가 이미 존재하는지
   - Python 버전 (`python3 --version`)
   - requirements 파일 위치 (인자로 지정되면 그 경로, 없으면 `capstone/ontology_rule_matching/requirements.txt`)

2. **venv 생성** — `.venv-capstone`이 없으면:
   ```
   python3 -m venv capstone/.venv-capstone
   ```
   이미 있으면 "이미 존재함, 패키지만 업데이트"를 알리고 다음 단계로.

3. **requirements 설치**:
   ```
   capstone/.venv-capstone/bin/pip install --upgrade pip
   capstone/.venv-capstone/bin/pip install -r <requirements_path>
   ```

4. **설치 검증** — `pip list`로 핵심 패키지(fastapi, uvicorn, openai, pydantic) 버전을 확인하고 요약 출력.

5. **활성화 안내** — 완료 후 다음 메시지를 출력:
   ```
   완료. 가상환경을 활성화하려면:
     source capstone/.venv-capstone/bin/activate
   ```

## 주의

- `venv-capstone` 이름을 바꾸지 않는다 (`.gitignore`에 이미 등록된 이름).
- 설치 중 에러가 나면 전체 pip 출력을 보여주고 중단한다. 자동으로 우회하지 않는다.
- Python 버전이 3.9 미만이면 경고를 출력하고 사용자에게 확인을 받는다.
