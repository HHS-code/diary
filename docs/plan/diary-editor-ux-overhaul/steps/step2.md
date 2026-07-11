# Step 2: object-toolbar-fixed

## 읽을 파일
- docs/plan/diary-editor-ux-overhaul/PRD.md (섹션 2 + "원칙")
- docs/plan/diary-editor-ux-overhaul/architecture.md (섹션 3)
- src/components/ObjectToolbar/ObjectToolbar.jsx (전면 재작성 대상)
- src/hooks/useObjectActions.js (변경 금지 — 시그니처 확인용)
- src/components/DiaryCanvas/DiaryCanvas.jsx (배치 수정 대상)
- docs/design.md (버튼/패널 스타일)

## 작업

### ObjectToolbar.jsx (UI 전면 재작성)
- 기존 `getBoundingRect()` 기반 `position: absolute` 플로팅 배치 코드를 전부 제거한다.
- 항상 렌더링되는 고정 패널로 바꾼다: props는 `{ activeObject, actions }` 유지.
- `activeObject`가 `null`이면 모든 버튼에 `disabled` 속성 + 흐린 스타일(opacity 등). `activeObject`가 있으면 활성화.
- 버튼 6개(복사/삭제/맨앞/맨뒤/한칸앞/한칸뒤)의 `onClick`은 기존과 동일하게 `() => actions.copy(activeObject)` 형태.
- 패널 스타일은 `StickerPalette`의 패널 프레임(헤더바 "오브젝트" 등) + design.md 버튼 스펙 재사용.

### DiaryCanvas.jsx (UI)
- `ObjectToolbar`를 캔버스 래퍼 안 절대 위치가 아니라, 좌측 사이드바(StickerPalette/CanvasBackgroundControl 근처)의 고정 슬롯으로 이동한다. `activeObject` 유무와 무관하게 항상 렌더링한다 (버튼 활성/비활성만 바뀜).
- 캔버스 래퍼의 `position: 'relative'`는 다른 용도가 없으면 유지해도 무방 (제거 필수 아님).

## AC
- `npm run lint` && `npm run build` && `npm run test` 통과
- 자가 점검: ObjectToolbar.jsx가 `fabric`을 import하지 않는지, `getBoundingRect` 호출이 남아있지 않은지 grep으로 확인해 리포트에 기록.

## 금지
- `useObjectActions.js`를 수정하지 마라. 이유: 검증된 로직이며 UI만 바꾸는 것이 이 step의 목적이다.
- `object:moving` 이벤트 구독을 추가하지 마라. 이유: 고정 메뉴 방식에서는 위치 추적이 필요 없다 — 합의된 재설계 방향.
