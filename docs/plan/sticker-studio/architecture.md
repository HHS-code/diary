# Architecture — 스티커 스튜디오

## 컴포넌트 개요

```
src/
  assets/
    icons.js                     (수정 — reference/Windows XP Icons/Paint.png를 stickerStudioIcon으로 추가)
  App.jsx                        (수정 — isStickerStudioOpen state + Window 추가)
  storage/
    assetStorage.js              (수정 — AssetRecord.type에 'sticker' 추가, JSDoc 갱신)
  hooks/
    useFabricCanvas.js           (수정 — logicalSize 옵션 추가, 기본값은 기존 1600x1000 유지)
    useAssetLibrary.js           (수정 — stickers 상태 + registerSticker 추가)
    usePaintTools.js             (수정 — 'lasso' 도구 추가)
  fabric/
    stickerCutout.js             (신규 — 올가미 clipPath 적용 + rasterize)
    stickerOutline.js            (신규 — 오프스크린 다방향 스탬프로 흰색 테두리 생성)
  components/
    Desktop/Desktop.jsx          (수정 — 스티커 스튜디오 아이콘 추가)
    StickerStudio/
      StickerStudio.jsx           (신규 — 스티커 스튜디오 화면 루트)
      StickerStudioSidebar.jsx    (신규 — 그리기 도구 + 이미지 업로드 + 크롭 + 테두리 + 저장 UI)
      MyStickersPanel.jsx         (신규 — 저장된 스티커 목록, 클릭 시 캔버스에 로드)
    AssetImportPanel/AssetImportPanel.jsx  (수정 — 스티커 목록 섹션 추가)
```

## 데이터 흐름

### 1. 진입

```
Desktop 아이콘 클릭
  → App.jsx: setIsStickerStudioOpen(true)
  → <Window title="sticker-studio" onClose={...}><StickerStudio /></Window>
```

`App.jsx`는 다이어리와 동일한 패턴을 그대로 반복한다(`isDiaryOpen`/`DiaryApp`과 나란히 `isStickerStudioOpen`/`StickerStudio`).

### 2. 캔버스 생성 (useFabricCanvas 크기 파라미터화)

```
useFabricCanvas(canvasElementRef, initialCanvasJSON, onSave, options)
  options.logicalSize?: { width: number, height: number }  (신규, 기본값 LOGICAL_CANVAS)

내부:
  const logicalSize = options?.logicalSize ?? LOGICAL_CANVAS
  new Canvas(el, { width: logicalSize.width * displayScale, height: logicalSize.height * displayScale, backgroundColor: options?.backgroundColor ?? '#ffffff' })
  저장 콜백: onSaveRef.current(fabricCanvas.toObject(EXTRA_SERIALIZED_PROPS), logicalSize)
```

- `LOGICAL_CANVAS`(1600×1000) export는 그대로 유지 — 기존 다이어리 호출부는 변경 없이 동작한다.
- 스티커 스튜디오는 `STICKER_LOGICAL_CANVAS = { width: 512, height: 512 }` 같은 별도 상수를 정의해 `logicalSize`로 넘긴다.
- 배경색 옵션(`options.backgroundColor`)도 함께 추가한다 — 스티커 스튜디오는 `'transparent'`를 넘겨 투명 캔버스를 만든다(다이어리는 기존처럼 `'#ffffff'` 기본값 유지).
- 스티커 스튜디오는 다이어리처럼 날짜별 저장이 아니라, 편집 중인 캔버스를 영속시킬 필요가 없다(완성 시에만 PNG로 저장). 따라서 `onSave` 콜백은 넘기지 않거나(오토세이브 비활성) 빈 함수로 둔다 — 저장은 "완성" 버튼을 눌렀을 때만 명시적으로 일어난다.

### 3. 그리기 도구 재사용

```
StickerStudio
  fabricCanvasRef = useFabricCanvas(..., { logicalSize: STICKER_LOGICAL_CANVAS, backgroundColor: 'transparent' })
  paintTools = usePaintTools(fabricCanvasRef)         // 기존 그대로, 변경 없음
  history = useCanvasHistory(fabricCanvasRef)          // 기존 그대로
  assetLibrary = useAssetLibrary()
  useCanvasKeyboardShortcuts(fabricCanvasRef, { registerAndPlaceImage: registerAndPlaceStickerSourceImage })
```

- `usePaintTools`에 `'lasso'` 도구를 추가한다(섹션 5 참고). 연필/브러시/에어브러시/지우개는 수정 없이 그대로 쓰인다.
- `StickerStudioSidebar`는 `PaintToolbox`(기존 컴포넌트, props 그대로)를 재사용해 도구 선택 UI를 구성한다.

### 4. 이미지 업로드 + 크롭

```
사용자가 "이미지 업로드" 버튼 클릭
  → <input type="file" accept="image/*">
  → FabricImage.fromURL(objectURL) 로 캔버스에 배치 (canvasAssetPlacement.js의 배치 로직과 동일한 스케일-다운 방식 재사용)

크롭:
  → 사용자가 사각형 크롭 영역을 지정(Fabric Rect 오브젝트로 영역 표시)
  → "크롭 적용" 시 해당 사각형 좌표로 canvas.toCanvasElement({ left, top, width, height })를 호출해 잘라낸 캔버스를 얻음
  → 그 결과를 새 FabricImage로 캔버스에 교체
```

- 크롭 UI는 기존 코드베이스에 유사 사례가 없어 이번에 새로 만든다. 최소 구현: 드래그로 사각형을 그리는 임시 오브젝트 + "적용"/"취소" 버튼.

### 5. 누끼따기 (올가미)

```
usePaintTools에 'lasso' 도구 추가
  → tool === 'lasso'일 때 canvas.isDrawingMode = true, freeDrawingBrush = PencilBrush(임시 표시용, 선택 영역이므로 얇은 점선 스타일)
  → path:created 시 생성된 Path를 "박제"하지 않고(isFreeDrawing 태그를 붙이지 않음) stickerCutout.js로 전달

stickerCutout.js:
  applyLassoCutout(canvas, targetImage, lassoPath) -> Promise<void>
    1. targetImage.clipPath = lassoPath (좌표계를 이미지 로컬 좌표로 변환)
    2. canvas.renderAll()로 미리보기 (사용자가 확인)
    3. "적용" 확정 시: targetImage.toCanvasElement()로 clipPath가 반영된 결과를 rasterize
    4. rasterize된 canvas를 새 FabricImage로 만들어 기존 targetImage와 canvas 상에서 교체(assetId 등 메타데이터 승계)
```

- 미리보기 단계(2)와 확정 단계(3~4)를 분리해, 사용자가 곡선을 다시 그려 재시도할 수 있게 한다(확정 전까지는 `clipPath` 교체만 반복).
- 곡선이 열려있어도(시작점≠끝점) Fabric Path의 fill 규칙에 맡겨 자동으로 닫힌 영역처럼 채워지는 동작을 그대로 쓴다(ADR-5).

### 6. 흰색 테두리

```
stickerOutline.js:

createOutlinedSticker(sourceCanvasElement, thicknessPx) -> HTMLCanvasElement
  1. sourceCanvasElement(알파 채널 있는 스티커)를 오프스크린 캔버스에 그림
  2. globalCompositeOperation='source-in' + 흰 사각형 채우기로 흰색 실루엣(solid silhouette) 캔버스를 만듦
  3. 실루엣을 두께에 비례한 방향 수(예: thicknessPx가 클수록 방향 수 증가)로 반지름=thicknessPx만큼
     회전시키며 drawImage 반복 스탬핑 → 확장된 흰색 테두리 캔버스 완성
  4. 그 위에 원본 sourceCanvasElement를 다시 그려 최종 합성(테두리 + 원본)
  5. 결과 HTMLCanvasElement 반환
```

- "테두리 추가" 버튼을 누르면 슬라이더로 `thicknessPx`를 조절할 때마다 `createOutlinedSticker`를 (디바운스해서) 다시 호출해 미리보기 캔버스에 그린다.
- 확정 시 이 결과 캔버스를 최종 저장 대상으로 삼는다(섹션 7).
- 이 처리는 Fabric 오브젝트가 아니라 순수 `HTMLCanvasElement` 단위로 이루어진다 — Fabric 캔버스 렌더 루프와 무관한 별도 오프스크린 처리.

### 7. 저장

```
"완성" 버튼 클릭
  1. 테두리 미적용 시: fabricCanvas.toCanvasElement() 로 현재 캔버스를 rasterize
     테두리 적용 시: stickerOutline.js가 반환한 최종 캔버스 사용
  2. canvasElement.toBlob('image/png') 로 투명 배경 PNG Blob 획득
  3. assetStorage.saveAsset({ type: 'sticker', filename: '스티커.png', mimeType: 'image/png', blob })
  4. useAssetLibrary().refresh() 로 stickers 목록 갱신
  5. "다른 이름으로 저장" 원칙(ADR-4) — 기존 스티커를 불러와 편집한 경우에도 항상 saveAsset을 새로 호출(원본 assetId는 갱신하지 않음)
```

### 8. 내 스티커 목록 / 재편집

```
MyStickersPanel (StickerStudio 사이드바)
  useAssetLibrary().stickers 를 썸네일 그리드로 표시 (AssetImportPanel의 이미지 그리드와 동일 패턴)
  클릭 시:
    assetStorage.getAsset(id) → blob → createAssetObjectURL(blob)
    → FabricImage.fromURL(objectURL) 로 현재 캔버스에 로드(기존 오브젝트는 지우고 교체)
    → 이후 편집 후 저장하면 섹션 7 흐름대로 새 assetId로 저장(원본 유지)
```

### 9. AssetImportPanel 연동 (다이어리 캔버스 쪽)

```
AssetImportPanel.jsx
  props로 받는 library(useAssetLibrary 반환값)에 stickers 필드가 추가되어 있으므로,
  기존 "이미지" 섹션과 같은 방식으로 "스티커" 섹션을 그리드로 추가.
  클릭 시 onSelectImage(asset)와 동일한 콜백(예: onSelectSticker 또는 동일 콜백 재사용)으로
  DiaryCanvas의 canvasAssetPlacement.addImageAssetToCanvas를 호출 — 스티커도 assetStorage의
  Blob이므로 이미지와 동일한 배치 로직을 그대로 탄다(별도 배치 로직 불필요).
```

## 신규 의존성

없음 — clipPath(Fabric 내장), Canvas 2D API(`globalCompositeOperation`, `drawImage`, `toBlob`)만으로 구현 가능.

## 변경하지 않는 것

- `diaryStorage.js`, `DiaryCanvas.jsx`의 다이어리 전용 저장/캘린더/탭 로직.
- `assetStorage.js`의 스키마 구조 자체(object store, keyPath) — `type` 유니온만 확장.
- `useCanvasBackground.js`, `AnimatedGif`/GIF 관련 파이프라인 — 스티커는 정지 PNG만 다룬다(PRD Out-of-scope).
- 기존 `LOGICAL_CANVAS`(1600×1000) 기본 동작 — `useFabricCanvas` 호출부 중 `logicalSize`를 넘기지 않는 다이어리 쪽은 완전히 그대로.
