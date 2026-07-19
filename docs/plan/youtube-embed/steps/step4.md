# Step 4: youtube-card-playback

## 읽을 파일
- docs/plan/youtube-embed/PRD.md (섹션 "3. 인라인 재생", Out-of-scope, 성공 기준)
- docs/plan/youtube-embed/architecture.md (섹션 "5. 인라인 재생 — DOM 오버레이", "결정 근거 요약")
- src/fabric/YoutubeCard.js (step1 산출물)
- src/hooks/useFabricCanvas.js (9행 `LOGICAL_CANVAS`, 100-107행 — 캔버스는 논리 좌표 1600×1000 고정이고 `displayScale`로 `setZoom()`만 걸려있다는 것을 확인)
- src/components/DiaryCanvas/DiaryCanvas.jsx (141-155행 — `<canvas>` 엘리먼트가 `display:inline-block` 래퍼 안에, 그 부모는 `overflow:hidden`인 회색 작업대 안에 있다는 실제 DOM 구조. iframe을 어디에 절대좌표로 배치할지 이 구조를 기준으로 정한다)
- src/hooks/useActiveSelection.js (오브젝트 선택/클릭 감지 기존 패턴 참고용)

## 배경 지식 (architecture.md 대비 실측 필요)

이 프로젝트는 지금까지 Fabric 캔버스 위에 실제 DOM 엘리먼트(iframe 등)를 겹치는 오버레이를 만든 적이 없다. `useFabricCanvas.js`는 캔버스를 `setZoom(displayScale)`로 확대/축소하지만, 이 프로젝트에는 **마우스 팬(pan)** 기능이 없다(architecture.md가 "zoom/pan"이라 표현한 것 중 pan은 실제로 존재하지 않을 수 있다 — 이 step에서 `useFabricCanvas.js`와 캔버스 관련 훅 전체를 확인해 실제로 pan 기능이 있는지 먼저 확인하고, 없다면 pan 동기화 코드는 작성하지 않는다. report에 실측 결과를 기록한다).

## 작업

### `src/hooks/useYoutubeCardPlayback.js` (신규)

- 캔버스의 `mouse:down` 이벤트를 구독한다.
  - 클릭된 오브젝트(`event.target`)가 `YoutubeCard` 인스턴스면, "재생 중" 상태를 그 오브젝트로 세팅한다.
  - 클릭이 캔버스 빈 공간(`event.target`이 없음)이면, 재생 중 상태를 해제한다(PRD 합의: 카드 밖 클릭 시 자동 종료). 다른 오브젝트를 클릭한 경우의 동작은 재량으로 정하되(재생 유지 또는 종료), report에 선택한 동작과 이유를 기록한다.
- 재생 중인 카드가 있는 동안, 그 카드의 화면상 위치/크기를 매 프레임 계산해 반환한다(`canvas.on('after:render', ...)` 구독 권장 — 카드 이동·캔버스 zoom 변경 시에도 이 이벤트가 발생해 자동으로 재계산된다).
  - 좌표 변환: 오브젝트의 `getBoundingRect()`(캔버스 좌표계 기준, absolute 옵션 사용)로 캔버스 내부 좌표를 얻고, 여기에 `<canvas>` DOM 엘리먼트의 `getBoundingClientRect()`(뷰포트 기준 위치)를 더해 최종 화면 좌표를 계산한다. `getBoundingRect()`가 이미 zoom이 반영된 값을 반환하는지 실제로 확인하고(Fabric 버전에 따라 다를 수 있음), 필요하면 `canvas.getZoom()`을 곱한다. 이 계산 방식이 architecture.md의 가정과 다르면 실제 동작하는 방식으로 구현하고 report에 기록한다.
- 재생 중인 카드는 `hasControls = false`, `lockRotation = true`, `lockScalingX = true`, `lockScalingY = true`를 임시로 적용하고(PRD: 재생 중 이동만 허용), 재생 종료 시 원래 값으로 복원한다.
- 반환값(재량으로 정하되 다음 정보는 반드시 포함): 현재 재생 중인 `videoId`(없으면 `null`), 화면상 `{ left, top, width, height }`.

### `src/components/YoutubeCardOverlay/YoutubeCardOverlay.jsx` (신규)

- props: `videoId`(null이면 아무것도 렌더링하지 않음), `left`, `top`, `width`, `height`.
- `position: fixed` 또는 `position: absolute`(부모 좌표계에 맞춰 재량으로 선택, DiaryCanvas.jsx의 실제 DOM 구조 기준으로 정확히 겹치는 쪽을 선택하고 report에 이유를 기록)로 `<iframe src="https://www.youtube.com/embed/{videoId}?autoplay=1" allow="autoplay; encrypted-media" allowFullScreen />`을 렌더링한다.
- `videoId`가 `null`이면 `null`을 반환해 iframe을 아예 언마운트한다(재생 종료 시 실제로 영상이 멈추도록 — `src`만 비우는 방식은 안 됨).

### `src/components/DiaryCanvas/DiaryCanvas.jsx` 수정

- `CanvasWorkspace`에 `useYoutubeCardPlayback(fabricCanvasRef)`를 연결하고, 반환된 상태를 `<YoutubeCardOverlay>`에 전달해 캔버스 컨테이너 안에 렌더링한다.

## AC
- `npm run lint && npm run test` 통과.
- 신규 테스트 `useYoutubeCardPlayback.test.js`: `YoutubeCard`를 클릭하면 재생 상태가 세팅되는지, 빈 공간을 클릭하면 해제되는지, 재생 중 카드의 `hasControls`/`lockRotation`/`lockScalingX`/`lockScalingY`가 잠기고 종료 시 원복되는지(Fabric 캔버스는 jsdom에서 mock하거나 기존 테스트의 캔버스 셋업 패턴을 따른다).
- 수동/Playwright 확인 (report에 스크린샷 또는 관찰 결과 기록):
  1. 캔버스에 유튜브 카드를 추가하고 클릭 → 카드 위치에 정확히 iframe이 겹쳐 재생되는지.
  2. 재생 중 카드를 드래그로 이동 → iframe이 함께 따라가는지.
  3. 재생 중 캔버스를 확대/축소(zoom) → iframe 크기/위치가 함께 조정되는지(이 프로젝트에 zoom 조작 UI가 있는지 먼저 확인 — 없다면 `canvas.setZoom()`을 직접 호출해 확인하고 그 사실을 report에 기록).
  4. 캔버스 빈 공간을 클릭 → 재생이 멈추고 다시 썸네일 카드로 보이는지.
  5. 캔버스를 PNG로 export(`ExportImportControls`) → 재생 중이었어도 결과 PNG에는 썸네일이 찍히는지(iframe이 캡처되지 않는지).

## 금지
- 재생 중 카드의 회전/크기조절을 허용하지 마라. 이유: PRD 합의 — 재생 중에는 이동만 허용한다.
- iframe을 Fabric 캔버스나 `toObject`/저장 데이터에 포함시키지 마라. 이유: 재생은 항상 일시적 UI 상태이며 저장 대상이 아니다(step3에서 확정한 videoId만 저장 원칙).
- PNG export 코드(`ExportImportControls.jsx`)에 "재생 중이면 썸네일로 대체" 같은 특수 분기를 추가하지 마라. 이유: architecture.md 결정 근거에 따르면 iframe이 애초에 `<canvas>` 엘리먼트 밖에 존재하므로 `canvas.toDataURL()`에 별도 처리 없이 잡히지 않는다 — 이 step은 그 사실을 AC 5번으로 "확인"하는 것이지, 별도 로직을 "구현"하는 게 아니다. 실제로 문제가 발견되면(iframe이 어떤 이유로든 캡처에 영향을 준다면) 멈추고 이 사실을 report에 기록한 뒤 사람에게 알린다.
