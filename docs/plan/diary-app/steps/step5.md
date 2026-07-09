# Step 5: calendar-tabs

## 읽을 파일
- `docs/plan/diary-app/PRD.md` — "날짜별 페이지 관리"
- `docs/plan/diary-app/architecture.md` — "핵심 흐름" 1~2번(날짜 선택, 탭 전환), 데이터 모델의 날짜 키 구조
- `src/storage/diaryStorage.js` (step 0 — 이 step에서 처음 실제로 연결)
- `src/components/DiaryCanvas/DiaryCanvas.jsx`

## 작업

`src/components/Calendar/Calendar.jsx`를 만든다 (라이브러리 없이 직접 구현 — 합의됨).

- 월 단위 그리드로 날짜를 보여주고, 이전/다음 달 이동 버튼을 둔다.
- 날짜를 클릭하면 그 날짜(`YYYY-MM-DD` 형식 문자열)가 "현재 선택된 날짜"로 App 상태에 반영된다.

같은 날짜 안에서 "다이어리" / "영화리뷰" 탭을 전환하는 UI도 만든다 (`src/components/Tabs/Tabs.jsx` 또는 App.jsx에 인라인 — 구조는 재량이되 architecture.md의 컴포넌트 분리 취지를 따른다).

- 이번 step에서 "영화리뷰" 탭은 아직 빈 화면(placeholder, 예: "영화 리뷰는 곧 추가됩니다")으로 둔다 — TMDB 연동은 2순위이므로 범위 밖.
- "다이어리" 탭은 `DiaryCanvas`를 렌더링한다.

`App.jsx`를 다음 흐름으로 조립한다: 캘린더에서 날짜 선택 → 선택된 날짜 + "다이어리" 탭 기본 표시 → `storage/diaryStorage.js`의 `loadAllDiaryData`/`getDatePageData`로 그 날짜의 `canvasJSON`을 조회해 `DiaryCanvas`에 전달(있으면 `canvas.loadFromJSON()`으로 불러오고, 없으면 빈 캔버스로 시작).

이 step에서는 "저장"은 아직 연결하지 않는다 (즉 탭/날짜를 벗어나면 그림이 사라져도 된다 — 자동저장은 step 6). 단, `DiaryCanvas`가 `canvasJSON`을 받아서 로드하는 부분(불러오기 방향)까지는 이 step에서 구현한다.

## AC

- `npm run build`가 에러 없이 성공한다.
- 브라우저에서: 캘린더에서 다른 날짜를 클릭하면 화면이 그 날짜로 바뀐다. "다이어리"/"영화리뷰" 탭을 전환할 수 있고, "영화리뷰" 탭에는 placeholder 문구가 보인다.

## 금지
- TMDB API 호출이나 영화 검색 UI를 만들지 마라. 이유: 2순위 범위, placeholder만 필요.
- localStorage 자동 저장 로직(캔버스 변경 감지 → 저장)을 만들지 마라. 이유: step 6의 범위 — 이 step은 "불러오기" 방향만 다룬다.
- react-router 등 라우팅 라이브러리를 추가하지 마라. 이유: 날짜/탭 전환은 URL 라우팅 없이 컴포넌트 상태로 충분하며, architecture.md에도 라우터 도입이 합의되지 않음.
