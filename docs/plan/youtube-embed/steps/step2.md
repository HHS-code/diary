# Step 2: youtube-card-placement

## 읽을 파일
- docs/plan/youtube-embed/PRD.md (섹션 "1. 유튜브 링크 감지 및 카드 생성")
- docs/plan/youtube-embed/architecture.md (섹션 "3. 배치 팩토리", "4. 붙여넣기 흐름 연결")
- src/fabric/youtubeUrl.js (step0 산출물 — `extractYoutubeVideoId`)
- src/fabric/YoutubeCard.js (step1 산출물 — 정확한 생성 함수 시그니처를 확인하고 사용)
- src/hooks/useCanvasKeyboardShortcuts.js (전체 — 특히 90-97행 `pasteImageOrClipboardObject`와 116-123행 `handlePaste`. 이 붙여넣기 우선순위 체인에 새 분기를 추가한다)
- src/components/DiaryCanvas/DiaryCanvas.jsx (91-96행 `registerAndPlaceImage` 정의 패턴, 104행 `useCanvasKeyboardShortcuts` 호출부)
- src/hooks/canvasAssetPlacement.js (`addImageAssetToCanvas` — 캔버스에 오브젝트를 배치하는 기존 패턴 참고용)

## 작업

### `src/fabric/placeYoutubeCard.js` (신규)

- `createYoutubeCardObject(videoId) -> Promise<YoutubeCard>` — step1의 `YoutubeCard` 생성 함수를 호출해 인스턴스를 만들고, 캔버스에 배치할 기본 좌표(left/top)를 설정해 반환한다. 기본 좌표는 기존 이미지 붙여넣기가 쓰는 위치 규칙(화면 중앙 또는 고정 오프셋 등, `canvasAssetPlacement.js` 참고)과 일관되게 정한다.

### `src/hooks/useCanvasKeyboardShortcuts.js` 수정

- `handlePaste`(116행)에 텍스트 URL 감지 분기를 추가한다. `event.clipboardData.getData('text')`로 붙여넣은 텍스트를 읽고, `extractYoutubeVideoId`로 검사한다.
- 우선순위(PRD/architecture 합의): (1) 네이티브 이미지 파일 → (2) 클립보드 이미지 → (3) **유튜브 URL 텍스트(신규)** → (4) 기존 오브젝트 붙여넣기(`pasteFromClipboard`) 폴백. 즉 `pasteImageOrClipboardObject`가 이미지도 못 찾고 유튜브 URL도 아닐 때만 기존 오브젝트 붙여넣기로 폴백해야 한다.
- 훅의 옵션 인자(현재 `{ registerAndPlaceImage }`)에 `registerAndPlaceYoutubeCard`를 추가한다. 시그니처는 `(videoId: string) => Promise<void>`.
- `isEditingText(canvas)`인 경우(텍스트 편집 중) 기존과 동일하게 아무 동작도 하지 않는다 — 이 가드는 그대로 유지한다.

### `src/components/DiaryCanvas/DiaryCanvas.jsx` 수정

- `CanvasWorkspace`의 91-96행 `registerAndPlaceImage` 정의 옆에 `registerAndPlaceYoutubeCard` 함수를 추가한다: `createYoutubeCardObject(videoId)` 호출 → `canvas.add(card)` (기존 `registerAndPlaceImage`가 `assetLibrary.registerImage` → `addImageAssetToCanvas` 흐름인 것과 달리, 유튜브 카드는 assetLibrary를 거치지 않는다 — videoId만 있으면 되므로).
- 104행 `useCanvasKeyboardShortcuts(fabricCanvasRef, { registerAndPlaceImage })` 호출부 옵션에 `registerAndPlaceYoutubeCard`를 추가한다.

## AC
- `npm run lint && npm run test` 통과.
- 신규/수정 테스트 (`useCanvasKeyboardShortcuts.test.jsx` 확장 또는 신규 파일):
  - 클립보드 텍스트가 유튜브 URL일 때 `registerAndPlaceYoutubeCard`가 추출된 videoId로 호출되는지.
  - 네이티브 이미지 파일이 있을 때는 유튜브 URL 텍스트가 같이 있어도 이미지 붙여넣기가 우선되는지(우선순위 검증).
  - 클립보드 텍스트가 유튜브 URL이 아닌 일반 텍스트일 때는 기존 오브젝트 붙여넣기(`pasteFromClipboard`) 경로로 폴백하는지(기존 테스트가 깨지지 않는지 확인).
  - 텍스트 편집 중(`isEditingText`)일 때는 유튜브 URL이 붙여넣어져도 아무 동작이 없는지.
- 수동/Playwright 확인: 개발 서버에서 캔버스에 포커스한 채 유튜브 URL을 Ctrl+V로 붙여넣으면 썸네일 카드가 캔버스에 나타나는지 실제로 확인하고 report에 기록한다.

## 금지
- `useYoutubeCardPlayback`, iframe 오버레이, 클릭 재생 로직을 만들지 마라. 이유: 인라인 재생은 step4의 범위다. 이 step에서 카드는 캔버스에 배치되기만 하고 클릭해도 아직 아무 반응이 없어도 된다.
- `resolveCanvasAssetReferences`(useFabricCanvas.js)를 수정하지 마라. 이유: 저장/불러오기 시 YoutubeCard를 어떻게 다룰지는 step3의 범위다. 이 step은 "붙여넣기로 카드를 캔버스에 추가하는 것"까지만 다룬다(같은 세션 내 배치 확인이면 충분하고, 새로고침 후 복원까지 검증할 필요는 없다).
- 기존 이미지 붙여넣기 우선순위(네이티브 파일 → 클립보드 이미지)를 바꾸지 마라. 이유: 유튜브 URL 분기는 그 뒤에 추가되는 세 번째 우선순위이지, 기존 순서를 재정렬하는 것이 아니다.
