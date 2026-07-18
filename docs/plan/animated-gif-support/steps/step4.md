# Step 4: gif-persistence

## 읽을 파일
- docs/plan/animated-gif-support/PRD.md (섹션 5 "저장 및 재로드", 성공 기준 전체)
- docs/plan/animated-gif-support/architecture.md (섹션 5 "저장 및 재로드")
- src/hooks/useFabricCanvas.js (전체 — `resolveObjectAssetReference`, `resolveCanvasAssetReferences`, `EXTRA_SERIALIZED_PROPS`, step 2에서 추가한 렌더 루프 생명주기/register 로직)
- src/fabric/AnimatedGif.js (step 1 산출물 — `fromObject`)
- src/fabric/sharedGifRenderLoop.js (step 2 산출물)
- src/hooks/useCanvasBackground.test.js, src/hooks/canvasAssetPlacement.test.js (재로드 관련 테스트 작성 시 참고할 기존 jsdom/IndexedDB 우회 패턴)

## 작업

이 step은 마무리 단계다 — step0~3으로 이미 GIF 등록·재생·배치는 동작하는 상태이며, 여기서는 "저장 후 새로고침해도 애니메이션이 유지된다"(PRD 성공 기준)를 실제로 검증하고 남은 빈틈을 채운다.

### resolveObjectAssetReference 분기 확인/수정

`useFabricCanvas.js`의 `resolveObjectAssetReference(object)`를 확인한다:

- 현재 로직은 `object.assetId`가 있으면 무조건 `getAsset` 후 `src`를 채운다. `object.type === 'AnimatedGif'`인 경우 이 함수가 `src`를 채워도 무해한지(어차피 `AnimatedGif.fromObject`가 별도로 `assetId`를 이용해 프레임을 재구성하므로 `src` 필드는 무시될 뿐인지), 아니면 불필요한 `getAsset` 중복 호출·에러 가능성이 있는지 먼저 코드를 읽고 판단한다.
- 중복 호출이 무해하다고 판단되면 그대로 두고 그 판단 근거를 리포트에 남긴다. 문제가 있다면(예: `AnimatedGif` 대상일 때 이 함수가 별도로 `getAsset`을 호출하는 것이 낭비이거나, `src`를 채운 결과가 `fromObject`와 충돌) `type === 'AnimatedGif'`인 오브젝트는 이 함수에서 건드리지 않고 원본 그대로 통과시키는 한 줄 분기를 추가한다.

### loadFromJSON 이후 렌더 루프 등록 확인

- step2에서 이미 `object:added` 이벤트로 register하는 경우, `loadFromJSON`으로 복원된 오브젝트에도 이 이벤트가 발생하는지 실제로 확인한다(Fabric.js 소스나 실행 테스트로). 발생한다면 이 step에서 추가 작업 불필요 — 그 사실을 테스트로 고정한다.
- 발생하지 않는다면, `options.onLoaded` 콜백 시점(`useFabricCanvas.js`에서 이미 있는 훅)에서 `fabricCanvas.getObjects()`를 순회해 `AnimatedGif` 인스턴스를 모두 렌더 루프에 register하는 코드를 추가한다.

### 저장 데이터 크기 확인

- `fabricCanvas.toObject(EXTRA_SERIALIZED_PROPS)` 결과에 `AnimatedGif` 오브젝트의 `frames`(디코딩된 캔버스 배열)가 포함되지 않는지 실제로 직렬화해 확인한다(ADR-3 — `customProperties`에 `frames`를 넣지 않았으므로 포함되지 않아야 정상이지만, step1의 구현이 의도대로 됐는지 여기서 최종 검증).

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 통합 테스트(`useFabricCanvas.test.js` 또는 별도 파일): 애니메이션 GIF 오브젝트를 추가한 캔버스를 `toObject`로 직렬화 → 새 `useFabricCanvas` 인스턴스(또는 새 `Canvas` + `loadFromJSON`)에 그 JSON을 로드 → 복원된 오브젝트가 `AnimatedGif`의 인스턴스이고 `frames.length >= 2`이며 렌더 루프에 등록되어 있는지(예: 루프의 내부 상태를 확인할 수 있는 테스트용 접근자가 필요하면 `sharedGifRenderLoop`에 최소한의 조회 기능을 추가해도 된다 — 단 프로덕션 로직을 바꾸지 않는 선에서).
- 직렬화 결과 JSON 문자열에 `frames`라는 키가 포함되지 않는지 확인하는 테스트.
- `resolveObjectAssetReference`에 분기를 추가했다면 그 분기에 대한 단위 테스트, 추가하지 않았다면(무해 판단) 기존 테스트가 `AnimatedGif` 케이스에서도 깨지지 않는 것으로 충분.

## 금지
- `EXTRA_SERIALIZED_PROPS` 배열에 `AnimatedGif`의 커스텀 필드(`frameDelays`, `currentFrameIndex` 등)를 추가하지 마라. 이유: architecture.md가 명시 — 이 필드들은 `AnimatedGif.customProperties`를 통한 Fabric 표준 경로로 이미 직렬화되며, `EXTRA_SERIALIZED_PROPS`는 이 클래스와 무관한 별도 메커니즘(배경 태그 등 일반 오브젝트 속성용)이라 여기 섞으면 책임이 흐려진다.
- `frames`(디코딩된 프레임 배열)를 직렬화에 포함시키는 방향으로 우회하지 마라. 이유: ADR-3의 핵심 결정 — 저장 용량과 기존 "참조만 저장" 원칙을 지키기 위함. 재로드 시 재디코딩 비용은 의도된 트레이드오프다.
