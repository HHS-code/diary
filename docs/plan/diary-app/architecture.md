# Architecture — 자유 커스터마이징 다이어리 웹앱

## 기술 스택

- React + Vite
- Fabric.js (캔버스 오브젝트 자유 배치·이동·크기조절·회전, JSON 직렬화, PNG 내보내기 모두 내장 활용)
- localStorage (자동 저장)
- TMDB API (2순위, `.env`로 키 분리)

## 폴더 구조 (제안)

```
diary/
  docs/plan/diary-app/     PRD.md, architecture.md
  public/
  src/
    components/
      Calendar/            날짜 선택 캘린더 UI
      DiaryCanvas/          Fabric.js 캔버스 에디터 (스티커/사진/텍스트 공통)
      StickerPalette/       기본 이모지 스티커 팔레트
      MovieCard/            (2순위) 영화 정보 카드 + 별점
      Tabs/                 "다이어리" / "영화리뷰" 탭 전환
    hooks/
      useFabricCanvas.js    Fabric.js 캔버스 생명주기를 React에 연결하는 커스텀 훅
    storage/
      diaryStorage.js       localStorage 저장/조회, JSON export/import
    api/
      tmdb.js               (2순위) TMDB API 호출
    App.jsx
    main.jsx
  .env                       TMDB API 키 (커밋 제외)
  .gitignore
```

## 데이터 모델

날짜(YYYY-MM-DD)를 키로 하는 페이지 단위 저장. 한 날짜 안에 탭 2개(다이어리/영화리뷰)가 각각 독립된 캔버스 상태를 가진다.

```json
{
  "2026-07-09": {
    "diary": {
      "canvasJSON": { /* Fabric.js canvas.toJSON() 결과 */ }
    },
    "movie": {
      "canvasJSON": { /* Fabric.js canvas.toJSON() 결과 */ },
      "movieInfo": {
        "tmdbId": 12345,
        "title": "...",
        "posterUrl": "...",
        "director": "...",
        "cast": ["..."],
        "overview": "...",
        "rating": 4
      }
    }
  }
}
```

- `canvasJSON`은 Fabric.js의 `canvas.toJSON()` 산출물을 그대로 저장 — 스티커/사진/텍스트 오브젝트의 위치·크기·회전·내용이 모두 포함됨.
- localStorage 키: 예) `diary-app-data` 하나에 위 구조 전체를 저장.
- JSON export/import 파일도 동일한 스키마를 그대로 사용 (전체 또는 날짜 단위는 실행 단계에서 세부 결정).

## 핵심 흐름

1. **날짜 선택**: 캘린더에서 날짜 클릭 → 해당 날짜의 데이터를 localStorage에서 조회 (없으면 빈 캔버스로 시작)
2. **탭 전환**: 같은 날짜 안에서 "다이어리" / "영화리뷰" 탭 클릭 → 각 탭의 캔버스 상태 로드
3. **캔버스 편집**: 스티커 팔레트 클릭 / 이미지 업로드 / 텍스트 추가 버튼 → Fabric.js 캔버스에 오브젝트 추가 → 자유 이동·크기조절·회전은 Fabric.js 기본 컨트롤 사용
4. **자동 저장**: 캔버스 변경 이벤트(`object:modified` 등) 발생 시 `canvas.toJSON()` → localStorage 갱신 (디바운스 적용)
5. **내보내기**:
   - JSON: localStorage 전체 데이터를 JSON 파일로 다운로드
   - PNG: `canvas.toDataURL()`로 현재 탭 캔버스를 이미지로 추출해 다운로드
6. **불러오기**: JSON 파일 업로드 → 파싱 후 localStorage 덮어쓰기 → 현재 화면 갱신
7. **(2순위) 영화 검색**: TMDB API 호출 → 검색 결과 선택 → `movieInfo`에 저장 → 영화 정보 카드로 렌더링, 그 옆/아래에 동일한 Fabric.js 캔버스 배치

## 모듈 경계

- `storage/diaryStorage.js`: localStorage 읽기/쓰기, JSON export/import만 담당. Fabric.js나 React를 몰라도 되는 순수 데이터 계층.
- `api/tmdb.js`: TMDB API 호출만 담당, `.env`의 `VITE_TMDB_API_KEY` 사용.
- `hooks/useFabricCanvas.js`: Fabric.js 캔버스 인스턴스 생성/해제와 React 컴포넌트 생명주기를 연결. 캔버스 조작 로직은 이 훅과 `DiaryCanvas` 컴포넌트에 집중.
