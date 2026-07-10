# Step 7: json-png-io

## 읽을 파일
- `docs/plan/diary-app/PRD.md` — "내보내기/불러오기", "PNG 이미지로 내보내기"
- `docs/plan/diary-app/architecture.md` — "핵심 흐름" 5~6번(내보내기, 불러오기)
- `src/storage/diaryStorage.js`

## 작업

세 가지 내보내기/불러오기 버튼을 만든다 (App.jsx 또는 적절한 작은 컴포넌트에 배치 — 예: `ExportImportControls.jsx`).

1. **JSON 내보내기**: `loadAllDiaryData()`로 전체 데이터를 가져와 JSON 파일로 다운로드시킨다 (파일명 예: `diary-backup-YYYY-MM-DD.json`, `Blob` + `URL.createObjectURL` 방식).
2. **JSON 불러오기**: 파일 선택(`<input type="file" accept="application/json">`) → 선택한 JSON 파일을 읽어 파싱 → `saveAllDiaryData()`로 localStorage를 덮어쓴다 → 화면(현재 보이는 캔버스 등)을 갱신해 불러온 내용이 바로 보이게 한다.
3. **PNG 내보내기**: 현재 열려 있는 탭의 Fabric 캔버스를 `canvas.toDataURL()`로 이미지 데이터로 추출해 PNG 파일로 다운로드시킨다 (파일명 예: `diary-YYYY-MM-DD.png`).

## AC

- `npm run build`가 에러 없이 성공한다.
- 브라우저에서:
  - JSON 내보내기 버튼을 누르면 전체 다이어리 데이터가 담긴 `.json` 파일이 다운로드된다.
  - 다른 브라우저 프로필(또는 localStorage를 비운 상태)에서 그 JSON 파일을 불러오기 하면 원래 내용이 그대로 복원된다.
  - PNG 내보내기 버튼을 누르면 현재 캔버스 내용이 그대로 담긴 `.png` 파일이 다운로드되고, 이미지 뷰어로 열었을 때 캔버스에서 본 것과 동일하게 보인다.

## 금지
- JSON 불러오기 시 파일 내용의 스키마를 엄격히 검증하는 별도 유효성 검사 로직을 만들지 마라. 이유: CLAUDE.md의 "불가능한 케이스의 에러 처리 금지" — 개인이 자신이 내보낸 파일을 다시 불러오는 용도이며, 악의적 입력에 대한 방어는 요청 범위 밖.
- 날짜 단위 개별 export/import 기능을 추가로 만들지 마라. 이유: 이전 합의에서 "통째로 백업"이 낫다고 결정됨(전체 데이터 단위로만 export/import).
