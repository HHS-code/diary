# ADR — 애니메이션 GIF 지원 주요 결정

## ADR-1. GIF 프레임 디코딩에 경량 라이브러리(gifuct-js) 사용

**맥락**: 애니메이션 GIF를 캔버스에서 재생하려면 GIF 바이너리에서 프레임 이미지와 각 프레임의 표시 시간(delay)을 추출해야 한다. GIF 파싱은 직접 구현하기엔 스펙이 복잡하다(LZW 압축, 프레임 간 diff, disposal method 등).

**선택지**:
- (A) `gifuct-js` 등 경량 파싱 라이브러리로 프레임 배열 추출
- (B) 브라우저 `<img>` 네이티브 재생을 DOM 오버레이로 캔버스 위에 겹쳐 위치만 동기화

**결정**: (A) 경량 라이브러리로 프레임 추출.

**결과(트레이드오프)**: 프레임을 직접 제어할 수 있어 Fabric 오브젝트의 표준 렌더 파이프라인(`_render`)에 자연스럽게 통합되고, 회전·크기조절 등 캔버스 변환이 그대로 적용된다. 대신 신규 의존성이 추가되고, GIF 파싱·디코딩 비용을 초기 로드 시 한 번 감수해야 한다. (B)는 라이브러리가 불필요하지만 DOM 엘리먼트와 캔버스 좌표계(줌, 회전, 다중선택)를 매 프레임 동기화해야 해서 복잡도가 더 크고 PNG export와의 호환도 깨진다.

## ADR-2. 커스텀 Fabric 오브젝트는 FabricImage를 상속

**맥락**: 애니메이션 GIF를 Fabric 캔버스의 표준 오브젝트(회전/크기조절/이동/ActiveSelection/직렬화)로 다루려면 Fabric.js의 클래스 체계에 맞는 커스텀 오브젝트 클래스가 필요하다.

**선택지**:
- (A) `FabricImage`를 상속해 `_render()`만 오버라이드(현재 프레임을 `_element`로 교체 후 부모 렌더 재사용)
- (B) `FabricObject`(베이스 클래스)를 직접 상속해 이미지 관련 로직(크롭, 스케일, 캐싱)을 처음부터 구현

**결정**: (A) `FabricImage` 상속.

**결과(트레이드오프)**: 이미지 특유의 크롭·스케일·캐싱 로직을 재사용하고, 기존 `canvasAssetPlacement.js`/`ImageUploadButton`의 스케일 다운 로직과 동일한 방식으로 다룰 수 있다. 대신 `FabricImage`의 내부 구현(특히 `_element` 필드 재활용)에 의존하게 되어, 향후 Fabric.js 메이저 업그레이드 시 이 부분을 다시 검증해야 한다.

## ADR-3. 직렬화는 assetId 참조만 저장, 프레임 배열은 저장하지 않음

**맥락**: 애니메이션 GIF 오브젝트를 캔버스 JSON으로 저장할 때, 디코딩된 프레임 배열(이미지 데이터)을 그대로 포함시킬지, 원본 GIF에 대한 참조만 저장할지 정해야 한다.

**선택지**:
- (A) `assetId`(IndexedDB 참조)만 직렬화에 포함, 재로드 시 원본 GIF를 다시 조회해 프레임을 재파싱
- (B) 디코딩된 프레임 배열(base64 문자열 배열 등)을 직렬화에 통째로 포함

**결정**: (A) `assetId` 참조만 저장.

**결과(트레이드오프)**: `asset-import-pipeline`에서 확립한 "Fabric JSON에는 참조만, 실제 데이터는 IndexedDB"라는 기존 원칙과 일관되고, 저장 용량도 작다. 대신 재로드 시 매번 GIF를 다시 파싱해야 하므로 프레임 수·해상도가 큰 GIF는 로딩 지연이 생길 수 있다 — 이번 phase는 이 지연을 별도로 최적화하지 않는다(ADR-5).

## ADR-4. 공유 렌더 루프로 다수 GIF 동시 재생 성능 확보

**맥락**: 각 애니메이션 GIF 오브젝트가 독립적으로 자체 `requestAnimationFrame` 루프를 돌며 프레임을 갱신하고 `canvas.renderAll()`을 호출하면, GIF 개수가 늘어날수록 캔버스 전체가 다시 그려지는 빈도가 선형으로 증가해 다른 오브젝트 조작이 끊기는 병목이 생긴다.

**선택지**:
- (A) 캔버스당 공유 `requestAnimationFrame` 루프 하나로 모든 애니메이션 GIF의 프레임 갱신을 관리하고, `renderAll()`은 틱당 최대 1회만 호출
- (B) GIF마다 독립 루프를 두되 동시 재생 개수에 상한을 둠

**결정**: (A) 공유 렌더 루프.

**결과(트레이드오프)**: `renderAll()` 호출 빈도가 GIF 개수와 무관하게 고정되어 별도의 개수 제한 없이 성능을 구조적으로 보장한다. 대신 캔버스 인스턴스마다 이 공유 루프를 생성·해제하는 생명주기 관리가 필요해지고(캔버스 dispose 시 루프도 정리), 개별 GIF의 프레임 전환 타이밍이 공유 루프의 틱 주기(브라우저 프레임레이트, 보통 60fps)에 맞춰 근사되므로 프레임 delay가 매우 짧은 GIF는 밀리초 단위의 오차가 생길 수 있다.

## ADR-5. ImageUploadButton을 assetStorage 경로로 전환

**맥락**: 사이드바의 `ImageUploadButton`은 `asset-import-pipeline`에서 `assetStorage`(IndexedDB) 통합 대상에서 빠져, 여전히 `FileReader.readAsDataURL()`로 base64를 직접 Fabric 오브젝트에 넣는다. `assetId`가 없어 재로드 시 GIF를 다시 조회할 참조가 없다.

**선택지**:
- (A) `ImageUploadButton`도 `saveAsset`으로 IndexedDB에 저장하고 `assetId`를 부여하도록 전환(GIF뿐 아니라 이 버튼의 모든 이미지에 적용)
- (B) `ImageUploadButton`에만 GIF 전용 분기를 추가해 GIF일 때만 IndexedDB를 거치고, 나머지 이미지는 기존 base64 경로 유지

**결정**: (A) 버튼 전체를 assetStorage 경로로 전환.

**결과(트레이드오프)**: `canvasAssetPlacement.js`와 동일한 패턴으로 통일되어 코드 중복과 분기가 줄고, 이 버튼으로 올리는 이미지도 더 이상 캔버스 JSON을 base64로 부풀리지 않는 부수 효과가 있다. 대신 이 phase의 범위가 GIF 전용 처리를 넘어 `ImageUploadButton`의 기존 동작(모든 이미지 업로드) 자체를 변경하게 되어, 회귀 없이 동작하는지 이 버튼의 기존 테스트를 함께 확인해야 한다.
