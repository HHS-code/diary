# Step 1: diary-app-extraction

## 읽을 파일
- `src/App.jsx` (현재 내용 전체)
- `docs/plan/desktop-ui/architecture.md` — "핵심 원칙: UI/기능 분리", "폴더 구조" 중 `DiaryApp` 설명

## 작업

지금 앱을 켜면 바로 다이어리 화면이 뜬다. 이후 step들에서 데스크톱 화면을 앞에 붙일 건데, 그 전에 기존 다이어리 로직을 그대로 별도 컴포넌트로 옮겨서 "틀"과 "기능"을 분리해둔다. **이 step은 순수 이동이며, 로직은 한 글자도 바꾸지 않는다.**

1. `src/components/DiaryApp/DiaryApp.jsx`를 새로 만들고, 현재 `src/App.jsx`의 내용을 그대로 옮긴다.
   - 함수 이름만 `App` → `DiaryApp`으로 바꾼다 (export도 `export function DiaryApp()` 형태로, named export든 default든 일관되게 — 이후 step에서 `import { DiaryApp } from './components/DiaryApp/DiaryApp'` 형태로 쓸 수 있게 named export 사용).
   - import 경로(`./components/Calendar/Calendar` 등)는 파일 위치가 `src/App.jsx` → `src/components/DiaryApp/DiaryApp.jsx`로 한 단계 더 들어갔으므로 `../../` 기준으로 조정한다.
   - 상태 관리, JSX 구조, 함수 로직은 그대로 복사 — 리팩터링하지 않는다.

2. `src/App.jsx`는 아래와 같은 얇은 wrapper로 교체한다 (다음 step들에서 이 파일을 계속 확장할 것이므로 지금은 최소 형태로):
   ```jsx
   import { DiaryApp } from './components/DiaryApp/DiaryApp'

   function App() {
     return <DiaryApp />
   }

   export default App
   ```

이 시점에서 앱을 실행하면 화면 동작이 지금과 100% 동일해야 한다 — 달력, 탭, 캔버스 편집, 자동 저장, JSON/PNG 내보내기·불러오기 전부 그대로.

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다.

## 금지
- `DiaryApp.jsx`로 옮기는 과정에서 로직을 "개선"하거나 변수명을 바꾸거나 리팩터링하지 마라. 이유: CLAUDE.md "수술적 변경" 원칙 — 이번 step은 이동만, 로직 변경은 범위 밖.
- `Calendar`, `Tabs`, `DiaryCanvas`, `ExportImportControls`, `storage/diaryStorage.js` 파일 자체는 건드리지 마라. 이유: PRD "UI/기능 분리" 원칙 — 기존 기능 컴포넌트는 무수정.
