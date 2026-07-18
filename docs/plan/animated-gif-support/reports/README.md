# 빌드 리포트 — diary (animated-gif-support)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: gif-frame-decoder** — 공개 시그니처: decodeGifFrames(blob: Blob) -> Promise<{ frames: HTMLCanvasElement[], delays: number[] }> (src/fabric/gifFrameDecoder.js). gifuct-js의 parseGIF/decompressFrames(buildImagePatches=true)로 얻은 프레임별 patch(dims, disposalType)를 캔버스 하나(compositeCanvas)에 순서대로 누적해 매 프레임을 '완전 합성된' 새 canvas로 clone해 반환 — disposalType 2(restore-to-background)는 clearRect, 3(restore-to-previous)는 직전 스냅샷 복원, 나머지는 그대로 둔다. delay는 gifuct-js가 이미 ms 단위로 변환해 주므로 그대로 쓰되 MIN_FRAME_DELAY_MS=20으로 하한을 둔다. header.signature !== 'GIF'거나 프레임이 0개면 Error를 던진다(호출부 책임 없음, 조용히 무시 안 함). 테스트(gifFrameDecoder.test.js)는 실제 파일을 추가하지 않고 손수 만든 base64 GIF 바이너리(disposal method 2종 포함)를 인라인해 픽셀 단위로 합성 결과를 검증한다. 다음 step(animated-gif-object)은 이 함수를 호출해 frames/delays를 FabricImage 상속 오브젝트에 넣으면 된다 — Fabric은 이 파일에서 import하지 않았다. ([리포트](step0-gif-frame-decoder.md))
- [대기] **Step 1: animated-gif-object** — 
- [대기] **Step 2: shared-render-loop** — 
- [대기] **Step 3: gif-placement-integration** — 
- [대기] **Step 4: gif-persistence** — 
