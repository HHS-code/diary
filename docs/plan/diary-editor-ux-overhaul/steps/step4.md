# Step 4: diary-gallery

## 읽을 파일
- docs/plan/diary-editor-ux-overhaul/PRD.md (섹션 4 + "원칙")
- docs/plan/diary-editor-ux-overhaul/architecture.md (섹션 5)
- src/storage/diaryStorage.js (읽기 전용으로 사용)
- src/components/DiaryApp/DiaryApp.jsx (메인 화면 진입점 수정 대상)
- src/hooks/useFabricCanvas.js (StaticCanvas 사용 참고 — 실제 수정은 안 함)

## 작업

### useDiaryThumbnails.js (신규 로직)
- `src/hooks/useDiaryThumbnails.js`: `useDiaryThumbnails() -> { thumbnails, isLoading }`. `thumbnails`는 `{ dateKey, dataUrl }[]`, 날짜 내림차순 정렬.
- `loadAllDiaryData()`로 전체 데이터를 읽고, `diary` 탭에 `canvasJSON`이 있는 날짜만 대상.
- 각 날짜마다 Fabric.js `StaticCanvas`(DOM에 붙이지 않는 오프스크린)를 생성 → `loadFromJSON` → `toDataURL({ format: 'png', multiplier: 0.2 })`로 썸네일 생성 → dispose.
- 저장된 canvasSize 메타데이터가 있으면 StaticCanvas를 그 크기로 만들고, 없으면 800×600.
- `useEffect` 안에서 비동기로 순차 처리, 언마운트 시 중단 플래그.
- 순수 읽기 전용 — `saveAllDiaryData` 등 저장 함수 호출 금지.
- **vitest 단위 테스트 필수**: 썸네일 생성 핵심 함수(훅에서 분리한 순수 함수 `buildThumbnail(canvasJSON, size) -> Promise<dataUrl>` 형태 권장)를 실제 Fabric.js StaticCanvas로 검증. 테스트 먼저 작성.

### DiaryGallery.jsx (신규 UI)
- `src/components/DiaryGallery/DiaryGallery.jsx`: props `{ onSelectDate }`.
- `useDiaryThumbnails()` 결과를 그리드로 렌더링 — 각 항목은 썸네일 이미지 + 날짜 라벨, 클릭 시 `onSelectDate(dateKey)`.
- 작성된 다이어리가 없으면 "아직 작성된 다이어리가 없습니다" 안내.
- 패널 스타일은 XPCalendar/위젯과 동일한 XP 패널 프레임 재사용.

### DiaryApp.jsx (UI)
- 메인 화면(`screen === 'main'`)에 갤러리 진입 방식 추가: `screen` state에 `'gallery'` 값을 추가하고, 메인 화면에 "모아보기" 버튼(XP 버튼 스타일)을 배치 → 클릭 시 `screen: 'gallery'`로 전환, 갤러리 화면에는 ◀ 뒤로가기(메인으로) 버튼.
- 갤러리에서 썸네일 클릭 → 기존 `handleSelectDate(dateKey)` 그대로 호출(편집 화면 진입).

## AC
- `npm run lint` && `npm run build` && `npm run test` 통과 (신규 테스트 포함)

## 금지
- `storage/diaryStorage.js`의 저장 함수를 호출하거나 수정하지 마라. 이유: 갤러리는 읽기 전용으로 합의됨.
- 썸네일 캐싱/페이지네이션을 구현하지 마라. 이유: 이번 범위는 단순 구현으로 합의됨.
- 갤러리에서 삭제/관리 기능을 추가하지 마라. 이유: PRD Out-of-scope.
