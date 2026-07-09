# Step 1: fabric-canvas-shell

## 읽을 파일
- `docs/plan/diary-app/architecture.md` — "핵심 흐름" 3번(캔버스 편집), "모듈 경계"의 `hooks/useFabricCanvas.js` 설명
- `src/storage/diaryStorage.js` (step 0 산출물 — 이 step에서는 아직 연결하지 않아도 됨)
- `CLAUDE.md`

## 작업

`src/hooks/useFabricCanvas.js` 커스텀 훅과, 그것을 사용하는 `src/components/DiaryCanvas/DiaryCanvas.jsx`를 만든다.

`useFabricCanvas(canvasElementRef)`:
- `<canvas>` DOM 엘리먼트 ref를 받아 `fabric.Canvas` 인스턴스를 생성하고, 컴포넌트 언마운트 시 `dispose()`로 정리한다.
- 생성된 Fabric canvas 인스턴스(또는 이를 조작하는 몇 개 함수)를 반환해 상위 컴포넌트가 오브젝트를 추가/조작할 수 있게 한다.
- 캔버스 크기는 고정값으로 시작해도 된다 (예: 800x600) — 반응형 크기조절은 이번 step 범위 밖.

`DiaryCanvas.jsx`:
- `<canvas>` 엘리먼트를 렌더링하고 `useFabricCanvas`로 연결한다.
- 이 step에서는 스티커/이미지/텍스트 추가 UI는 아직 없다. 대신 "테스트용 네모 추가" 버튼 하나만 임시로 두어, Fabric 오브젝트가 캔버스에 추가되고 마우스로 이동·크기조절·회전이 되는지 눈으로 확인할 수 있게 한다 (이 버튼은 step 2~4에서 실제 스티커/이미지/텍스트 추가 버튼으로 대체될 것이므로 지금은 최소 구현으로 둔다).
- `App.jsx`에서 `DiaryCanvas`를 렌더링하도록 연결한다 (기존 Vite 보일러플레이트 JSX를 걷어내고 교체).

## AC

- `npm run build`가 에러 없이 성공한다.
- `npm run dev`로 브라우저에서 열었을 때: 캔버스가 보이고, "테스트용 네모 추가" 버튼을 누르면 네모가 나타나며, 그 네모를 드래그로 이동·모서리 핸들로 크기조절·회전 핸들로 회전할 수 있다.

## 금지
- `storage/diaryStorage.js`를 이 step에서 연결하지 마라(자동저장은 step 6). 이유: step 범위를 좁게 유지해 한 번에 한 레이어만 바꾼다.
- 스티커 팔레트·이미지 업로드·텍스트 추가 UI를 만들지 마라. 이유: 각각 step 2, 3, 4의 범위다.
- react-fabric 같은 서드파티 React 바인딩 라이브러리를 새로 설치하지 마라. 이유: architecture.md에서 커스텀 훅으로 감싸기로 이미 결정됨(ADR 성격의 합의).
