# Architecture — 유튜브 임베드 카드 (youtube-embed)

## 개요

유튜브 카드는 두 개의 레이어로 구성된다.

1. **캔버스 레이어**: Fabric.js 커스텀 오브젝트 `YoutubeCard`(`FabricImage` 상속) — 썸네일 + 재생버튼 오버레이를 캔버스 안에 그린다. 저장/불러오기/PNG export는 전부 이 레이어만 관여한다(기존 `AnimatedGif` 패턴과 동일).
2. **DOM 오버레이 레이어**: 카드를 클릭해 재생 중일 때만 존재하는 실제 `<iframe>`. 캔버스 `<canvas>` 엘리먼트 위에 절대좌표로 겹쳐진다. 이 프로젝트에서 **처음 도입되는 패턴**이다 — 기존 GIF/이미지 오브젝트는 전부 Fabric 표준 렌더링만으로 캔버스 안에 그려지고 DOM 오버레이가 없었다. iframe은 `<canvas>` 태그 안에 그릴 수 없는 실제 브라우저 문서이기 때문에 이 방식이 사실상 유일한 기술적 선택지다.

이 두 레이어는 재생 상태가 바뀔 때만 전환된다: 평소엔 카드만(레이어 1), 재생 중엔 카드 위에 iframe이 겹쳐진다(레이어 1 + 2). PNG export는 항상 레이어 1만 캡처하므로 재생 상태와 무관하게 항상 썸네일이 찍힌다(추가 분기 불필요 — 애초에 iframe이 `<canvas>` 밖에 있어서 캡처 대상이 아님).

## 컴포넌트별 설계

### 1. URL 감지 유틸 — `src/fabric/youtubeUrl.js` (신규)

```js
export function extractYoutubeVideoId(text) { ... }
```

- 지원 패턴: `youtube.com/watch?v={id}`, `youtu.be/{id}`, `youtube.com/shorts/{id}`
- 매치 실패 시 `null` 반환. 순수 함수, DOM/Fabric 의존 없음(테스트 용이).

### 2. 커스텀 오브젝트 — `src/fabric/YoutubeCard.js` (신규)

`src/fabric/AnimatedGif.js` 패턴을 그대로 따른다:

- `class YoutubeCard extends FabricImage`
- `static type = 'YoutubeCard'`
- `static customProperties = ['videoId']` — JSON 직렬화에 videoId만 포함(PRD 합의사항)
- 생성 시 `_element`(이미지 소스)는 `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`를 로드해서 채운다. 재생 버튼 아이콘은 별도 이미지 레이어로 얹거나(Fabric Group) 캔버스 draw 훅에서 오버레이 — 세부 구현은 step 단계에서 결정.
- `static async fromObject(object, options)` — `object.videoId`로 썸네일 URL을 재조립해 인스턴스 복원(`AnimatedGif.fromObject`가 assetId로 IndexedDB 재조회하는 것과 대응되는 자리지만, 여긴 외부 URL 재조립이라 더 단순함).
- 비율 고정: Fabric의 `lockUniScaling` 등으로 16:9 유지, 크기조절은 허용.
- 끝에 `classRegistry.setClass(YoutubeCard)` 등록.

### 3. 배치 팩토리 — `src/fabric/placeYoutubeCard.js` (신규, `placeImageOrGif.js`와 대응)

- `createYoutubeCardObject(videoId)` — `YoutubeCard` 인스턴스 생성 후 캔버스 기본 배치 좌표 반환.

### 4. 붙여넣기 흐름 연결

**`src/hooks/useCanvasKeyboardShortcuts.js`** 수정:
- `handlePaste`에 텍스트 URL 감지 분기 추가. `event.clipboardData.getData('text')` → `extractYoutubeVideoId`로 검사.
- 우선순위: (1) 네이티브 이미지 파일 → (2) 클립보드 이미지 → (3) **유튜브 URL 텍스트(신규)** → (4) 기존 오브젝트 붙여넣기 폴백.
- 훅 옵션에 `registerAndPlaceYoutubeCard` 콜백 추가(기존 `registerAndPlaceImage`와 같은 자리, 17행 시그니처 확장).

**`src/components/DiaryCanvas/DiaryCanvas.jsx`** 수정:
- `CanvasWorkspace`(91행 부근, 기존 `registerAndPlaceImage` 정의 옆)에 `registerAndPlaceYoutubeCard` 함수 정의 → `createYoutubeCardObject` 호출 후 `canvas.add`.
- 104행 `useCanvasKeyboardShortcuts` 호출부 옵션에 추가.

### 5. 인라인 재생 — DOM 오버레이

**신규 훅 `src/hooks/useYoutubeCardPlayback.js`**:
- 캔버스의 `mouse:down` 이벤트를 구독해, 클릭된 오브젝트가 `YoutubeCard`면 "재생 중 videoId" 상태를 세팅하고, 캔버스 빈 공간 클릭이면 재생 상태를 해제한다(PRD 합의: 카드 밖 클릭 시 자동 종료).
- 재생 중인 카드가 있으면 매 프레임(`canvas.on('after:render')` 또는 오브젝트의 `moving`/`scaling`/zoom 이벤트) 카드의 캔버스 논리좌표를 화면 좌표로 변환해 iframe의 `style.left/top/width/height`를 갱신한다.
  - 좌표 변환: `useFabricCanvas.js`가 관리하는 `viewportTransform`과 오브젝트의 `getBoundingRect()`를 사용. 논리좌표(`LOGICAL_CANVAS`, 1600×1000 고정) → 화면좌표 변환 공식은 기존 `displayScale` 처리 방식을 그대로 재사용.
  - 캔버스 zoom/pan에도 iframe이 함께 스케일·이동한다(PRD 합의).
- 재생 중 카드는 이동만 허용, 회전·크기조절 컨트롤은 숨긴다(Fabric 오브젝트의 `hasControls = false`, `lockRotation = true` 등을 재생 시작 시 임시 적용하고 종료 시 원복).

**신규 컴포넌트 `src/components/YoutubeCardOverlay/YoutubeCardOverlay.jsx`**:
- `CanvasWorkspace`의 캔버스 컨테이너(`position: relative`인 부모) 안에 `position: absolute`로 렌더링되는 `<iframe>` 하나.
- `useYoutubeCardPlayback`이 계산한 좌표/크기와 재생 중 videoId를 props로 받아 `src="https://www.youtube.com/embed/{videoId}?autoplay=1"`를 렌더링. 재생 중이 아니면 렌더링 안 함(언마운트).

### 6. 저장/불러오기

- `useFabricCanvas.js`의 `EXTRA_SERIALIZED_PROPS`는 이미 `toObject`에 커스텀 속성을 포함시키는 배열이다. `YoutubeCard.customProperties`가 `toObject`에 자동 반영되므로 이 배열 자체는 수정 불필요(AnimatedGif도 같은 방식으로 이미 동작 중).
- `resolveCanvasAssetReferences`(불러오기 전 assetId→objectURL 치환 담당)는 `type === 'AnimatedGif'`를 건너뛰는 것처럼 `type === 'YoutubeCard'`도 건너뛰도록 분기 추가 — `YoutubeCard`는 assetId가 아니라 videoId 기반이라 이 치환 로직 자체가 필요 없다.

### 7. 오브젝트 툴바 / 단축키

- 조사 결과 `ObjectToolbar`와 `useObjectActions`(복사/삭제/레이어순서)는 Fabric 표준 API만 사용하고 타입 분기가 없으므로, `YoutubeCard`에도 별도 구현 없이 그대로 적용된다.
- `Ctrl+C/V`, `Delete`(기존 `useCanvasKeyboardShortcuts`의 오브젝트 클론/삭제 경로)도 동일하게 그대로 동작한다(이건 텍스트 URL 붙여넣기와는 다른 코드 경로 — 오브젝트를 복사한 뒤 Ctrl+V 하는 경우).

## 파일 변경 요약

| 파일 | 종류 |
|---|---|
| `src/fabric/youtubeUrl.js` | 신규 |
| `src/fabric/YoutubeCard.js` | 신규 |
| `src/fabric/placeYoutubeCard.js` | 신규 |
| `src/hooks/useYoutubeCardPlayback.js` | 신규 |
| `src/components/YoutubeCardOverlay/YoutubeCardOverlay.jsx` | 신규 |
| `src/hooks/useCanvasKeyboardShortcuts.js` | 수정 (텍스트 URL 붙여넣기 분기) |
| `src/components/DiaryCanvas/DiaryCanvas.jsx` | 수정 (콜백 연결, Overlay 렌더링) |
| `src/hooks/useFabricCanvas.js` | 수정 (`resolveCanvasAssetReferences`에 YoutubeCard 예외 추가) |

## 결정 근거 요약 (OQ 대응)

- **DOM 오버레이 방식 채택 이유**: iframe은 `<canvas>` 태그 안에 렌더링할 수 없는 실제 브라우저 문서라, 인라인 재생을 원하면 이 방식이 유일한 기술적 선택지. 이 프로젝트 최초의 DOM 오버레이 패턴이라는 복잡도를 사용자가 인지하고 승인함(2026-07-19).
- **zoom/pan 동기화**: 사용자가 자연스러운 UX를 위해 명시적으로 요청. `viewportTransform` 기반 좌표 변환 필요.
- **videoId만 저장**: 파일 크기 최소화, 불러오기 시 외부 URL 재조립으로 충분(사용자 합의).
- **PNG export 시 항상 썸네일**: 별도 분기 불필요 — iframe이 애초에 `<canvas>` 밖에 있어 구조적으로 보장됨.
