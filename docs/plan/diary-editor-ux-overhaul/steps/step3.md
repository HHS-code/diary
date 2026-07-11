# Step 3: button-icons

## 읽을 파일
- docs/plan/diary-editor-ux-overhaul/PRD.md (섹션 3 + "원칙")
- docs/plan/diary-editor-ux-overhaul/architecture.md (섹션 4)
- src/components/ObjectToolbar/ObjectToolbar.jsx (step 2 산출물)
- src/components/ImageUploadButton/ImageUploadButton.jsx
- src/components/TextMemoButton/TextMemoButton.jsx
- src/components/ExportImportControls/ExportImportControls.jsx
- src/components/CanvasBackgroundControl/CanvasBackgroundControl.jsx (step 1 산출물)

## 작업

- `react-icons`는 이미 설치되어 있다 (package.json 확인) — npm install을 다시 실행할 필요 없다.
- `react-icons/md`(Material) 또는 `react-icons/fi`(Feather) 중 한 세트로 통일해 다음 버튼에 아이콘을 적용한다:
  - ObjectToolbar: 복사(MdContentCopy 류), 삭제(MdDelete 류), 맨앞(MdFlipToFront 류), 맨뒤(MdFlipToBack 류), 한칸앞/한칸뒤(MdKeyboardArrowUp/Down 류)
  - ImageUploadButton: 이미지 추가(MdImage/MdAddPhotoAlternate 류)
  - TextMemoButton: 텍스트 추가(MdTextFields 류)
  - ExportImportControls: JSON 내보내기(MdFileDownload 류), JSON 불러오기(MdFileUpload 류), PNG 내보내기(MdPhotoCamera/MdImage 류 중 구분되는 것)
  - CanvasBackgroundControl: 배경색(MdPalette 류), 배경 이미지(MdWallpaper 류)
- 아이콘+짧은 텍스트 병기를 기본으로 한다 (아이콘만 있으면 의미 전달이 안 될 수 있음). 버튼이 좁은 ObjectToolbar는 아이콘만 + `title`/`aria-label` 속성.
- 각 버튼의 `onClick` 핸들러와 컴포넌트 로직은 절대 변경하지 않는다 — JSX 라벨 부분만 교체.
- 아이콘 크기는 16~20px 수준으로 버튼 크기와 조화되게.

## AC
- `npm run lint` && `npm run build` && `npm run test` 통과
- 자가 점검: 수정한 파일들에서 onClick 핸들러 로직이 diff상 변하지 않았는지 확인해 리포트에 기록.

## 금지
- 아이콘 라이브러리를 두 세트 이상 섞어 쓰지 마라. 이유: 시각적 일관성.
- 버튼의 onClick·비즈니스 로직을 수정하지 마라. 이유: UI/로직 분리 원칙, 이 step은 라벨 교체만.
- design.md의 버튼 색상/보더 스타일을 변경하지 마라. 이유: 스타일 스펙은 확정되어 있다.
