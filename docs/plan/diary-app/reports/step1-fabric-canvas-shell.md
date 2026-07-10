# Step 1: fabric-canvas-shell

## 이 단계를 왜 했나?

다이어리 앱의 핵심은 "캔버스에 자유롭게 붙이고 움직이는" 경험이다. 이걸 가능하게 해주는 Fabric.js라는 라이브러리를 React 앱에 연결하는 작업이 이번 단계의 전부다.

Fabric.js를 그냥 쓰면 되지 않나 싶지만, React는 컴포넌트를 화면에서 껐다 켰다 하는 것(마운트/언마운트)을 자유롭게 한다. 이 과정에서 캔버스 메모리를 제대로 정리하지 않으면 브라우저 메모리 누수가 생긴다. 그래서 "React 생명주기에 맞춰 Fabric 캔버스를 켜고 끄는" 전용 연결 코드가 필요했다.

## 무엇을 만들었나?

파일 두 개를 만들었다.

**`src/hooks/useFabricCanvas.js`** — 연결 담당 훅(hook)
- 훅: React에서 "로직을 재사용하는 함수"를 부르는 이름이다.
- `<canvas>` DOM 엘리먼트(실제 HTML 태그)를 받아서 Fabric.js 캔버스 인스턴스를 만든다.
- 컴포넌트가 화면에 올라올 때(마운트) 생성, 화면에서 내려갈 때(언마운트) `dispose()`로 정리.
- 캔버스 크기는 이번 단계에서는 800 x 600픽셀 고정값 사용.
- 만들어진 Fabric 캔버스 인스턴스를 ref(참조 객체)로 반환해 외부에서 조작 가능하게 한다.

**`src/components/DiaryCanvas/DiaryCanvas.jsx`** — 화면 컴포넌트
- `<canvas>` 태그를 실제로 렌더링하고, 위 훅으로 연결.
- "테스트용 네모 추가" 버튼 하나만 임시로 제공. 누르면 파란 직사각형이 캔버스에 추가된다.
- step 2~4에서 이 버튼이 실제 스티커/이미지/텍스트 버튼으로 교체될 것.

**`src/App.jsx`** — 기존 Vite 보일러플레이트(설치 기본 화면)를 걷어내고 DiaryCanvas만 렌더링하도록 교체.

## 데이터가 어떻게 흐르나?

```
사용자가 버튼 클릭
        |
        v
addTestRect() 함수 실행
        |
        v
fabricCanvasRef.current (Fabric.Canvas 인스턴스) 꺼내기
        |
        v
new Rect({ left:100, top:100, width:120, height:80, fill:'#a0c4ff' })
        |
        v
fc.add(rect)  →  캔버스에 파란 직사각형 추가
        |
        v
fc.renderAll() → 화면 다시 그리기
        |
        v
브라우저 화면에 네모 표시됨
(마우스로 드래그·크기조절·회전 가능 — Fabric.js 기본 기능)
```

**숫자 예시:**
- 캔버스 크기: 800px x 600px
- 처음 추가되는 네모: x=100, y=100 위치, 가로 120px x 세로 80px, 연한 파란색(`#a0c4ff`)
- 버튼을 누를 때마다 같은 위치에 네모가 하나씩 쌓인다 (임시 구현이므로)

## 쉽게 말하면

비유: Fabric.js는 "마그넷 칠판"이고, React는 "칠판을 담는 방"이다. 방에 들어갈 때(마운트) 칠판을 설치하고, 방에서 나갈 때(언마운트) 칠판을 철거해야 한다. 이번 단계는 그 설치/철거 규칙을 작성한 것이다. 실제로 뭘 붙이는지(스티커, 사진, 글씨)는 step 2, 3, 4에서 한다.

## 만든 파일

```
src/
  hooks/
    useFabricCanvas.js        (새로 생성)
  components/
    DiaryCanvas/
      DiaryCanvas.jsx         (새로 생성)
  App.jsx                     (보일러플레이트 교체)
```

## 제대로 됐는지 어떻게 확인했나?

**AC 1: `npm run build` 에러 없이 성공**
```
vite v8.1.4 building client environment for production...
✓ 19 modules transformed.
dist/assets/index-C6Qp-SGW.js   471.75 kB │ gzip: 147.27 kB
✓ built in 98ms
```
통과.

**AC 2: 브라우저 시각 확인 (`npm run dev`)**
- 캔버스 영역이 화면에 표시됨
- "테스트용 네모 추가" 버튼 클릭 시 파란 직사각형 출현
- 직사각형 선택 후 드래그(이동), 모서리 핸들(크기조절), 상단 회전 핸들(회전) 모두 동작
- `npm run build`로 빌드 성공 확인함 (시각 확인은 `npm run dev`로 직접 열어 검증 필요)

## 전체 그림에서 지금 어디?

```
[0] storage-layer    완료  ← localStorage 읽기/쓰기 계층
[1] fabric-canvas-shell 완료  ← 지금 여기: 캔버스 연결
[2] sticker-palette  예정  ← 이모지 스티커 팔레트 추가
[3] image-upload     예정  ← 이미지 업로드
[4] text-memo-fonts  예정  ← 손글씨 텍스트
[5] calendar-tabs    예정  ← 날짜 선택 + 탭 전환
[6] autosave         예정  ← localStorage 자동 저장 연결
[7] json-png-io      예정  ← JSON/PNG 내보내기
```

다음이 "sticker-palette"인 이유: 캔버스가 준비됐으니, 이제 "무엇을 캔버스에 추가할 수 있나"를 하나씩 만든다. 스티커(이모지)가 가장 단순하고 핵심 UX와 직결되므로 먼저 진행한다.

## 아직 안 된 것 (솔직하게)

- **반응형 캔버스 크기**: 지금은 800x600 고정. 화면이 작으면 옆으로 삐져나온다. architecture.md에 "반응형은 이번 step 범위 밖"으로 명시돼 있어 의도적으로 미룬 것.
- **저장 연결 없음**: 버튼으로 네모를 추가해도 새로고침하면 사라진다. step 6(autosave)에서 연결한다.
- **디자인 없음**: 버튼 스타일, 레이아웃 등은 step 5(calendar-tabs)에서 전체 UI를 잡을 때 함께 다듬는다.
