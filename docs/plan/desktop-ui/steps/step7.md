# Step 7: app-composition

## 읽을 파일
- `docs/plan/desktop-ui/architecture.md` — "상태 흐름 (App.jsx)" 섹션 전체
- `src/App.jsx` — 현재 step1의 얇은 wrapper 상태
- `src/components/Desktop/Desktop.jsx` — step6 산출물
- `src/components/Window/Window.jsx` — step2 산출물
- `src/components/Taskbar/Taskbar.jsx` — step5 산출물
- `src/components/DiaryApp/DiaryApp.jsx` — step1 산출물

## 작업

`src/App.jsx`를 architecture.md의 "상태 흐름" 그대로 최종 형태로 재작성한다:

```jsx
import { useState } from 'react'
import { Desktop } from './components/Desktop/Desktop'
import { Window } from './components/Window/Window'
import { Taskbar } from './components/Taskbar/Taskbar'
import { DiaryApp } from './components/DiaryApp/DiaryApp'

function App() {
  const [isDiaryOpen, setIsDiaryOpen] = useState(false)

  return (
    <>
      <Desktop onOpenDiary={() => setIsDiaryOpen(true)} />
      <Taskbar />
      {isDiaryOpen && (
        <Window title="diary" onClose={() => setIsDiaryOpen(false)}>
          <DiaryApp />
        </Window>
      )}
    </>
  )
}

export default App
```

(정확한 JSX 문법·import 경로는 실제 파일 구조에 맞춰 조정하되, 상태 흐름과 조합 구조는 위와 동일해야 한다.)

- `isDiaryOpen`이 App.jsx가 갖는 유일한 신규 state다. `DiaryApp` 내부 상태(selectedDate, activeTab 등)는 건드리지 않는다.
- `Window`가 닫히면 `DiaryApp`은 언마운트된다. 다시 열면 `DiaryApp`이 새로 마운트되며 기존 로직대로 `loadAllDiaryData()`를 통해 localStorage에서 다시 데이터를 읽으므로 데이터 유실이 없다 — 이 동작을 별도로 구현할 필요 없이 기존 `DiaryApp`/`diaryStorage.js` 로직이 그대로 처리한다.
- `Taskbar`는 `isDiaryOpen` 값과 무관하게 항상 렌더링한다.

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다.
- `npm run dev`로 개발 서버를 실행해 아래를 직접 확인하고, 결과를 리포트의 "제대로 됐는지 어떻게 확인했나?" 섹션에 구체적으로 기록한다:
  1. 첫 진입 시 Desktop(배경+diary 아이콘+taskbar)이 보이는가.
  2. diary 아이콘 클릭 시 Window가 뜨고, 기존 다이어리 기능(날짜 선택, 캔버스에 스티커/텍스트 추가, 저장)이 정상 동작하는가.
  3. Window가 열려 있는 동안 뒤 Desktop의 diary 아이콘을 클릭해도 반응이 없는가(모달 차단).
  4. Window 닫기(X) 버튼 클릭 시 Desktop 화면으로 돌아가는가.
  5. 전원 버튼 클릭 → DOWNLOAD 클릭 시 JSON 파일이 다운로드되는가.
  6. 하단 우측 시계가 실제 시간에 맞춰 갱신되는가.

## 금지
- `DiaryApp.jsx`, `Calendar`, `Tabs`, `DiaryCanvas`, `ExportImportControls`, `storage/diaryStorage.js` 등 기존 로직 파일을 이 step에서 수정하지 마라. 이유: 마지막 조립 단계이며, UI/기능 분리 원칙상 로직 변경은 이 작업 전체의 범위 밖이다.
- 새 npm 패키지(라우터 등)를 추가하지 마라. 이유: PRD Out-of-scope에 명시.
