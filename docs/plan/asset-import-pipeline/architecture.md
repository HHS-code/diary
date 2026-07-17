# Architecture — 에셋 입력 파이프라인

## 컴포넌트 개요

```
src/
  storage/
    diaryStorage.js          (기존, 변경 없음 — 다이어리 텍스트/캔버스 JSON 메타 저장)
    assetStorage.js           (신규 — IndexedDB 기반 이미지/폰트 Blob 저장)
    assetMigration.js         (신규 — localStorage base64 → IndexedDB 1회성 이관)
  hooks/
    useCanvasBackground.js    (기존, 수정 — setImage가 assetStorage 경유하도록 교체)
    useCanvasKeyboardShortcuts.js (기존, 수정 — Ctrl+V에 클립보드 이미지 우선 분기 추가)
    useAssetLibrary.js         (신규 — 등록된 이미지/폰트 목록 상태 + 등록 함수 제공)
    useFontRegistry.js         (신규 — FontFace API로 폰트 동적 로드/등록)
  components/
    AssetImportPanel/          (신규 — 공용 에셋 입력 UI: 파일선택/폴더선택/드래그앤드롭)
      AssetImportPanel.jsx
    TextMemoButton/TextMemoButton.jsx (기존, 수정 — 폰트 목록을 useFontRegistry에서 받아옴)
```

## 데이터 흐름

### 1. 에셋 등록 (공용 입력 경로)

```
사용자 입력(파일선택 | 폴더선택 | 드래그드롭 | Ctrl+V)
  → AssetImportPanel이 File[] 목록으로 정규화
  → 확장자로 분류: image/* → useAssetLibrary.registerImage(file)
                   .ttf/.otf/.woff/.woff2 → useAssetLibrary.registerFont(file)
                   그 외 → 무시
  → assetStorage.saveAsset({ id, type, filename, mimeType, blob }) (IndexedDB write)
  → type === 'font'인 경우 추가로 useFontRegistry.loadFont(id, blob)이
    FontFace 생성 → document.fonts.add() → 폰트 목록 상태에 반영
```

폴더 선택은 `<input type="file" webkitdirectory multiple>`로 하위 파일 전체(브라우저가 재귀적으로 상대경로 포함해 제공)를 받아 위와 동일한 분류 로직을 각 파일에 적용한다.

### 2. IndexedDB 스키마 (`assetStorage.js`)

```
DB: "diary-assets" (version 1)
ObjectStore: "assets"
  keyPath: "id" (string, uuid)
  레코드: {
    id: string,
    type: "image" | "font",
    filename: string,
    mimeType: string,
    fontFamily?: string,   // type === "font"일 때만
    blob: Blob,
    createdAt: number,
  }
```

- 조회는 `id`로 단건 조회(`getAsset(id)`), 전체 목록은 `type`으로 필터링해 나열(`listAssets(type)`).
- Fabric JSON이나 텍스트 메모 설정에는 Blob 자체가 아니라 `id`(참조)만 저장한다. 실제 렌더링 시점에 `assetStorage.getAsset(id)` → `URL.createObjectURL(blob)`으로 변환해 사용한다.

### 3. 배경 이미지 통합 (`useCanvasBackground.js`)

- 기존: `setImage(file)` → `FileReader.readAsDataURL` → base64 → Fabric `isBackground` 오브젝트.
- 변경 후: `setImage(file)` → `assetStorage.saveAsset(...)`로 저장 → 반환된 `id`로 `URL.createObjectURL(blob)` 생성 → 그 objectURL로 기존과 동일하게 `FabricImage.fromURL(...)` 호출.
- Fabric 오브젝트에는 `assetId: id`를 함께 저장해, 캔버스 JSON을 다시 불러올 때 `assetId`로 `assetStorage.getAsset(id)`를 조회해 objectURL을 재생성한다.
- `isBackground` 태그, `lockBackground`, `clearBackground` 등 기존 오브젝트 취급 로직은 변경하지 않는다(ADR과 무관, PRD의 원칙 유지).

### 4. 마이그레이션 (`assetMigration.js`)

```
앱 부팅 시 1회 실행 (App.jsx 최상위 또는 main.jsx에서 호출)
  → localStorage.getItem('diary-asset-migration-done') 확인
  → 이미 done이면 아무것도 안 함
  → 아니면:
      diaryStorage.loadAllDiaryData()로 전체 데이터 로드
      각 dateKey → diary/movie 탭의 canvasJSON을 순회
      canvasJSON.objects 중 src가 "data:"로 시작하는 이미지 오브젝트를 찾음
        → base64 → Blob 변환 (fetch(dataUrl).then(r => r.blob()) 또는 직접 디코딩)
        → assetStorage.saveAsset()으로 저장, 새 id 발급
        → 해당 오브젝트의 src를 제거하고 assetId: id로 교체
      갱신된 canvasJSON 전체를 diaryStorage.saveAllDiaryData()로 재저장
      localStorage.setItem('diary-asset-migration-done', 'true')
```

- 마이그레이션 실패(개별 이미지 변환 오류) 시 해당 이미지는 건너뛰고 나머지는 계속 진행 — 전체를 롤백하지 않는다(부분 성공 허용).
- 캔버스 렌더링 쪽(`useFabricCanvas.js` 또는 캔버스 JSON 로드 지점)은 오브젝트에 `assetId`가 있으면 `assetStorage.getAsset(assetId)`로 objectURL을 재구성해 `src`에 채워 넣은 뒤 Fabric에 로드하도록 로드 경로를 한 곳 수정한다.

### 5. 폰트 등록/적용 (`useFontRegistry.js`, `TextMemoButton.jsx`)

```
앱 시작 시: assetStorage.listAssets('font')로 이미 등록된 폰트 전체를 불러와
  각각 FontFace(family, objectURL) 생성 → document.fonts.add()
새 폰트 등록 시: 위와 동일한 과정을 즉시 1건 수행

TextMemoButton의 FONTS 목록 = 기존 8종 고정 배열 + useFontRegistry가 제공하는 동적 목록
  → 드롭다운 <option>으로 합쳐서 렌더링 (그룹 구분 없이 하나의 목록)
```

- 폰트 패밀리명은 파일명(확장자 제외)을 기본값으로 사용한다. 동일 이름 충돌 시 뒤에 짧은 id suffix를 붙인다.

### 6. 클립보드 붙여넣기 통합 (`useCanvasKeyboardShortcuts.js`)

```
기존 handleKeyDown의 Ctrl+V 분기를 아래로 교체:

if (isCtrlOrCmd && event.key === 'v') {
  const clipboardImage = await tryReadClipboardImage() // navigator.clipboard.read()
  if (clipboardImage) {
    await useAssetLibrary.registerImage(clipboardImage)  // 등록만, 캔버스 추가는 안 함
    // 등록된 배경/스티커 등은 각 UI(AssetImportPanel 등)에서 사용자가 선택해 캔버스에 추가
  } else {
    pasteFromClipboard(canvas)  // 기존 동작 그대로 폴백
  }
}
```

- `navigator.clipboard.read()`는 비동기이며 브라우저 권한이 필요할 수 있다 — 권한 거부/미지원 시 조용히 기존 오브젝트 붙여넣기로 폴백한다.
- 이번 phase 범위는 "에셋으로 등록"까지이며, 등록된 이미지를 캔버스에 즉시 삽입할지는 각 통합 지점(배경 설정 UI 등)의 몫으로 남긴다 — PRD out-of-scope의 "스티커 에디터 자체"와 동일한 경계.

## 신규 의존성

- IndexedDB 접근을 위한 경량 wrapper 라이브러리 도입 여부는 구현 단계에서 결정(직접 `indexedDB` API 사용도 가능한 규모). 필요 시 `idb` 패키지 추가.
- 폴더 선택(`webkitdirectory`)과 드래그앤드롭은 네이티브 브라우저 API만으로 충분해 추가 라이브러리 불필요.

## 변경하지 않는 것

- `diaryStorage.js`의 키/스키마, `useObjectActions.js`, ObjectToolbar, export/import(JSON/PNG), 오토세이브 이벤트 파이프라인(`object:added/modified/removed`) — 전부 기존 그대로.
- Fabric 오브젝트의 `isBackground` 태그 기반 배경 취급 방식.
