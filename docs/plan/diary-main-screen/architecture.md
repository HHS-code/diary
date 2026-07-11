# Architecture — 다이어리 메인 화면 (XP 캘린더 + 위젯)

## 기술 스택

- React (기존과 동일, 새 패키지 추가 없음)
- Open-Meteo API (날씨, API 키 불필요, `fetch`로 직접 호출)
- 브라우저 Geolocation API (위치)
- localStorage (`diaryStorage.js` 확장)

## 폴더 구조 (제안)

```
diary/
  docs/plan/diary-main-screen/   PRD.md, architecture.md (이 문서)
  src/
    components/
      DiaryApp/
        DiaryApp.jsx             메인/편집 화면 전환 상태 관리 (수정)
      XPCalendar/
        XPCalendar.jsx           신규: XP 스타일 월간 캘린더 (Calendar.jsx 대체)
      TodoWidget/
        TodoWidget.jsx           신규: 날짜별 할 일 체크리스트
      WeatherWidget/
        WeatherWidget.jsx        신규: Open-Meteo 날씨 위젯
      AnalogClockWidget/
        AnalogClockWidget.jsx    신규: SVG 아날로그 시계
      Calendar/                  삭제 (Calendar.jsx, 기존 사각 그리드 캘린더)
    storage/
      diaryStorage.js            todos 관련 함수 추가 (수정)
```

## 데이터 모델

기존 `DiaryData` 구조에 날짜별 `todos` 배열을 추가한다. 다이어리/영화 탭 데이터(`diary`, `movie`)와 같은 레벨에 둔다.

```json
{
  "2026-07-09": {
    "diary": { "canvasJSON": { /* 기존과 동일 */ } },
    "movie": { "canvasJSON": null },
    "todos": [
      { "id": "abc123", "text": "빨래하기", "done": false },
      { "id": "def456", "text": "책 읽기", "done": true }
    ]
  }
}
```

- `todos`가 없는 날짜는 빈 배열로 취급한다.
- `id`는 항목 추가 시 `crypto.randomUUID()`로 생성한다.

## storage/diaryStorage.js 확장

기존 `getDatePageData`/`setDatePageData`와 같은 패턴으로 todos 전용 함수를 추가한다.

- `getDateTodos(data, dateKey) -> Todo[]`
  - 해당 날짜에 `todos`가 없으면 빈 배열 반환.
- `setDateTodos(data, dateKey, todos) -> DiaryData`
  - 인자 `data`를 직접 변경하지 않고, 해당 날짜의 `todos`만 갱신한 새 객체를 반환 (기존 `diary`/`movie` 필드는 보존).

`loadAllDiaryData`/`saveAllDiaryData`는 그대로 재사용한다 (스키마만 확장, 저장 방식 동일).

## 컴포넌트 설계

### DiaryApp.jsx (수정)

- 새 state `screen: 'main' | 'edit'` 추가. 초기값 `'main'`.
- 새 state `currentYear`, `currentMonth` 추가 (오늘 날짜 기준 초기화) — XPCalendar에 props로 전달해 화면 전환 시에도 보던 월을 유지한다.
- `selectedDate`, `activeTab` 등 기존 state는 유지.
- `screen === 'main'`일 때: `XPCalendar` + 우측 위젯 3개(`TodoWidget`, `WeatherWidget`, `AnalogClockWidget`) 렌더링.
  - `XPCalendar`에서 날짜 클릭 → `selectedDate` 갱신 + `screen: 'edit'`으로 전환.
- `screen === 'edit'`일 때: 기존처럼 `{selectedDate}` 제목 + `Tabs` + `DiaryCanvas`/영화 탭 렌더링.
  - 제목 왼쪽에 ◀ 버튼 추가 → 클릭 시 `screen: 'main'`으로 전환 (selectedDate는 유지).

### XPCalendar.jsx (신규)

- props: `{ selectedDate: string, onSelectDate: (dateKey: string) => void, currentYear: number, currentMonth: number, onChangeMonth: (year: number, month: number) => void }`
- `currentYear`/`currentMonth`는 `DiaryApp`이 소유한 state로 끌어올려 받는다 (편집 화면 왕복 시에도 보던 월이 유지되도록). ◀▶ 클릭 시 `onChangeMonth`로 부모에 알린다.
- 오늘 날짜 계산 후 배경색 분기: 오늘=노란색, 선택된 날짜(오늘 아님)=파란 테두리, 그 외=기본.
- 레이아웃/스타일은 레퍼런스 이미지를 기준으로 인라인 스타일로 구현 (프로젝트 전반이 인라인 스타일 방식).

### TodoWidget.jsx (신규)

- props: `{ selectedDate: string }`
- 내부에서 `loadAllDiaryData` → `getDateTodos`로 목록을 읽고, 추가/체크/삭제 시 `setDateTodos` → `saveAllDiaryData`로 즉시 반영.
- `selectedDate`가 바뀌면 그 날짜의 todos를 다시 읽어 보여준다.

### WeatherWidget.jsx (신규)

- 마운트 시 `navigator.geolocation.getCurrentPosition`으로 좌표 요청.
  - 성공: 해당 좌표로 Open-Meteo 호출.
  - 실패/미지원: 서울 좌표(37.5665, 126.9780)로 fallback.
- Open-Meteo 호출: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true`
- 응답의 `current_weather.temperature`, `weathercode`를 표시. `weathercode` → 아이콘/텍스트 매핑은 필요한 범위만 최소로 구현.
- 날씨는 selectedDate와 무관하게 "현재" 날씨만 보여준다 (과거/미래 날짜 예보 없음).

### AnalogClockWidget.jsx (신규)

- 1초마다 `Date`를 갱신하는 내부 state (기존 `Clock.jsx`의 `useEffect`+`setInterval` 패턴과 동일한 방식).
- SVG로 시계 원판 + 시침/분침/초침을 각도 계산해 렌더링.
- `Clock.jsx`와는 독립된 컴포넌트 — 서로 참조하지 않는다.

## 화면 전환 흐름

1. diary 창 최초 진입 → `DiaryApp`의 `screen` state 기본값 `'main'` → 메인 화면(XPCalendar + 위젯 3개) 표시.
2. XPCalendar에서 날짜 클릭 → `onSelectDate(dateKey)` 호출 → `selectedDate` 갱신, `screen: 'edit'`.
3. 편집 화면에서 ◀ 버튼 클릭 → `screen: 'main'`. `currentYear`/`currentMonth`는 `DiaryApp`의 state이므로 그대로 유지되어, 돌아온 XPCalendar는 이전에 보던 월을 그대로 보여준다.

## 모듈 경계

- `XPCalendar.jsx`, `TodoWidget.jsx`, `WeatherWidget.jsx`, `AnalogClockWidget.jsx`는 서로 독립적이며 `DiaryApp.jsx`에서만 조합된다.
- `WeatherWidget.jsx`만 외부 네트워크(API) 호출을 담당하고, 나머지 위젯은 로컬 상태/localStorage만 사용한다.
- `TodoWidget.jsx`는 `storage/diaryStorage.js`를 통해서만 데이터에 접근한다 (localStorage 직접 접근 금지, 기존 패턴 유지).
