# 빌드 리포트 — diary (sticker-studio)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: canvas-size-param** — useFabricCanvas(canvasElementRef, initialCanvasJSON, onSave, options) 시그니처 유지, options에 logicalSize?: {width,height}와 backgroundColor?: string 추가. 내부에서 const logicalSize = options?.logicalSize ?? LOGICAL_CANVAS 계산해 Canvas 생성 width/height와 onSave 두 번째 인자(canvasSize)에 사용. backgroundColor는 options?.backgroundColor ?? '#ffffff'. LOGICAL_CANVAS export(1600x1000)는 이름/값 그대로 유지, 옵션 미전달 시 기존 다이어리 동작 100% 동일(회귀 테스트로 확인). 다음 step(sticker-studio-shell)은 STICKER_LOGICAL_CANVAS={width:512,height:512}와 backgroundColor:'transparent'를 이 options로 넘겨 사용하면 됨. 산출 파일: src/hooks/useFabricCanvas.js, src/hooks/useFabricCanvas.test.js. ([리포트](step0-canvas-size-param.md))
- [완료] **Step 1: sticker-asset-type** — assetStorage.js AssetRecord.type / saveAsset / listAssets JSDoc을 'image' | 'font' | 'sticker'로 확장(구현 로직 변경 없음 — 문자열 그대로 저장/필터). useAssetLibrary()가 stickers: AssetRecord[]와 registerSticker(blob: Blob, filename: string) -> Promise<string>을 반환하도록 확장 — registerImage/registerFont와 달리 File이 아니라 이미 만들어진 Blob을 받는다(mimeType은 blob.type || 'image/png'). classifyAssetType은 변경하지 않음(스티커는 확장자 분류 대상이 아님). AssetImportPanel.jsx는 아직 stickers를 노출하지 않음 — 그건 step 6 범위. 산출 파일: src/storage/assetStorage.js, src/storage/assetStorage.test.js, src/hooks/useAssetLibrary.js, src/hooks/useAssetLibrary.test.jsx. ([리포트](step1-sticker-asset-type.md))
- [대기] **Step 2: sticker-studio-shell** — 
- [대기] **Step 3: sticker-image-upload-crop** — 
- [대기] **Step 4: sticker-lasso-cutout** — 
- [대기] **Step 5: sticker-outline** — 
- [대기] **Step 6: sticker-save-and-reuse** — 
