# Architecture — Windows XP 스타일 데스크톱 진입 UI

## 핵심 원칙: UI/기능 분리

새로 만드는 컴포넌트(Desktop, Window, Taskbar, PowerButton, Clock)는 **표시 전용 틀**이다. 기존 기능 컴포넌트(Calendar, Tabs, DiaryCanvas, ExportImportControls)와 storage 로직(`diaryStorage.js`)은 **내부 로직을 한 줄도 수정하지 않는다.** 새 UI는 이들을 감싸거나(wrap), 이미 있는 함수를 호출만 한다.

이를 위해 기존 `App.jsx`의 내용(캘린더/탭/캔버스 조합 로직)을 그대로 `DiaryApp.jsx`로 옮기고, `App.jsx`는 "Desktop을 보여줄지 Window(DiaryApp)를 보여줄지"만 결정하는 조합 루트가 된다.

## 폴더 구조 (제안)

```
diary/
  docs/plan/desktop-ui/     PRD.md, architecture.md
  src/
    assets/
      icons.js               4개 이미지를 import해 이름 붙여 export하는 창구
      wallpaper.png           Bliss 배경 (reference/Bliss_(Windows_XP).png 복사)
      diary-icon.png           diary 폴더 아이콘 (reference/pngwing.com (2).png 복사)
      power-button.png         전원 버튼 (reference/powerbutton.png 복사)
      download-icon.png        다운로드 아이콘 (reference/save_button.png 복사)
    components/
      Desktop/
        Desktop.jsx           배경 + diary 아이콘. onOpenDiary(props)로 클릭 알림만 함
      Window/
        Window.jsx            타이틀바+닫기 버튼+모달 오버레이. children을 감싸기만 함
      Taskbar/
        Taskbar.jsx            하단 전체 폭 바. PowerButton + Clock 배치
      PowerButton/
        PowerButton.jsx        전원 아이콘 + DOWNLOAD 플라이아웃 메뉴. 클릭 시 diaryStorage의
                                loadAllDiaryData()를 호출해 JSON 다운로드 (로직은 기존 것 재사용)
      Clock/
        Clock.jsx               setInterval로 1초마다 갱신되는 실시간 시계 텍스트
      DiaryApp/
        DiaryApp.jsx            기존 App.jsx 내용을 그대로 이동 (로직 무변경)
      Calendar/                 (기존, 무변경)
      DiaryCanvas/              (기존, 무변경)
      ExportImportControls/     (기존, 무변경 — PowerButton이 이 컴포넌트가 아니라
                                  diaryStorage.js의 함수를 직접 재사용함)
      StickerPalette/ ...       (기존, 무변경)
    storage/
      diaryStorage.js           (기존, 무변경)
    App.jsx                     Desktop / Window(DiaryApp) 조합 루트로 재작성
    main.jsx                    (무변경)
```

## 컴포넌트 책임

- **Desktop**: Bliss 배경 이미지를 전체 화면에 깔고, 좌상단에 diary 아이콘(이미지+"diary" 텍스트)을 렌더링. 아이콘 클릭 시 부모(App)로부터 받은 콜백만 호출. 내부 상태 없음.
- **Window**: `{ title, onClose, children }`을 받아 화면 중앙에 고정 크기로 렌더링하는 순수 레이아웃 컴포넌트. 타이틀바(제목+닫기 버튼)와 배경 클릭 차단용 오버레이(모달)를 담당. children의 내용(다이어리 기능)에 대해서는 아무것도 모른다.
- **Taskbar**: 하단 고정 바. PowerButton과 Clock을 좌/우로 배치하는 레이아웃만 담당.
- **PowerButton**: 클릭 시 내부 state로 메뉴 열림/닫힘을 토글. 메뉴에는 "DOWNLOAD" 항목 하나. 클릭 시 `diaryStorage.loadAllDiaryData()`로 데이터를 읽어 Blob으로 JSON 파일 다운로드(`ExportImportControls.jsx`의 `handleExportJSON`과 동일한 방식, 코드는 이 컴포넌트 안에 독립적으로 작성하되 storage 함수만 재사용 — 기존 `ExportImportControls` 컴포넌트 자체는 건드리지 않음). 메뉴 바깥 클릭 감지로 자동 닫힘.
- **Clock**: `useEffect` + `setInterval(1000ms)`으로 현재 시각을 state에 저장, "H:MM a.m./p.m." + "YYYY-MM-DD" 형식으로 렌더링만 하는 순수 표시 컴포넌트.
- **DiaryApp**: 현재 `App.jsx`의 전체 내용(상태 관리, Calendar/Tabs/DiaryCanvas 조합, 저장/불러오기 핸들러)을 그대로 옮긴 것. 로직 변경 없음.

## 상태 흐름 (App.jsx)

```
App.jsx
  state: isDiaryOpen (boolean, 기본 false)

  render:
    <Desktop onOpenDiary={() => setIsDiaryOpen(true)} />
    <Taskbar />                          // Desktop/Window 상태와 무관하게 항상 렌더링
    {isDiaryOpen && (
      <Window title="diary" onClose={() => setIsDiaryOpen(false)}>
        <DiaryApp />
      </Window>
    )}
```

- `isDiaryOpen`이 App.jsx가 관리하는 유일한 신규 state. 다이어리 내부 상태(selectedDate, activeTab 등)는 여전히 `DiaryApp` 안에 그대로 있음 — 옮기지 않음.
- Window가 열려 있을 때 Desktop 아이콘 클릭이 막히는 것은 Window의 모달 오버레이(전체 화면을 덮는 투명/반투명 레이어, Desktop보다 높은 z-index)로 구현. Desktop 컴포넌트 자체는 이 사실을 모름.

## 에셋 파이프라인

1. `reference/Bliss_(Windows_XP).png` → `src/assets/wallpaper.png`
2. `reference/pngwing.com (2).png` → `src/assets/diary-icon.png`
3. `reference/powerbutton.png` → `src/assets/power-button.png`
4. `reference/save_button.png` → `src/assets/download-icon.png`
5. `src/assets/icons.js`:
   ```js
   import wallpaper from './wallpaper.png'
   import diaryIcon from './diary-icon.png'
   import powerButtonIcon from './power-button.png'
   import downloadIcon from './download-icon.png'

   export { wallpaper, diaryIcon, powerButtonIcon, downloadIcon }
   ```
   모든 컴포넌트는 개별 이미지 파일이 아니라 `icons.js`에서만 import한다.

## 핵심 흐름

1. **앱 시작**: `App.jsx` 렌더 → `isDiaryOpen=false` → Desktop + Taskbar만 보임.
2. **diary 아이콘 클릭**: `isDiaryOpen=true` → Window가 DiaryApp을 감싸 화면 중앙에 뜸. 배경 클릭은 모달 오버레이가 막음.
3. **닫기 버튼 클릭**: `isDiaryOpen=false` → Window 사라지고 Desktop만 다시 보임. (DiaryApp 내부 state는 언마운트되며 초기화되지만, 데이터 자체는 매번 `loadAllDiaryData()`로 localStorage에서 다시 읽으므로 데이터 유실 없음 — 기존 동작과 동일)
4. **전원 버튼 클릭**: PowerButton 내부 state로 DOWNLOAD 메뉴 토글.
5. **DOWNLOAD 클릭**: `diaryStorage.loadAllDiaryData()` → JSON.stringify → Blob → 다운로드. 메뉴 닫힘.
6. **시계**: Taskbar가 항상 렌더링하는 Clock이 1초마다 자체 갱신, App 상태와 무관하게 독립적으로 동작.

## 모듈 경계

- `assets/icons.js`: 이미지 re-export만. 로직 없음.
- `components/Desktop`, `components/Window`, `components/Taskbar`, `components/PowerButton`, `components/Clock`: 서로 독립적, `storage/diaryStorage.js` 외에는 기존 기능 코드를 import하지 않음 (PowerButton만 예외적으로 `loadAllDiaryData` 호출).
- `components/DiaryApp`: 기존 `App.jsx`와 동일한 import만 가짐(Calendar, Tabs, DiaryCanvas, diaryStorage) — 새 UI 컴포넌트를 import하지 않음.
- `App.jsx`: Desktop/Window/Taskbar/DiaryApp을 조합만 함. 다이어리 관련 상태나 로직을 직접 갖지 않음.
