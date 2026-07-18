# Step 3: sticker-image-upload-crop

## 읽을 파일
- docs/plan/sticker-studio/PRD.md (섹션 4 "스티커 제작 — 이미지 업로드 편집" 중 업로드·크롭 부분)
- docs/plan/sticker-studio/architecture.md (섹션 4 "이미지 업로드 + 크롭")
- src/components/StickerStudio/StickerStudio.jsx (step 2 산출물 — 캔버스/사이드바 뼈대)
- src/components/ImageUploadButton/ImageUploadButton.jsx (기존 업로드 버튼 패턴 참고 — 단, 이 파일을 직접 수정하지 않는다. 새 컴포넌트에서 유사한 패턴만 참고)
- src/hooks/canvasAssetPlacement.js (`addImageAssetToCanvas`의 스케일 다운 로직 — 크기 계산 방식 참고)
- src/hooks/useFabricCanvas.js (`LOGICAL_CANVAS`/`logicalSize` 개념, `fabricCanvasRef` 타입)

## 작업

### 이미지 업로드 버튼

`StickerStudio.jsx`의 사이드바에 "이미지 업로드" 버튼과 숨겨진 `<input type="file" accept="image/*">`를 추가한다(패턴은 `ImageUploadButton.jsx`와 유사하되, 이 step에서는 별도 컴포넌트 `src/components/StickerStudio/StickerImageUpload.jsx`로 분리하거나 `StickerStudio.jsx` 안에 직접 두어도 된다 — 재사용 범위가 좁아 과설계할 필요는 없다).

- 파일 선택 시 `FabricImage.fromURL(objectURL)`로 캔버스에 이미지를 추가한다. 스티커 캔버스(512×512, `STICKER_LOGICAL_CANVAS`)보다 큰 이미지는 비율을 유지한 채 스케일 다운해 캔버스 안에 들어오도록 한다(`canvasAssetPlacement.js`의 `Math.min(...)` 스케일 계산과 동일한 방식).
- 이 시점에는 IndexedDB 저장이나 `assetId` 부여를 하지 않는다 — 스티커 스튜디오 캔버스에 올린 이미지는 편집 중인 임시 오브젝트이며, `assetStorage` 저장은 "완성" 버튼을 눌렀을 때만 일어난다(architecture.md 섹션 7, 이후 step 범위).

### 크롭

- 사용자가 캔버스 위에 사각형 크롭 영역을 드래그로 지정할 수 있는 UI를 만든다(임시 `Rect` 오브젝트를 그려 영역을 표시 — 그리기 도구의 `tool` 상태와 별개로 "크롭 모드"라는 상태를 추가해도 되고, `usePaintTools`의 `tool` 목록에 넣지 않아도 된다. 크롭은 그리기 도구가 아니라 별도 편집 액션이므로 UI/상태를 자유롭게 설계).
- "크롭 적용" 버튼을 누르면, 지정된 사각형 좌표로 `fabricCanvas.toCanvasElement({ left, top, width, height })`를 호출해 그 영역만 담은 새 캔버스 엘리먼트를 얻는다.
- 그 결과로 얻은 `HTMLCanvasElement`를 새 `FabricImage`로 만들어, 기존에 캔버스에 있던 오브젝트들을 모두 제거하고 이 크롭된 이미지 하나로 교체한다(크롭은 "지금 보이는 캔버스 전체를 잘라낸 결과"로 다시 시작하는 개념).
- "취소" 버튼으로 크롭 모드를 빠져나올 수 있어야 한다(사각형 영역 표시만 지우고 캔버스 내용은 그대로 유지).

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트: 이미지 업로드 시 캔버스보다 큰 이미지가 스케일 다운되어 추가되는지(기존 `canvasAssetPlacement.test.js`/`ImageUploadButton.test.jsx`의 jsdom/HTMLImageElement 우회 패턴을 동일하게 재사용).
- 신규 테스트: 크롭 영역을 지정하고 적용하면 캔버스에 크롭된 결과 이미지 하나만 남는지(테스트에서 `toCanvasElement`를 모킹하거나, jsdom 환경에서 실제 캔버스 픽셀을 비교하기 어려우면 "크롭 적용 후 오브젝트 개수가 1개가 되는지", "이전 오브젝트들이 canvas에서 제거되는지" 등 구조적 사실로 검증해도 된다).

## 금지
- `ImageUploadButton.jsx`(다이어리 쪽 기존 파일)를 수정하지 마라. 이유: 스티커 스튜디오 전용 업로드 흐름은 IndexedDB 저장 시점이 다르므로(완성 시에만 저장) 다이어리의 즉시-저장 방식과 다르다. 기존 컴포넌트를 억지로 재사용하면 조건 분기가 늘어나 오히려 복잡해진다 — architecture.md도 이 둘을 별도 컴포넌트로 설계했다.
- 크롭 적용 시점에 `assetStorage.saveAsset`을 호출하지 마라. 이유: PRD — 저장은 "완성" 버튼을 눌렀을 때만 일어나는 명시적 동작이다(ADR-4, architecture.md 섹션 7). 크롭은 편집 중 캔버스 내용을 바꾸는 동작일 뿐 저장이 아니다.
- 크롭을 원형이나 자유 도형으로 만들지 마라. 이유: PRD In-scope는 "사각형 영역을 지정해 잘라낸다"로 명시되어 있다 — 자유 영역 배경 제거는 다음 step(sticker-lasso-cutout)의 별개 기능(누끼따기)이다.
