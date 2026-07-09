# Step 2: sticker-palette

## 읽을 파일
- `docs/plan/diary-app/PRD.md` — "기본 이모지 스티커 팔레트"
- `src/components/DiaryCanvas/DiaryCanvas.jsx`, `src/hooks/useFabricCanvas.js` (step 1 산출물)

## 작업

`src/components/StickerPalette/StickerPalette.jsx`를 만든다.

- 고정된 이모지 목록(예: 20~30개 정도, 다이어리 꾸미기에 흔히 쓰는 하트/별/꽃/동물/음식 등 카테고리 섞어서)을 그리드로 보여준다.
- 이모지를 클릭하면 현재 열려 있는 `DiaryCanvas`의 캔버스 중앙(또는 약간 랜덤한 위치 — 매번 같은 자리에 겹치지 않도록)에 해당 이모지를 텍스트 오브젝트(`fabric.FabricText` 등, 이모지는 유니코드 텍스트로 렌더링)로 추가한다. 추가된 오브젝트는 Fabric 기본 컨트롤로 이동·크기조절·회전이 즉시 가능해야 한다 (step 1에서 만든 훅의 오브젝트 추가 기능을 재사용).
- `DiaryCanvas.jsx`에 `StickerPalette`를 배치하고, step 1에서 임시로 넣었던 "테스트용 네모 추가" 버튼은 제거한다.

## AC

- `npm run build`가 에러 없이 성공한다.
- 브라우저에서: 스티커 팔레트의 이모지를 클릭하면 캔버스에 이모지가 추가되고, 여러 번 클릭하면 매번 새 오브젝트가 추가되며, 각각 독립적으로 이동·크기조절·회전이 가능하다.

## 금지
- 이미지 업로드 기능을 만들지 마라. 이유: step 3의 범위.
- 이모지를 `<img>` 스프라이트나 별도 이미지 파일로 만들지 마라. 이유: 유니코드 텍스트 렌더링이 가장 단순하고 파일 관리가 필요 없다 — 불필요한 에셋 관리 추가 금지(CLAUDE.md 단순함 우선).
