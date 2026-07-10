# Step 6: autosave

## 읽을 파일
- `docs/plan/diary-app/architecture.md` — "핵심 흐름" 4번(자동 저장)
- `src/storage/diaryStorage.js`, `src/components/DiaryCanvas/DiaryCanvas.jsx`, `App.jsx` (step 0, 5 산출물)

## 작업

캔버스 편집 내용이 localStorage에 자동으로 저장되도록 연결한다.

- Fabric canvas의 변경 이벤트(오브젝트 추가·이동·크기조절·회전·수정·삭제 등 — `object:added`, `object:modified`, `object:removed` 등 관련 이벤트를 적절히 구독)가 발생하면, `canvas.toJSON()`으로 현재 상태를 직렬화한다.
- 너무 잦은 저장을 피하기 위해 디바운스를 적용한다 (예: 500ms~1000ms 정도 — 정확한 수치는 재량).
- 디바운스 이후 `storage/diaryStorage.js`의 `loadAllDiaryData` → `setDatePageData` → `saveAllDiaryData` 흐름으로 현재 선택된 날짜·탭에 저장한다.
- 새로고침 후에도 step 5에서 구현한 "불러오기" 경로를 통해 동일한 내용이 복원되어야 한다.

## AC

- `npm run build`가 에러 없이 성공한다.
- 브라우저에서: 캔버스에 스티커/이미지/텍스트를 추가하고 이동·크기조절한 뒤, 브라우저를 새로고침(F5)하면 같은 날짜·탭에서 동일한 내용이 그대로 복원된다. 다른 날짜로 이동했다가 원래 날짜로 돌아와도 내용이 유지된다.

## 금지
- 매 프레임/매 마우스 이동마다 저장하지 마라(디바운스 없이 즉시 저장 금지). 이유: 불필요한 localStorage 쓰기 과부하 — architecture.md에 디바운스 적용이 명시됨.
- localStorage 용량 초과 등 예외적 상황에 대한 에러 처리/폴백 UI를 만들지 마라. 이유: CLAUDE.md의 "불가능한 케이스의 에러 처리 금지" — 개인용 소규모 다이어리 데이터 규모에서 발생 가능성이 낮은 케이스이며 PRD에 요구되지 않음.
