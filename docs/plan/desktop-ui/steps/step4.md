# Step 4: power-button

## 읽을 파일
- `docs/plan/desktop-ui/PRD.md` — "전원 버튼 → DOWNLOAD" 항목
- `docs/plan/desktop-ui/architecture.md` — "컴포넌트 책임 > PowerButton"
- `src/storage/diaryStorage.js` — `loadAllDiaryData` 시그니처 확인용 (이 파일은 수정하지 않는다)
- `src/components/ExportImportControls/ExportImportControls.jsx` — `handleExportJSON`의 Blob 다운로드 패턴 참고용 (이 파일도 수정하지 않는다)
- `src/assets/icons.js` — step0 산출물. `powerButtonIcon`, `downloadIcon` export 확인

## 작업

`src/components/PowerButton/PowerButton.jsx`를 만든다. Props 없음:
```
PowerButton()
```

- 내부 state로 DOWNLOAD 메뉴의 열림/닫힘(boolean)을 관리한다.
- `icons.js`의 `powerButtonIcon` 이미지를 버튼으로 렌더링. 클릭 시 메뉴 열림 상태를 토글한다.
- 메뉴가 열려 있을 때, 버튼 위(또는 옆)에 플라이아웃 박스를 표시한다. 그 안에 `icons.js`의 `downloadIcon` 이미지 + "DOWNLOAD" 텍스트로 구성된 항목 하나만 둔다.
- 메뉴가 열린 상태에서 그 바깥 영역을 클릭하면 메뉴가 자동으로 닫히도록 처리한다 (예: `document`에 `mousedown`/`click` 리스너를 등록하고 메뉴 DOM 바깥 클릭인지 판별, 언마운트 시 리스너 해제).
- "DOWNLOAD" 항목 클릭 시 실행할 것:
  1. `storage/diaryStorage.js`의 `loadAllDiaryData()`를 호출해 전체 데이터를 읽는다.
  2. `JSON.stringify(data, null, 2)`로 직렬화 후 `Blob`으로 만든다 (`type: 'application/json'`).
  3. `URL.createObjectURL` → 임시 `<a>` 태그의 `href`/`download`에 설정 → `click()` → `URL.revokeObjectURL`로 정리 (`ExportImportControls.jsx`의 `downloadBlob` 패턴과 동일한 방식이되, 코드는 이 컴포넌트 안에 독립적으로 작성한다).
  4. 파일명은 현재 날짜 기준 `diary-backup-YYYY-MM-DD.json` 형식으로 한다.
  5. 다운로드 트리거 후 메뉴를 닫는다.

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다.

## 금지
- `src/storage/diaryStorage.js`나 `src/components/ExportImportControls/ExportImportControls.jsx` 파일 자체를 수정하지 마라. 이유: 기존 로직은 재사용(import해서 호출)만 하고 무변경으로 유지하는 것이 이번 작업 전체의 원칙(UI/기능 분리).
- DOWNLOAD 외의 다른 메뉴 항목(종료, 로그오프, 다시 시작 등)을 추가하지 마라. 이유: PRD Out-of-scope에 명시 — 전원 버튼 메뉴는 DOWNLOAD 하나뿐.
