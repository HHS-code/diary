# Step 0: desktop-assets

## 읽을 파일
- `docs/plan/desktop-ui/PRD.md` — "아이콘 에셋 정리" 항목
- `docs/plan/desktop-ui/architecture.md` — "에셋 파이프라인" 섹션
- `CLAUDE.md` (레포 루트) — 코딩 규칙

## 작업

reference 폴더의 이미지 4개를 `src/assets`로 복사하고, 이를 한 파일에서 모아 export하는 `src/assets/icons.js`를 만든다.

복사 (파일명은 정확히 아래대로):
- `reference/Bliss_(Windows_XP).png` → `src/assets/wallpaper.png`
- `reference/pngwing.com (2).png` → `src/assets/diary-icon.png`
- `reference/powerbutton.png` → `src/assets/power-button.png`
- `reference/save_button.png` → `src/assets/download-icon.png`

이미지는 바이너리이므로 텍스트 편집 도구로 내용을 만지지 말고, 파일 복사 명령(`cp`/PowerShell `Copy-Item` 등)으로 그대로 복사한다.

`src/assets/icons.js` 생성 — 4개 이미지를 import해 이름 붙여 export만 한다:

```js
import wallpaper from './wallpaper.png'
import diaryIcon from './diary-icon.png'
import powerButtonIcon from './power-button.png'
import downloadIcon from './download-icon.png'

export { wallpaper, diaryIcon, powerButtonIcon, downloadIcon }
```

이 step에서는 아직 아무 컴포넌트도 `icons.js`를 사용하지 않는다 (이후 step들이 가져다 쓴다).

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다 (경고는 허용).
- `src/assets/wallpaper.png`, `src/assets/diary-icon.png`, `src/assets/power-button.png`, `src/assets/download-icon.png`, `src/assets/icons.js` 5개 파일이 모두 존재한다.

## 금지
- reference 폴더의 다른 이미지(Windows XP 스크린샷, 노트북/종이 pngwing, images.png 등)는 복사하지 마라. 이유: PRD In-scope에 명시된 4개 이미지 외에는 사용하지 않는다.
- `icons.js` 외의 곳에서 이 4개 이미지 파일을 직접 import하지 마라. 이유: "아이콘은 한 파일에 모아둔다"는 합의 — icons.js가 유일한 창구.
