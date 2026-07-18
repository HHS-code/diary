# Step 0: gif-frame-decoder

## 읽을 파일
- docs/plan/animated-gif-support/PRD.md (섹션 1 "GIF 프레임 디코딩")
- docs/plan/animated-gif-support/ADR.md (ADR-1)
- docs/plan/animated-gif-support/architecture.md (섹션 1 "GIF 등록 및 프레임 디코딩")

## 작업

### 의존성 추가

`gifuct-js`를 `npm install`로 프로젝트에 추가한다.

### gifFrameDecoder.js (신규)

`src/fabric/gifFrameDecoder.js`:

- 공개 시그니처: `decodeGifFrames(blob: Blob) -> Promise<{ frames: HTMLCanvasElement[], delays: number[] }>`.
- `blob.arrayBuffer()`로 바이너리를 읽고 `gifuct-js`의 파서로 GIF를 디코딩한다.
- `gifuct-js`가 반환하는 프레임별 patch(부분 이미지)와 disposal method를 처리해, 각 프레임이 **완전히 합성된 상태**(이전 프레임 위에 겹쳐 그려 최종적으로 보여야 할 픽셀 전부)의 `HTMLCanvasElement`가 되도록 만든다. 이 합성 로직이 이 step의 핵심이다 — GIF는 프레임마다 변경된 영역만 담는 경우가 많아, 단순히 각 patch를 개별 캔버스에 그리기만 하면 이전 프레임 배경이 빠진 채로 보인다.
- `delays`는 각 프레임의 표시 시간을 **밀리초** 단위로 반환한다(`gifuct-js`는 보통 1/100초 단위를 쓰므로 ×10 변환 필요 — 실제 필드명과 단위는 라이브러리 문서/타입에서 확인). 0 또는 매우 작은 delay 값(일부 GIF 인코더가 0을 쓰는 경우)은 최소 20ms로 보정한다.
- 프레임이 1개뿐인 GIF도 정상적으로 `{ frames: [oneCanvas], delays: [delay] }`를 반환한다 — "1개면 정적 이미지 경로로 처리"하는 분기는 이 함수를 호출하는 쪽(이후 step)의 책임이며, 이 함수 자체는 프레임 개수와 무관하게 항상 같은 형태로 반환한다.
- GIF가 아니거나 파싱 실패 시 에러를 던진다(호출부에서 처리 방식을 결정하도록 — 이 함수 안에서 조용히 무시하지 않는다).

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규 테스트 `gifFrameDecoder.test.js`:
  - 프레임 2개 이상인 GIF 바이너리(테스트 픽스처)를 디코딩하면 `frames.length === delays.length`이고 각 `frames[i]`가 `HTMLCanvasElement`인지.
  - 프레임 1개짜리 정적 GIF를 디코딩하면 `frames.length === 1`인지.
  - GIF가 아닌 바이너리(예: PNG)를 넣으면 에러를 던지는지.
  - 테스트 픽스처 GIF는 작은 크기(예: 2x2px, 2~3프레임)로 직접 만들거나 base64로 인라인해 저장소에 바이너리 파일을 추가하지 않는다.

## 금지
- disposal method 처리를 생략하고 patch만 그대로 반환하지 마라. 이유: 다음 step(AnimatedGif)이 각 프레임을 완성된 그림으로 가정하고 그대로 `drawImage`하므로, 여기서 합성이 안 되면 애니메이션이 깨져 보인다.
- 이 함수 안에서 Fabric.js를 import하거나 Fabric 오브젝트를 만들지 마라. 이유: 디코딩과 Fabric 통합을 분리해 이후 step에서 독립적으로 테스트 가능하게 하기 위함(architecture.md 컴포넌트 개요의 계층 분리).
