# Architecture — 다이어리 에디터/메인화면 UX 정비

## 기술 스택

- React + Fabric.js + `react-icons`(신규 설치, 아이콘 전용) — 그 외 새 패키지 추가 없음
- 기존 `useFabricCanvas`, `useObjectActions`, `storage/diaryStorage.js`를 그대로 재사용

## UI/로직 분리 원칙 (canvas-object-toolbar에서 확립, 이번에도 적용)

- 로직(Fabric.js 호출, 데이터 읽기/쓰기, 좌표 계산)은 `useXxx.js` 훅에, UI(JSX+스타일)는 `Xxx.jsx` 컴포넌트에 분리한다.
- 기존 로직 함수(`useObjectActions.js`의 `copy`/`remove`/`bringToFront` 등, `storage/diaryStorage.js`의 `getDatePageData`/`setDatePageData` 등)는 **시그니처와 동작을 변경하지 않는다.** 이번 작업은 전부 "그 함수들을 어떤 UI가, 어떤 위치에서 호출하는지"만 바꾼다.
- 각 섹션에 "로직"과 "UI"를 구분해 명시한다.

## 폴더 구조 (제안)

```
diary/
  docs/plan/diary-editor-ux-overhaul/   PRD.md, architecture.md (이 문서)
  src/
    components/
      Window/
        Window.jsx                  windowBoxStyle 비율 확대 (수정, UI만)
      DiaryCanvas/
        DiaryCanvas.jsx              레이아웃 중앙정렬+반응형 캔버스 크기 적용 (수정)
      ObjectToolbar/
        ObjectToolbar.jsx            플로팅 → 고정 메뉴 레이아웃으로 교체 (수정, UI만)
      CanvasBackgroundControl/
        CanvasBackgroundControl.jsx  신규: 배경 색상/이미지 선택 UI
      DiaryGallery/
        DiaryGallery.jsx             신규: 썸네일 그리드 UI
      XPCalendar/
        XPCalendar.jsx               날짜 셀 호버 버튼 추가 (수정)
      ImageUploadButton/, TextMemoButton/, ExportImportControls/
        각 .jsx                      아이콘 적용 (수정, UI만 — onClick 로직 불변)
      WeatherWidget/
        WeatherWidget.jsx            로딩 텍스트 → 스피너 (수정, UI만 — status 로직 불변)
      DiaryApp/
        DiaryApp.jsx                 메인화면 grid 여백 축소 + 갤러리 진입 (수정)
    hooks/
      useFabricCanvas.js             캔버스 생성 크기를 prop으로 받도록 확장 (수정, 최소)
      useObjectActions.js            변경 없음 (그대로 재사용)
      useCanvasBackground.js         신규: 배경 색상/이미지 설정 로직
      useDiaryThumbnails.js          신규: 저장된 전체 다이어리를 순회해 썸네일 데이터 생성하는 로직
```

## 1. 에디터 레이아웃/캔버스 확대

**결정 (합의됨)**: 창은 리사이즈 기능이 없으므로, 캔버스 크기는 마운트 시점에 고정된 큰 사이즈 하나로 정한다(예: 1400×900 — 정확한 값은 실행 단계에서 실제 창 크기 대비 여백을 보며 조정 가능하나, "리사이즈에 실시간 반응"은 하지 않는다).

- `Window.jsx`(UI): `windowBoxStyle`의 `width`/`height`를 `90%`/`88%`에서 `97%`/`95%` 수준으로 확대. 다른 스타일(보더, 그림자 등)은 변경하지 않는다.
- `useFabricCanvas.js`(로직, 최소 수정): 현재 `CANVAS_WIDTH`/`CANVAS_HEIGHT` 상수를 훅의 인자로 받도록 확장한다. 기존 호출부(`DiaryCanvas.jsx`)가 값을 안 넘기면 기존 800×600을 기본값으로 사용해 하위 호환을 유지한다.
- **기존 좌표 변환 로직 (신규, 로직)**: `DiaryCanvas.jsx`가 `canvasJSON`을 로드할 때, 그 JSON이 기록하고 있던 원본 캔버스 크기와 새 캔버스 크기의 비율(`scaleX = newWidth / oldWidth`, `scaleY = newHeight / oldHeight`)을 계산해 `loadFromJSON` 직후 모든 오브젝트의 `left`/`top`/`scaleX`/`scaleY`에 곱해 재배치한다.
  - 원본 캔버스 크기를 알아야 하므로, `canvasJSON` 저장 시점에 `{ width, height }` 메타데이터를 함께 저장하도록 저장 포맷을 확장한다 (아래 "데이터 모델 확장" 참고).
  - 이 변환은 **로드 시 1회만** 수행한다. 저장은 새 캔버스 크기 기준으로 다시 이루어지므로, 다음 로드부터는 변환이 필요 없다(비율이 1:1이 됨).
  - 메타데이터가 없는 기존 데이터(이 phase 이전에 저장된 것)는 저장 당시 크기를 800×600으로 간주한다.
- `DiaryCanvas.jsx`(UI): 바깥 flex 컨테이너에 `justifyContent: 'center'`를 추가해 사이드바+캔버스 그룹 전체를 창 안에서 중앙 정렬한다. `DiaryApp.jsx`의 edit 화면 컨테이너도 `height: '100%'` 및 `overflow` 처리를 재점검해 스크롤 없이 창 안에 들어오도록 조정한다.
- 캔버스 기본 배경(로직): `useFabricCanvas.js`의 `new Canvas(el, {...})` 옵션에 `backgroundColor: '#ffffff'`를 추가한다.

## 2. 배경 커스텀

**데이터 모델 확장**: `storage/diaryStorage.js`의 `DatePageData.diary`/`movie` 하위에 `canvasJSON`과 나란히 `canvasSize: { width, height }` 필드를 추가한다 (위 좌표 변환에 필요). 배경 자체은 Fabric.js의 `canvas.backgroundColor`/`canvas.backgroundImage`로 캔버스 JSON 안에 포함되어 저장되므로 별도 필드가 필요 없다 — `canvas.toJSON()`이 배경을 함께 직렬화한다.

- `useCanvasBackground.js`(신규, 로직): `useCanvasBackground(fabricCanvasRef) -> { setColor, setImage }`.
  - `setColor(hex)`: `canvas.backgroundColor = hex` 후 `canvas.renderAll()`.
  - `setImage(file)`: `FileReader`로 이미지를 읽어 Fabric.js `Image`로 캔버스 크기에 맞춰 배경으로 설정.
  - 두 함수 모두 배경 변경 후 `useFabricCanvas`의 기존 `object:*` 이벤트 기반 오토세이브가 자동으로 캐치하도록, Fabric.js의 배경 설정 API가 발생시키는 이벤트를 그대로 활용한다(별도 저장 호출 불필요 — 배경 변경도 캔버스 상태 변경이므로 기존 디바운스 저장 로직이 감지해야 함. 이게 안 되면 `useFabricCanvas.js`에 배경 변경 이벤트도 `scheduleSave` 트리거에 포함시키는 최소 수정 필요).
- `CanvasBackgroundControl.jsx`(신규, UI): 컬러피커(`<input type="color">`)와 이미지 업로드(`<input type="file">`) 버튼을 캔버스 사이드바에 추가. `useCanvasBackground`가 반환한 함수를 props로 받아 호출만 한다.

## 3. ObjectToolbar 고정 메뉴 재설계

- `ObjectToolbar.jsx`(UI, 전면 재작성): 기존 `activeObject.getBoundingRect()` 기반 `position: absolute` 플로팅 로직을 제거한다. 대신 캔버스 사이드바(또는 캔버스 상단)에 항상 고정된 위치의 패널로 렌더링한다.
  - `activeObject`가 `null`이면 각 버튼을 `disabled` 상태로 표시(클릭 불가, 흐리게).
  - `activeObject`가 있으면 버튼 활성화, 클릭 시 기존과 동일하게 `actions.copy(activeObject)` 등을 호출한다.
- `useObjectActions.js`(로직): **변경 없음.** 함수 시그니처(`copy`, `remove`, `bringToFront` 등)를 그대로 사용한다.
- `DiaryCanvas.jsx`(UI): `ObjectToolbar`를 캔버스 옆 고정 위치(사이드바 하단 등)로 이동 배치.
- 이 재설계로 "드래그 중 위치가 안 따라온다"는 기존 버그는 자연스럽게 해소된다 — 위치가 애초에 오브젝트를 따라다니지 않으므로 `object:moving` 이벤트 구독이 필요 없다.

## 4. 아이콘 적용

- `react-icons`에서 다음을 사용(패키지 내 실제 존재 아이콘명은 실행 단계에서 확인 후 선정 — 여기서는 의도만 기술):
  - ObjectToolbar: 복사, 삭제(휴지통), 맨앞으로, 맨뒤로, 앞으로, 뒤로 아이콘
  - ImageUploadButton: 이미지 업로드 아이콘
  - TextMemoButton: 텍스트 추가 아이콘
  - ExportImportControls: 다운로드(JSON/PNG 내보내기), 업로드(JSON 불러오기) 아이콘
- 각 컴포넌트는 기존 `onClick` 핸들러·로직을 그대로 두고, 버튼 내부 라벨만 `{텍스트}` → `<Icon /> {텍스트}` 또는 `<Icon />`(텍스트 제거, `aria-label`로 대체)로 교체한다.
- `docs/design.md`의 버튼 스타일(보더, 그라디언트, radius)은 유지 — 색상 체계를 바꾸지 않는다.

## 5. 다이어리 갤러리

- `useDiaryThumbnails.js`(신규, 로직): `useDiaryThumbnails() -> { thumbnails: { dateKey, dataUrl }[] }`.
  - `loadAllDiaryData()`로 전체 데이터를 읽고, `canvasJSON`이 있는 날짜마다 오프스크린(화면에 렌더링하지 않는) Fabric.js `StaticCanvas`를 생성해 `loadFromJSON` → `toDataURL({ format: 'png', multiplier: 0.2 })` 같은 축소 비율로 썸네일 이미지를 생성한다.
  - 순수 읽기 전용 — `storage/diaryStorage.js`의 저장 함수는 호출하지 않는다.
  - 다이어리 개수가 많아지면 느려질 수 있으나, 이번 범위에서는 캐싱/페이지네이션 없이 단순 구현으로 간다(Out-of-scope에 명시 필요 여부는 실행 시 재확인).
- `DiaryGallery.jsx`(신규, UI): `useDiaryThumbnails`가 반환한 배열을 grid로 렌더링. 각 썸네일 클릭 시 `onSelectDate(dateKey)` 콜백(기존 `DiaryApp.jsx`의 `handleSelectDate`와 동일한 함수)을 호출.
- `DiaryApp.jsx`(UI): 메인 화면(`screen === 'main'`)에 갤러리 진입 버튼 또는 섹션을 추가. 정확한 배치(탭 전환 방식 vs 위젯 옆 추가 영역)는 실행 단계에서 여백 조정과 함께 확정.

## 6. 날짜 호버 버튼

- `XPCalendar.jsx`(UI): 날짜 셀 `<button>`에 `onMouseEnter`/`onMouseLeave`로 hover state를 추가하고, hover 시 셀 위에 작은 "작성" 버튼을 오버레이로 표시한다.
- 이 버튼의 `onClick`은 기존 `onSelectDate(dateKey)`(날짜 셀 클릭과 동일한 콜백)를 그대로 호출한다 — 새 로직 없음, 진입점만 하나 추가.
- 날짜 셀 자체를 클릭하는 기존 동작(이미 `onSelectDate` 호출)은 그대로 유지한다.

## 7. 메인화면 여백 축소 + 날씨 스피너

- `DiaryApp.jsx`(UI): `screen === 'main'` 렌더링부의 `gap`/`padding` 값을 축소(`4px` → 실행 시 조정).
- `TodoWidget.jsx`, `WeatherWidget.jsx`, `AnalogClockWidget.jsx`(UI): 내부 폰트 크기, 아이콘 크기를 키운다. 각 위젯의 데이터 로직(할 일 CRUD, 날씨 fetch, 시계 계산)은 변경하지 않는다.
- `WeatherWidget.jsx`의 `renderWeatherContent` 함수(UI 전용 함수, 순수 렌더링): `status === 'loading'`일 때의 텍스트 반환을 CSS 스피너(회전 애니메이션) JSX로 교체한다. `status`를 결정하는 `useEffect`의 fetch 로직은 변경하지 않는다.

## 모듈 경계

- 이번 phase에서 로직이 변경되는 파일은 `useFabricCanvas.js`(캔버스 크기 파라미터화 + 배경색 기본값 + 배경 변경 시 오토세이브 트리거 확인), `storage/diaryStorage.js`(canvasSize 필드 추가)뿐이다. `useObjectActions.js`는 변경하지 않는다.
- 신규 로직 훅(`useCanvasBackground.js`, `useDiaryThumbnails.js`)은 기존 로직 훅과 마찬가지로 JSX를 반환하지 않는다.
- 신규/수정 UI 컴포넌트(`ObjectToolbar.jsx`, `CanvasBackgroundControl.jsx`, `DiaryGallery.jsx`, 아이콘 적용된 버튼들)는 Fabric.js를 직접 import하지 않고 훅이 반환한 데이터/함수만 사용한다.
