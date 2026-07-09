# Step 3: 이미지 업로드

## 이 단계를 왜 했나?

PRD에서 "사용자 이미지 업로드 → 캔버스에 스티커처럼 배치"와 "사진 업로드 → 캔버스에 배치"를 요구한다. 이 두 가지는 동작이 동일하다. 파일을 고르면 캔버스에 이미지 오브젝트로 추가되고, 그다음부터는 이동·크기조절·회전이 자유롭게 된다.

Step 2에서 이모지 스티커를 추가하는 팔레트를 만들었으니, 같은 캔버스에 실제 이미지 파일도 올릴 수 있어야 다이어리로서 의미가 생긴다.

## 무엇을 만들었나?

`ImageUploadButton` 컴포넌트 하나를 새로 만들었다. 역할은 세 가지다:

1. "이미지 추가" 버튼을 화면에 보여준다.
2. 버튼을 클릭하면 운영체제 파일 선택 창이 열린다.
3. 파일을 고르면 그 이미지를 캔버스에 올린다. 이미지가 캔버스보다 크면 캔버스 안에 딱 맞게 줄여서 중앙에 놓는다.

기존 `DiaryCanvas`의 왼쪽 패널(이모지 팔레트 아래)에 버튼을 붙였다.

## 데이터가 어떻게 흐르나?

```
[사용자가 "이미지 추가" 클릭]
        |
        v
  <input type="file"> 파일 선택 창 열림
        |
[JPG/PNG 파일 선택]
        |
        v
  FileReader.readAsDataURL(file)
  -- 파일을 브라우저 메모리 안에서 읽는다 (서버 전송 없음)
        |
        v
  Data URL 생성
  예: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        |  (원본 2000px 이미지라면 수백 KB 길이의 문자열)
        v
  FabricImage.fromURL(dataUrl)
  -- Fabric.js가 이 문자열로 이미지 오브젝트를 만든다
        |
        v
  스케일 계산:
    scaleX = 800 / 2000 = 0.4
    scaleY = 600 / 1500 = 0.4
    최종 scale = min(0.4, 0.4, 1) = 0.4
  결과: 2000x1500 -> 800x600 (캔버스 꽉 채움)
        |
        v
  캔버스 중앙 배치:
    left = (800 - 800) / 2 = 0
    top  = (600 - 600) / 2 = 0
        |
        v
  canvas.add(img) → 화면에 나타남
  이후 드래그·핀치·회전은 Fabric.js 기본 컨트롤
```

숫자 예시:
- 200x150 이미지 → scale = min(800/200, 600/150, 1) = min(4, 4, 1) = **1** (작은 이미지는 원본 크기 유지)
- 3000x2000 이미지 → scale = min(800/3000, 600/2000, 1) = min(0.267, 0.3, 1) = **0.267** (800x533으로 축소)

## 쉽게 말하면

사진관에서 인화한 사진을 스크랩북 페이지에 올려놓는 것과 같다. 사진이 너무 크면 페이지 크기에 맞게 줄여서 붙이고, 작은 사진은 원래 크기 그대로 붙인다. 붙인 다음에는 손으로 옮기거나 모서리를 잡아 늘리거나 돌릴 수 있다.

## 만든 파일

```
변경:
  src/components/DiaryCanvas/DiaryCanvas.jsx
    — ImageUploadButton import 추가
    — 왼쪽 패널을 column 방향 flex로 바꾸고 버튼 배치

신규:
  src/components/ImageUploadButton/ImageUploadButton.jsx
    — 핵심 공개 함수: ImageUploadButton({ fabricCanvasRef })
    — 내부 함수: addImageToCanvas(dataUrl), handleFileChange(event)
```

## 제대로 됐는지 어떻게 확인했나?

AC 항목별 결과:

| 항목 | 결과 |
|------|------|
| `npm run build` 에러 없이 성공 | 통과 — 473 kB, 빌드 95ms |
| JPG/PNG 선택 시 캔버스에 이미지 나타남 | 코드 경로 확인 완료 (FileReader → FabricImage.fromURL → canvas.add) |
| 이동·크기조절·회전 가능 | Fabric.js 기본 오브젝트 동작 — selectable: true 기본값 |
| 2000px 이상 이미지 업로드 시 캔버스 안에서 합리적 크기로 시작 | scale = min(800/w, 600/h, 1) 계산으로 캔버스를 벗어나지 않음 |

## 전체 그림에서 지금 어디?

```
[0] storage-layer      완료  -- localStorage 읽기/쓰기
[1] fabric-canvas-shell 완료  -- Fabric 캔버스 초기화
[2] sticker-palette    완료  -- 이모지 스티커 추가
[3] image-upload       완료  -- 이미지 파일 → 캔버스  ← 지금 여기
[4] text-memo-fonts    다음  -- 손글씨 느낌 텍스트 입력
[5] calendar-tabs      미정  -- 날짜별 페이지 + 탭 전환
[6] autosave           미정  -- 변경 시 localStorage 자동 저장
[7] json-png-io        미정  -- JSON 내보내기/불러오기, PNG 저장
```

다음 Step 4(text-memo-fonts)는 이미지 대신 텍스트 오브젝트를 캔버스에 추가한다. 손글씨 느낌 폰트(Google Fonts 등)를 적용해야 하므로 폰트 로딩 시점을 Fabric.js와 맞추는 것이 핵심 과제다.

## 아직 안 된 것 (솔직하게)

- **브라우저 직접 테스트 미실시**: 빌드 성공으로 코드 오류가 없음을 확인했지만, 실제 파일을 선택해 올려보는 시각적 확인은 사람이 직접 `npm run dev`로 실행해야 한다.
- **테스트 코드 없음**: 이 프로젝트에는 테스트 프레임워크(Vitest, Jest 등)가 설정되어 있지 않아 자동화 테스트를 작성하지 못했다. Fabric.js와 FileReader 모두 브라우저 API에 의존하므로 단위 테스트 환경 구성이 별도로 필요하다.
- **같은 파일 재선택**: `event.target.value = ''`로 초기화하지만, 일부 구형 브라우저에서는 동작하지 않을 수 있다. 현재 주요 브라우저에서는 정상 동작한다.
