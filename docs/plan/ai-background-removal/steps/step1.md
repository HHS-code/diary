# Step 1: bg-removal-button

## 읽을 파일
- docs/plan/ai-background-removal/PRD.md (섹션 1 "자동 배경 제거", 성공 기준)
- docs/plan/ai-background-removal/ADR.md (ADR-4)
- docs/plan/ai-background-removal/architecture.md (섹션 1 "자동 배경 제거")
- src/ai/backgroundRemoval.js (step 0 산출물 — 이 step에서 실제로 확정된 시그니처를 그대로 따른다. step0 report에 API가 architecture.md와 달라졌다는 기록이 있으면 그걸 우선한다)
- src/components/StickerStudio/StickerStudio.jsx (전체 — `resolveLassoCutoutTarget`, `handleCommitLassoCutout` 등 기존 패턴, 사이드바 구조)
- src/fabric/stickerCutout.js (전체 — `commitLassoCutout`의 rasterize 패턴, `canvas.toCanvasElement`/`FabricImage` 교체 방식 참고)

## 작업

### StickerStudio.jsx 수정

- 사이드바에 "AI 배경제거" 버튼을 추가한다(기존 "누끼 적용" 버튼 근처, 같은 패널 안에 두는 것을 권장).
- 클릭 핸들러:
  1. 대상 이미지를 고른다 — `StickerStudio.jsx`에 이미 있는 `resolveLassoCutoutTarget(canvas)` 함수를 그대로 재사용한다(새로 만들지 않는다).
  2. 대상이 없으면 아무 것도 하지 않는다.
  3. AI 배경제거 직전의 캔버스 상태를 `useRef`(예: `originalBeforeAiRemovalRef`)에 임시 보관한다 — `canvas.toCanvasElement()` 결과(또는 대상 이미지만의 rasterize 결과)를 저장한다. 이 값은 다음 step(AI 보정의 "복원")이 사용한다. 저장/새로고침 시 유지할 필요는 없다(세션 메모리로 충분, ai-background-removal ADR 합의 사항).
  4. 버튼을 비활성화하고 "처리 중..." 텍스트/스피너를 표시한다(React state, 예: `isRemovingBackground`).
  5. `removeBackgroundFromImage(source, onProgress)`(step 0 산출물)를 호출한다. `onProgress`는 최소한 콘솔 로그나 텍스트 갱신 정도로 연결해도 되고, 더 정교한 진행률 표시(퍼센트)를 만들어도 된다 — PRD가 요구하는 것은 "처리 중임을 알 수 있는 표시"이지 정확한 퍼센트 UI가 아니다.
  6. 결과 Blob을 받으면, `stickerCutout.js`의 `commitLassoCutout`이 하는 것과 동일한 방식으로(새 `FabricImage`를 만들어 원래 위치에 배치, `assetId` 승계, 기존 오브젝트 제거 후 교체) 캔버스의 대상 이미지를 교체한다.
  7. 버튼을 다시 활성화하고 "처리 중" 표시를 지운다.
  8. 에러가 발생하면(모델 로드 실패, 네트워크 문제 등) 버튼을 재활성화하고 사용자에게 최소한의 실패 표시(예: 버튼 텍스트를 잠깐 "실패" 등)를 한다 — 앱 전체가 멈추거나 콘솔 에러만 남기고 조용히 끝나면 안 된다.

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트: `removeBackgroundFromImage`를 모킹해, 버튼 클릭 시 (a) 클릭 즉시 버튼이 비활성화되는지, (b) 성공 시 캔버스의 대상 오브젝트가 교체되고 버튼이 재활성화되는지, (c) 실패(reject) 시에도 버튼이 재활성화되는지.
- 신규 테스트: 버튼 클릭 시 AI 배경제거 직전 상태가 `useRef`(또는 동등한 방식)에 저장되는지 — 컴포넌트 내부 상태를 직접 검증하기 어려우면, 다음 step이 이 값을 읽어 "복원"이 정상 동작하는지로 간접 검증해도 된다(이 step에서는 저장 자체만 확인).

## 금지
- 처리 중에 화면 전체를 모달/오버레이로 잠그지 마라. 이유: PRD ADR 합의 — 버튼만 비활성화하고 다른 화면 조작은 막지 않는 것이 명시적 결정이다.
- AI 배경제거 결과를 assetStorage에 자동으로 저장하지 마라. 이유: `sticker-studio`의 기존 원칙(ADR-4, "완성" 버튼을 눌렀을 때만 명시적으로 저장)을 그대로 따른다 — AI 배경제거는 캔버스 편집 동작일 뿐 저장 동작이 아니다.
- `resolveLassoCutoutTarget`을 복제해서 새 함수를 만들지 마라. 이유: 이미 `StickerStudio.jsx`에 있는 동일 로직을 재사용하는 것이 architecture.md의 명시적 지침이다.
