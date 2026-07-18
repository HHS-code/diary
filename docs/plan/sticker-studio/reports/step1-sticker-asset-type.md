# Step 1: sticker-asset-type

## 이 단계를 왜 했나?

지금까지 다이어리에는 이미지("image")와 폰트("font"), 딱 두 종류의 파일만 저장할 수 있는 창고(`assetStorage` — 브라우저 안에 파일을 저장하는 저장소, "IndexedDB"라는 브라우저 내장 데이터베이스를 씀)가 있었다. 이 창고는 파일마다 "이건 이미지야", "이건 폰트야" 하는 꼬리표(`type`)를 붙여서 관리한다.

앞으로 만들 스티커 스튜디오는 사용자가 그린 그림이나 편집한 사진을 "스티커"라는 완성품으로 저장해야 한다. 그런데 창고에는 아직 "스티커"라는 꼬리표가 없었다. 이번 단계는 창고에 "sticker"라는 세 번째 꼬리표를 새로 등록하는 작업이다.

## 무엇을 만들었나?

두 가지를 고쳤다.

첫째, 창고 자체(`assetStorage.js`)가 "sticker" 꼬리표를 이미지·폰트와 동등하게 받아들이도록 정의를 넓혔다. 실제로는 창고의 저장·조회 코드는 애초에 꼬리표 값이 무엇이든 상관없이 그대로 저장하고 그대로 걸러내는 방식으로 짜여 있었기 때문에, 동작 코드는 손댈 게 없었다. 다만 "이 창고는 image 아니면 font만 받는다"고 적어둔 문서(타입 주석)가 코드에 남아있어서, 그 문서를 "image, font, sticker 셋 중 하나"로 고쳤다. 이 문서가 실제로 거짓말이 아니게 됐는지, 진짜로 sticker를 넣고 빼는 테스트로 확인했다.

둘째, 창고를 다루는 관리 담당(`useAssetLibrary`라는 리액트 훅 — 화면이 창고 상태를 손쉽게 가져다 쓰게 해주는 코드 조각)에 스티커 전용 창구를 새로 열었다.

- `stickers`: 지금까지 저장된 스티커 목록. 기존에 있던 `images`(이미지 목록), `fonts`(폰트 목록)와 나란히 관리된다.
- `registerSticker(blob, filename)`: 완성된 스티커를 창고에 등록하는 함수. 이미지·폰트를 등록하는 기존 함수들(`registerImage`, `registerFont`)은 사용자가 파일 선택 창에서 고른 파일(`File`)을 받는 반면, 이 함수는 스티커 스튜디오가 캔버스를 그림 파일로 구워낸 결과물(`Blob` — 파일과 비슷하지만 이름이 없는 순수 데이터 덩어리)을 받는다는 점이 다르다. 스티커는 사람이 파일을 고르는 게 아니라, "완성" 버튼을 눌렀을 때 프로그램이 알아서 만들어 저장하기 때문이다.

## 데이터가 어떻게 흐르나?

```
[창고: assetStorage]
  saveAsset({ type: 'sticker', filename, mimeType, blob })
     → IndexedDB에 { id, type: 'sticker', filename, mimeType, blob, createdAt } 저장

  listAssets('sticker')
     → 창고에 있는 모든 항목 중 type === 'sticker'인 것만 골라서 반환
     (image, font 항목은 섞이지 않음 — 꼬리표로 정확히 구분됨)

[관리 담당: useAssetLibrary]
  화면이 열리면:
     listAssets('image'), listAssets('font'), listAssets('sticker') 를 동시에 조회
       → images, fonts, stickers 세 상태로 각각 채워짐

  (다음 단계 이후) 스티커 스튜디오가 "완성" 버튼을 누르면:
     registerSticker(pngBlob, '스티커.png')
       → saveAsset({ type: 'sticker', filename: '스티커.png', mimeType: 'image/png', blob: pngBlob })
       → 저장 후 목록 새로고침 → stickers 상태에 새 항목 추가
```

숫자 예시: 이번 테스트에서는 이미지 하나("a.png")와 스티커 하나("my-sticker.png")를 창고에 넣고, `listAssets('sticker')`를 호출하면 스티커 1개만, `listAssets('image')`를 호출하면 이미지 1개만, `listAssets('font')`를 호출하면 0개가 나오는 것을 확인했다.

## 쉽게 말하면

창고에 "이미지 칸", "폰트 칸" 두 칸만 있던 선반에 "스티커 칸"을 하나 더 만든 것과 같다. 선반 자체의 구조(칸을 나누는 방식)는 이미 "칸 이름표만 보고 물건을 넣고 빼는" 방식이라 새 칸을 추가하는 데 리모델링이 필요 없었다. 다만 선반 앞에 붙어있던 안내판("이 선반은 이미지, 폰트만 취급합니다")을 "이미지, 폰트, 스티커 취급합니다"로 바꿔 붙였다. 그리고 창고지기(관리 담당)에게 "스티커도 받아서 정리해 둬"라고 새 업무를 하나 준 것이다.

## 만든 파일

- `src/storage/assetStorage.js` — 타입 주석만 `"image" | "font"` → `"image" | "font" | "sticker"`로 확장 (동작 코드는 변경 없음)
- `src/storage/assetStorage.test.js` — sticker 타입 저장/조회가 image/font와 섞이지 않는지 확인하는 테스트 추가
- `src/hooks/useAssetLibrary.js` — `stickers` 상태와 `registerSticker(blob, filename)` 함수 추가
- `src/hooks/useAssetLibrary.test.jsx` — `registerSticker` 호출 시 `stickers`에 반영되고 `images`/`fonts`는 그대로인지 확인하는 테스트 추가

## 제대로 됐는지 어떻게 확인했나?

- `npm run lint`: 통과 (경고 없음)
- `npm run build`: 통과 (정상 빌드됨)
- `npm run test`: 전체 25개 테스트 파일, 153개 테스트 모두 통과
  - 신규 테스트 2개 모두 통과:
    - 창고에 sticker/image를 각각 저장한 뒤 `listAssets`로 조회하면 꼬리표별로 정확히 분리되어 나오는지
    - `registerSticker`로 등록한 스티커가 `stickers` 상태에 들어가고, `images`/`fonts` 상태는 영향받지 않는지
  - 기존 image/font 관련 테스트(창고 4개, 관리 담당 3개)가 수정 없이 그대로 통과 — 이번 변경이 기존 동작을 조금도 건드리지 않았다는 뜻

## 전체 그림에서 지금 어디?

```
[0] canvas-size-param        <- 완료
[1] sticker-asset-type       <- 지금 여기 (완료)
[2] sticker-studio-shell
[3] sticker-image-upload-crop
[4] sticker-lasso-cutout
[5] sticker-outline
[6] sticker-save-and-reuse
```

이번 단계는 스티커를 "어디에, 어떤 이름표를 붙여 저장할지"를 창고 쪽에서 미리 준비해 둔 것이다. 화면(스티커 스튜디오 자체)은 아직 없다. 다음 단계(`sticker-studio-shell`)에서 데스크톱에 아이콘이 생기고 실제로 그림을 그릴 수 있는 빈 창이 열린다 — 그 창이 나중에(6단계) "완성" 버튼을 누르면, 이번에 만든 `registerSticker`를 호출해 이 창고에 저장하게 된다.

## 아직 안 된 것 (솔직하게)

- 스티커 스튜디오 화면 자체는 전혀 만들지 않았다. 아이콘도, 창도, 그리기 기능도 없다. 이번 단계는 오직 "완성된 스티커를 저장할 자리"만 창고 쪽에 마련한 것이다.
- 다이어리 화면(`AssetImportPanel`)에서 저장된 스티커 목록을 실제로 보여주는 기능은 아직 없다. `stickers` 상태는 만들어졌지만 화면에 연결하는 작업은 마지막 단계(`sticker-save-and-reuse`)에서 한다.
- 사용자가 PNG 파일을 직접 선택해서 "스티커"로 등록하는 경로는 의도적으로 만들지 않았다. 스티커는 항상 스티커 스튜디오가 완성 시점에 자동으로 등록하는 것이지, 사람이 파일을 골라 올리는 방식이 아니다.
