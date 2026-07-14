# Step 1: eraser-erase2d

## 읽을 파일
- `src/hooks/usePaintTools.js` — step 0 산출물. 지우개를 여기에 추가한다
- `src/hooks/usePaintTools.test.js` — step 0 테스트, 여기에 이어서 작성
- `src/hooks/useFabricCanvas.js` — `EXTRA_SERIALIZED_PROPS` (step 0에서 isFreeDrawing·erasable 추가됨)
- `src/hooks/useDiaryThumbnails.js` — `buildThumbnail`이 StaticCanvas로 복원하는 방식 (지운 상태가 썸네일에도 유지돼야 함)
- `node_modules/@erase2d/fabric/dist/` 의 타입 선언 또는 README — EraserBrush API 확인 (**이미 설치되어 있음**)

## 작업

### 1. `src/hooks/usePaintTools.js` (수정 — 지우개 추가)

- `tool`에 `'eraser'` 추가. 선택 시 `canvas.isDrawingMode = true` + `canvas.freeDrawingBrush = new EraserBrush(canvas)` (`@erase2d/fabric`), 굵기 = `width`.
- EraserBrush의 `end` 이벤트에서 지운 결과를 대상 오브젝트에 커밋한다
  (erase2d v1 API: `end` 핸들러에서 `e.preventDefault()` 후 `eraser.commit(e.detail)` — 실제 시그니처는 설치된 패키지에서 확인하고 리포트에 기록).
- **지우개 대상은 `erasable: true`인 오브젝트(=그린 획)만이다 (PRD 합의).**
  스티커/사진/텍스트는 erasable 미설정(기본 false)이라 영향받지 않아야 한다 — 테스트로 증명하라.

### 2. 직렬화 왕복 검증 (architecture.md "검증이 필요한 기술 가정" 1·2)

테스트로 다음을 증명하라 (`usePaintTools.test.js` 또는 별도 테스트 파일):
- 지워진 오브젝트(clipPath/ClippingGroup 보유)가 `canvas.toObject(EXTRA_SERIALIZED_PROPS)` → 새 캔버스 `loadFromJSON` 왕복 후에도 지운 상태를 유지한다.
  (ClippingGroup이 fabric classRegistry에 등록되는지 확인 — `@erase2d/fabric` import만으로 등록되지 않으면 등록 코드를 usePaintTools.js 안에 추가.)
- 왕복 후에도 획의 selectable=false, evented=false, isFreeDrawing, erasable이 유지된다.
- `buildThumbnail`(StaticCanvas) 경로로도 지워진 오브젝트가 에러 없이 복원된다.
- jsdom에서 실제 포인터 드래그로 지우기를 재현할 수 없으면, EraserBrush가 만드는 것과 동일한 구조(clipPath 부착)를 프로그래매틱하게 구성해 왕복만 검증하고, 실제 문지르기 동작은 리포트의 "아직 안 된 것"에 브라우저 수동 검증 항목으로 명시하라.

## AC
```
npm run lint
npm run test
npm run build
```
셋 다 exit code 0. 기존 테스트 전부 유지 + 신규 테스트 통과.

## 금지
- `npm install`을 실행하지 마라. 이유: `@erase2d/fabric@1.2.1`은 이미 설치·package.json 반영 완료. headless 세션의 네트워크 접근은 안전 훅에 막힐 수 있다.
- `@erase2d/fabric` import를 `usePaintTools.js` 밖으로 내보내지 마라. 이유: architecture.md 모듈 경계 — 지우개 구현 교체 시 수정 범위를 한 파일로 제한.
- 스티커/사진/텍스트에 `erasable: true`를 설정하지 마라. 이유: PRD 합의 — 지우개는 그린 획만.
- UI(PaintToolbox)·undo를 만들지 마라. 이유: step 2·3의 범위.
- `DiaryCanvas.jsx`, 기존 훅 4종(`useObjectActions`, `useActiveSelection`, `useCanvasKeyboardShortcuts`, `useCanvasBackground`) 수정 금지. 이유: step 0과 동일.
