# Step 0: storage-layer

## 읽을 파일
- `docs/plan/diary-app/PRD.md` — 특히 "저장" 항목
- `docs/plan/diary-app/architecture.md` — "데이터 모델", "모듈 경계" 중 `storage/diaryStorage.js` 설명
- `CLAUDE.md` (레포 루트) — 코딩 규칙

## 작업

`src/storage/diaryStorage.js`를 만든다. Fabric.js나 React를 몰라도 되는 순수 데이터 계층이다.

localStorage 키는 하나: `diary-app-data`. 저장 형태는 architecture.md의 데이터 모델을 그대로 따른다 (날짜 문자열 `YYYY-MM-DD`를 키로 하는 객체, 각 날짜 아래 `diary`/`movie` 두 탭, 각 탭은 `{ canvasJSON }`을 가짐 — `movie.movieInfo`는 2순위에서 추가되므로 지금은 다루지 않는다).

다음 함수들을 만든다 (시그니처 수준 — 내부 구현은 자유):

- `loadAllDiaryData(): DiaryData` — localStorage에서 전체 데이터를 읽어 파싱. 키가 없거나 파싱 실패 시 빈 객체 `{}` 반환 (예외를 던지지 않음).
- `saveAllDiaryData(data: DiaryData): void` — 전체 데이터를 JSON.stringify해 localStorage에 저장.
- `getDatePageData(data: DiaryData, dateKey: string, tab: 'diary' | 'movie'): { canvasJSON: object | null }` — 특정 날짜·탭의 데이터를 꺼냄. 없으면 `{ canvasJSON: null }` 반환.
- `setDatePageData(data: DiaryData, dateKey: string, tab: 'diary' | 'movie', canvasJSON: object): DiaryData` — 특정 날짜·탭의 canvasJSON을 갱신한 **새 객체**를 반환 (인자 `data`를 직접 변경하지 않음 — CLAUDE.md 규칙: in-place 변경 금지).

이 파일은 이번 step에서는 아직 아무 컴포넌트에서도 사용되지 않는다(다음 step들이 가져다 쓴다). `src/App.jsx`는 건드리지 않는다.

## AC

- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다 (경고는 허용).
- 브라우저 확인 불필요 (아직 UI에 연결되지 않음).

## 금지
- Fabric.js를 이 파일에서 import하지 마라. 이유: architecture.md의 모듈 경계 규칙상 storage는 Fabric.js를 몰라야 한다 (순수 데이터 계층 유지).
- `movieInfo`, TMDB 관련 필드를 지금 스키마에 넣지 마라. 이유: 2순위 범위이며 PRD에 아직 착수 시점이 아니다.
- 인자로 받은 `data` 객체를 함수 내부에서 직접 mutate하지 마라. 이유: CLAUDE.md의 "인자 비변경, 새 값 반환" 원칙.
