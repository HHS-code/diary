# Step 5: clipboard-paste-priority

## 읽을 파일
- docs/plan/asset-import-pipeline/PRD.md (섹션 3 "클립보드 붙여넣기" 항목)
- docs/plan/asset-import-pipeline/ADR.md (ADR-5)
- docs/plan/asset-import-pipeline/architecture.md (섹션 6 "클립보드 붙여넣기 통합")
- src/hooks/useCanvasKeyboardShortcuts.js (수정 대상 — 기존 Ctrl+V 오브젝트 붙여넣기)
- src/hooks/useAssetLibrary.js (step 2 산출물 — registerImage)

## 작업

### useCanvasKeyboardShortcuts.js 수정

- 기존 `handleKeyDown`의 `isCtrlOrCmd && event.key === 'v'` 분기를 다음 순서로 교체한다:
  1. `navigator.clipboard.read()`(또는 `paste` 이벤트의 `event.clipboardData.items` — 둘 중 이 코드베이스의 이벤트 등록 방식(`keydown` 전역 리스너)과 더 잘 맞는 쪽을 골라도 된다. 단 `keydown`으로는 클립보드 파일 내용에 접근할 수 없는 브라우저 제약이 있으므로, 실제로는 `paste` 이벤트 리스너를 별도로 추가하고 `keydown`의 Ctrl+V 분기는 텍스트 편집 중이 아닐 때 기존 오브젝트 붙여넣기 전용으로 남겨두는 방식도 허용한다 — 구현 방식은 재량, 단 아래 동작 요구사항은 반드시 만족해야 한다).
  2. 클립보드에서 이미지 파일을 찾으면(MIME 타입이 `image/*`인 항목) `useAssetLibrary.registerImage(imageFile)`를 호출해 에셋으로 등록한다. 캔버스에 즉시 오브젝트로 추가하지는 않는다(architecture 섹션 6 경계 — 등록까지만).
  3. 클립보드에 이미지가 없으면 기존 `pasteFromClipboard(canvas)`(Fabric 오브젝트 clone 붙여넣기)를 그대로 실행한다.
  4. `navigator.clipboard.read()` 권한 거부나 미지원 브라우저에서 예외가 나면 조용히 3번(기존 동작)으로 폴백한다 — 에러를 사용자에게 노출하지 않는다.
- 텍스트 편집 중(`isEditingText`)일 때는 기존과 동일하게 아무 동작도 하지 않는다(이 가드는 그대로 유지).
- 이 훅이 `useAssetLibrary`를 사용해야 하므로, 훅을 호출하는 상위 컴포넌트에서 `useAssetLibrary()` 결과(또는 그 `registerImage`)를 `useCanvasKeyboardShortcuts`에 인자로 전달하도록 시그니처를 확장한다: `useCanvasKeyboardShortcuts(fabricCanvasRef, { registerImage })`.

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규/수정 테스트 (`useCanvasKeyboardShortcuts.test.js`):
  - 클립보드에 이미지가 있는 상태를 mock해 Ctrl+V(또는 paste 이벤트)를 발생시키면 `registerImage`가 호출되고, 기존 `pasteFromClipboard`(오브젝트 clone)는 호출되지 않는지.
  - 클립보드에 이미지가 없는 상태에서는 기존과 동일하게 오브젝트 clone 붙여넣기가 동작하는지(기존 테스트가 있다면 회귀 확인).
  - `navigator.clipboard.read`가 예외를 던지는 상황을 mock했을 때 기존 오브젝트 붙여넣기로 정상 폴백하는지.

## 금지
- 클립보드에서 찾은 이미지를 캔버스에 자동으로 오브젝트나 배경으로 추가하지 마라. 이유: architecture 섹션 6 — 이번 phase는 "에셋 등록"까지가 경계이고, 캔버스 삽입은 각 통합 지점(배경 설정 UI 등 이미 만들어진 UI)에서 사용자가 선택하는 몫이다.
- 텍스트 편집 중(`isEditingText`)의 기존 가드를 제거하거나 우회하지 마라. 이유: 텍스트 입력 중 Ctrl+V는 텍스트 붙여넣기여야 하며 이 phase 범위가 아니다.
