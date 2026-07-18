# Architecture — AI 배경 제거

## 컴포넌트 개요

```
src/
  ai/
    backgroundRemoval.js          (신규 — @bunnio/rembg-web 래퍼: 모델 로드/추론/진행률)
  fabric/
    stickerAiCorrection.js        (신규 — AI 보정 도구: 마스크 기반 복원/삭제 합성)
  components/
    StickerStudio/
      StickerStudio.jsx           (수정 — "AI 배경제거" 버튼, "AI 보정" 도구 연결)
      AiBackgroundRemovalButton.jsx (신규 — 버튼 + 처리중 상태 UI, 선택: StickerStudio.jsx에 직접 둬도 됨)
```

> **참고(불확실성 명시)**: `@bunnio/rembg-web`의 정확한 API(`remove()` 시그니처, `onlyMask` 옵션, `onProgress` 콜백 형태)는 웹 조사로 파악한 내용이며 실제 `node_modules/@bunnio/rembg-web`의 타입 정의(`.d.ts`)로 최종 검증되지 않았다. 구현 착수 시(step-build 첫 step) 반드시 실제 패키지 설치 후 타입/README를 재확인하고, 이 문서와 다르면 그 차이를 반영해 진행한다.

## 데이터 흐름

### 1. 자동 배경 제거

```
사용자가 "AI 배경제거" 버튼 클릭
  → backgroundRemoval.js: removeBackgroundFromImage(canvasElement) 호출
      1. 모델 세션이 아직 없으면 newSession('u2netp')로 생성(최초 1회, 이 시점에 모델 다운로드 발생)
      2. onProgress 콜백으로 다운로드/처리 진행 상태를 StickerStudio.jsx에 전달
         → 버튼 비활성화 + "처리 중..." 표시(PRD)
      3. remove(canvasElement, { session, onlyMask: true, onProgress })
         → 배경/전경 확률을 담은 흑백 마스크 Blob 반환
  → StickerStudio.jsx:
      - AI 배경제거 직전의 캔버스 상태(원본 픽셀)를 useRef로 임시 보관(ADR 논의, 세션 메모리에만 유지)
      - 마스크를 이용해 원본 이미지에 알파 채널을 적용한 새 캔버스를 만들어(오프스크린 Canvas 2D,
        마스크 흑백 값을 alpha로 매핑) 새 FabricImage로 캔버스의 대상 이미지를 교체
      - 처리 완료 후 버튼 재활성화
```

- 대상 이미지 선택 로직은 `sticker-studio`의 `resolveLassoCutoutTarget(canvas)`(이미지가 하나면 그것, 아니면 `getActiveObject()`)를 그대로 재사용한다 — 새로 만들지 않는다.
- 오프스크린에서 마스크를 alpha로 합성하는 방식은 `stickerOutline.js`가 이미 쓰고 있는 "순수 Canvas 2D, Fabric 비의존" 패턴을 따른다.

### 2. AI 보정 (복원/삭제)

```
"AI 보정" 도구 선택 (usePaintTools에 'ai-correction' 같은 새 tool 추가 — sticker-studio의 'lasso'와
동일한 방식으로 PencilBrush 기반 자유곡선, 시각적으로 lasso와 구분되는 스타일)

사용자가 보정하고 싶은 영역을 자유곡선으로 그림 (path:created 발생)
  → StickerStudio.jsx가 이 Path를 캔버스에서 즉시 제거(sticker-studio의 lasso 처리와 동일 —
    그림 획으로 남기지 않음)하고, "마지막으로 그려진 보정 영역"으로 보관

"복원" 버튼 클릭
  → stickerAiCorrection.js: restoreRegion(currentCanvasElement, originalCanvasElement, regionPath)
      1. regionPath를 clipPath 삼아 originalCanvasElement(AI 배경제거 이전 원본)에서 해당 영역만 추출
      2. currentCanvasElement 위에 그 영역만 덮어 그려 원본 픽셀을 복구
      3. 결과를 새 FabricImage로 캔버스의 대상 이미지 교체

"삭제" 버튼 클릭
  → stickerAiCorrection.js: eraseRegion(currentCanvasElement, regionPath)
      1. regionPath를 clipPath 삼아, currentCanvasElement에서 해당 영역만
         globalCompositeOperation='destination-out'으로 투명화
      2. 결과를 새 FabricImage로 캔버스의 대상 이미지 교체
```

- `restoreRegion`/`eraseRegion` 모두 `sticker-studio`의 `stickerCutout.js`가 이미 쓰는 좌표 변환(`util.sendObjectToPlane`)과 rasterize(`canvas.toCanvasElement`) 패턴을 재사용한다 — 새로운 좌표계 처리 방식을 만들지 않는다.
- "복원"은 AI 배경제거 이전 원본이 있어야 동작한다 — 원본이 없으면(AI 배경제거를 한 번도 안 한 상태) "AI 보정" 도구 자체를 비활성화하거나, "복원" 버튼만 비활성화한다(정확한 UX는 step-build 실행 시 결정).

### 3. 모델 세션 생명주기

```
backgroundRemoval.js:
  let cachedSession = null
  async function getOrCreateSession(onProgress) {
    if (cachedSession) return cachedSession
    cachedSession = newSession('u2netp')
    // 첫 호출 시 내부적으로 모델 다운로드(브라우저 Cache API에 캐시되어 재방문 시 재다운로드 없음)
    return cachedSession
  }
```

- 세션은 모듈 스코프에 캐시해, 같은 브라우저 탭 세션 안에서는 "AI 배경제거"를 여러 번 눌러도 모델을 한 번만 로드한다(ADR-4).
- 페이지 새로고침 시에는 세션 재생성이 필요하지만, 모델 바이너리 자체는 브라우저 캐시(Cache API/IndexedDB, 라이브러리가 내부 관리)에 남아있어 네트워크 재다운로드는 발생하지 않는다.

## Vite 빌드 통합 시 확인 사항 (리스크)

- `@bunnio/rembg-web`이 의존하는 `onnxruntime-web`은 Vite와의 조합에서 WASM/Web Worker 로딩 이슈가 알려져 있다(dev 서버에서만 실패하고 build/preview는 정상인 케이스 포함).
- step-build 첫 step에서 실제로 `npm run dev`와 `npm run build` 양쪽에서 모델 로드가 되는지 확인하고, 필요하면 `vite.config.js`에 `optimizeDeps.exclude`나 `assetsInclude` 조정을 추가한다 — 이 조정이 필요한지 여부는 실제 설치 후에만 판단 가능하므로 architecture 확정 사항이 아니라 구현 중 확인 사항으로 남긴다.

## 신규 의존성

- `@bunnio/rembg-web`(MIT) — 내부적으로 `onnxruntime-web`(Apache-2.0 또는 MIT, 패키지 확인 필요)을 의존성으로 포함.

## 변경하지 않는 것

- `sticker-studio`의 기존 올가미 도구(`stickerCutout.js`의 `previewLassoCutout`/`commitLassoCutout`) — AI 보정은 별개 도구다(ADR-3).
- `stickerOutline.js`, 저장(`assetStorage` `sticker` 타입), `MyStickersPanel.jsx` — AI 배경제거/보정을 거친 이미지도 기존 흐름 그대로 테두리 추가 및 저장 대상이 된다.
- `useFabricCanvas.js`, `usePaintTools.js`의 기존 도구(연필/브러시/에어브러시/지우개/올가미) — 새 도구(`ai-correction`)만 추가하고 기존 도구 동작은 그대로.
