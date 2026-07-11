# Step 6: main-screen-polish

## 읽을 파일
- docs/plan/diary-editor-ux-overhaul/PRD.md (섹션 6 + "원칙")
- docs/plan/diary-editor-ux-overhaul/architecture.md (섹션 7)
- src/components/DiaryApp/DiaryApp.jsx (메인 grid 수정 대상)
- src/components/TodoWidget/TodoWidget.jsx
- src/components/WeatherWidget/WeatherWidget.jsx (스피너 대상)
- src/components/AnalogClockWidget/AnalogClockWidget.jsx

## 작업

### DiaryApp.jsx (UI)
- 메인 화면 grid의 `gap`/`padding`이 창이 커진 만큼 상대적으로 작아 보이므로 균형을 재조정한다 (값은 8~12px 수준에서 조정, 콘텐츠가 창을 꽉 채우는 것이 목표).

### 위젯 3종 (UI만 — 로직 불변)
- `TodoWidget.jsx`: 헤더/항목 폰트 크기 확대 (예: 12→14px, 항목 14→16px 수준). 할 일 CRUD 로직 변경 금지.
- `WeatherWidget.jsx`:
  - 아이콘(이모지) 32px → 48px 수준, 온도 20px → 28px 수준으로 확대.
  - `renderWeatherContent`의 `status === 'loading'` 분기를 텍스트에서 CSS 회전 스피너로 교체: 인라인 keyframes가 불가능하므로 `src/index.css`에 `@keyframes spin` + `.weather-spinner` 클래스를 추가하고 JSX에서 그 클래스를 쓰는 방식. 스피너는 XP 파랑(#1657d6) 계열 보더 링.
  - fetch/geolocation/에러 처리 로직 변경 금지.
- `AnalogClockWidget.jsx`: 시계 SVG 크기를 위젯 영역에 꽉 차게 확대. 시간 계산 로직 변경 금지.

## AC
- `npm run lint` && `npm run build` && `npm run test` 통과

## 금지
- 위젯들의 데이터 로직(할 일 저장, 날씨 fetch, 시간 계산)을 수정하지 마라. 이유: UI/로직 분리 원칙 — 이 step은 크기/스피너 등 표현만 다룬다.
- 새 위젯을 추가하거나 위젯 배치 구조(grid 셀 구성)를 바꾸지 마라. 이유: 범위는 여백/크기 조정이다. (step 4에서 추가된 갤러리 진입 버튼은 유지)
