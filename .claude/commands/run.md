---
description: 현재 프로젝트의 앱 타입을 자동 감지하고 적절한 방법으로 실행한다. (uvicorn, streamlit, java, flask 등)
argument-hint: [앱 경로 또는 타입 힌트 (선택)]
---

# run — 앱 자동 감지 후 실행

인자 없이 호출하면 프로젝트 구조를 보고 앱 타입을 판단해 실행한다.

## 감지 순서

아래 순서대로 확인하고 **처음 매칭되는 타입**으로 실행한다.

### 1. uvicorn (FastAPI / Starlette)

`requirements.txt` 또는 `pyproject.toml`에 `uvicorn`이 있거나,
`app.py` / `main.py`에 `FastAPI()` 또는 `Starlette()`가 있으면:

```bash
# 이 프로젝트 기본값 (capstone/ontology_rule_matching/web/)
capstone/.venv-capstone/bin/uvicorn capstone.ontology_rule_matching.web.app:app \
  --host 0.0.0.0 --port 8000 --reload
```

감지 후 실제 `app` 객체 경로를 확인해서 정확한 모듈 경로로 실행한다.

### 2. Streamlit

`requirements.txt`에 `streamlit`이 있거나 `*.py`에 `st.` 호출이 있으면:

```bash
capstone/.venv-capstone/bin/streamlit run <main_script>.py
```

### 3. Flask

`requirements.txt`에 `flask`가 있거나 `Flask(__name__)`이 있으면:

```bash
capstone/.venv-capstone/bin/flask run --host 0.0.0.0 --port 5000
```
또는 `python app.py` (파일 내 `app.run()`이 있으면).

### 4. Jupyter / JupyterLab

`.ipynb` 파일이 있거나 `jupyter`가 requirements에 있으면:

```bash
capstone/.venv-capstone/bin/jupyter lab
```

### 5. Java (Spring Boot / Maven / Gradle)

`pom.xml`이 있으면 Maven, `build.gradle`이 있으면 Gradle:

```bash
# Maven
mvn spring-boot:run

# Gradle
./gradlew bootRun
```

### 6. Node.js

`package.json`에 `scripts.start`가 있으면:

```bash
npm start
```

### 7. 감지 실패

위 중 아무것도 매칭되지 않으면 감지한 파일 목록을 보여주고 사용자에게 타입을 묻는다.

## 실행 전 체크

- 가상환경(`capstone/.venv-capstone/`)이 없으면 `/setup`을 먼저 실행하라고 안내하고 중단.
- `.env` 파일이 필요한지 확인 (`python-dotenv`, `openai` 등이 있는 경우). 없으면 경고만 출력.
- 포트가 이미 사용 중이면 알리고 대체 포트를 제안한다.

## 실행 후

서버가 뜨면 접속 URL을 출력한다:
```
서버 실행 중: http://localhost:8000
```
