# Step 3: font-registry

## 읽을 파일
- docs/plan/asset-import-pipeline/PRD.md (섹션 4)
- docs/plan/asset-import-pipeline/ADR.md (ADR-3)
- docs/plan/asset-import-pipeline/architecture.md (섹션 5 "폰트 등록/적용")
- src/hooks/useAssetLibrary.js (step 2 산출물)
- src/storage/assetStorage.js (step 0 산출물)
- src/components/TextMemoButton/TextMemoButton.jsx (수정 대상)

## 작업

### useFontRegistry.js (신규 훅)

`src/hooks/useFontRegistry.js`:

- 공개 시그니처: `useFontRegistry() -> { customFonts: { label: string, value: string }[] }`.
- 마운트 시 `assetStorage.listAssets('font')`로 등록된 폰트 전체를 불러와 각각에 대해 `new FontFace(record.fontFamily, objectURL)` 생성 → `.load()` → `document.fonts.add(...)`를 수행한다. objectURL은 `createAssetObjectURL(record.blob)`(step 0에서 만든 헬퍼)로 만든다.
- 이미 `document.fonts`에 등록된 동일 family는 중복 등록하지 않는다.
- 반환하는 `customFonts` 배열의 각 항목은 `TextMemoButton`의 기존 `FONTS` 배열 항목과 동일한 형태(`{ label, value }`)를 갖는다. `label`은 `fontFamily` 값을 그대로 쓴다(한글 라벨 병기는 하지 않는다 — 사용자가 올린 임의 폰트라 의미 있는 한글명을 지을 수 없다).
- 새로 폰트가 등록될 때(`useAssetLibrary.registerFont` 호출 이후)도 목록이 갱신되도록, 이 훅과 `useAssetLibrary`가 상태를 공유하거나 `useAssetLibrary`의 `fonts` 배열이 바뀔 때 재로드하는 구조로 만든다 — 구체 연결 방식(같은 부모에서 두 훅을 함께 써서 props로 내려주는 등)은 재량.

### TextMemoButton.jsx 통합

- 기존 하드코딩된 `FONTS` 상수 배열은 그대로 두고, 컴포넌트가 `useFontRegistry`(또는 상위에서 전달받은 `customFonts`)의 결과를 이어붙여 드롭다운 `<option>`을 렌더링한다: `[...FONTS, ...customFonts]`.
- 그룹 구분(optgroup 등) 없이 하나의 목록으로 렌더링한다(ADR-3 결정).
- 기존 `FONTS`를 사용하던 로직(`selectedFont` 초기값, `addTextToCanvas`의 `fontFamily` 적용)은 변경하지 않는다 — 목록 소스만 확장된다.

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규 테스트:
  - `useFontRegistry.test.js`: 등록된 폰트 레코드가 있을 때 `document.fonts`에 해당 family가 추가되는지(또는 `FontFace` 생성/로드가 호출되는지를 검증 가능한 수준으로), `customFonts` 배열에 올바른 `{label, value}` 형태로 나타나는지.
  - `TextMemoButton.test.jsx` 기존 테스트가 있다면 유지하고, 커스텀 폰트가 주입됐을 때 드롭다운 `<option>` 목록에 기존 8종 + 커스텀 폰트가 모두 나타나는지 검증 케이스 추가.

## 금지
- 폰트를 "기본"/"내 폰트" 두 섹션으로 시각적으로 분리하지 마라. 이유: ADR-3에서 하나의 목록으로 합치기로 결정.
- 폰트 서브셋팅, 프리로드 최적화 등을 추가하지 마라. 이유: PRD Out-of-scope("폰트 서브셋팅 등 최적화 처리").
