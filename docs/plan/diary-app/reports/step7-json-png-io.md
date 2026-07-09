# Step 7: JSON/PNG 내보내기·불러오기

## 이 단계를 왜 했나?

지금까지 만든 다이어리는 캔버스에 내용을 그리면 자동으로 브라우저 안에 저장된다. 그런데 그 저장소(localStorage — 브라우저가 기기 안에 몰래 갖고 있는 작은 창고)는 같은 브라우저·같은 기기에서만 접근할 수 있다. 브라우저를 바꾸거나 다른 기기로 옮기려면 데이터를 파일로 꺼내 가져가야 한다. 그리고 캔버스에 꾸민 내용을 이미지로 저장해 다른 사람에게 보여주는 기능도 PRD에서 처음부터 약속된 항목이다.

이 단계에서 세 가지를 만든다:
- 전체 다이어리 데이터를 JSON 파일로 내보내기 (백업·이동용)
- JSON 파일을 다시 불러와 복원하기
- 현재 캔버스를 PNG 이미지 파일로 내보내기

## 무엇을 만들었나?

`ExportImportControls` 컴포넌트를 새로 만들었다. 화면에는 버튼 세 개가 나란히 붙어 있다.

```
[ JSON 내보내기 ]  [ JSON 불러오기 ]  [ PNG 내보내기 ]
```

- **JSON 내보내기**: 브라우저 창고에서 전체 다이어리 데이터를 꺼내 `diary-backup-2026-07-10.json` 같은 이름의 파일로 컴퓨터에 저장한다.
- **JSON 불러오기**: 파일 선택 창을 열어 `.json` 파일을 고르면, 그 내용을 브라우저 창고에 덮어쓴 뒤 화면을 새로 불러온다.
- **PNG 내보내기**: 지금 보이는 캔버스를 `diary-2026-07-10.png` 이름의 이미지 파일로 저장한다.

## 데이터가 어떻게 흐르나?

### JSON 내보내기

```
브라우저 창고(localStorage)
        |
        | loadAllDiaryData() — 전체 데이터 읽기
        v
  JSON 문자열로 변환
        |
        | Blob (파일처럼 다룰 수 있는 메모리 덩어리)
        v
URL.createObjectURL → <a> 태그 자동 클릭 → 파일 다운로드
```

크기 예시: 스티커 5개, 텍스트 2개, 이미지 1개가 있는 페이지 하나의 JSON은 약 30~100 KB.

### JSON 불러오기

```
사용자가 파일 선택
        |
        | FileReader — 파일을 텍스트로 읽기
        v
JSON.parse — 텍스트를 데이터 구조로 해석
        |
        | saveAllDiaryData() — 브라우저 창고 덮어쓰기
        v
refreshKey 증가 (숫자 0 → 1 → 2...)
        |
        | React가 key 변경을 감지 → DiaryCanvas 재생성
        v
새 데이터로 캔버스 복원
```

`refreshKey`는 "화면을 다시 그려라"는 신호다. 숫자 자체에는 의미가 없고 바뀌었다는 사실만 중요하다.

### PNG 내보내기

```
현재 Fabric.js 캔버스
        |
        | canvas.toDataURL({ format: 'png' })
        v
base64 문자열 (이미지 데이터가 텍스트로 인코딩된 것)
        |
        | <a> 태그 자동 클릭
        v
diary-2026-07-10.png 다운로드
```

## 쉽게 말하면

JSON 내보내기는 일기장을 통째로 복사해 USB에 담는 것과 같다. JSON 불러오기는 그 USB를 꽂아 일기장을 복원하는 것이다. PNG 내보내기는 현재 페이지를 사진으로 찍는 것이다.

브라우저 창고는 같은 브라우저·같은 기기에서만 열리는 서랍이다. JSON 파일은 어디서나 열리는 종이 복사본이다.

## 만든 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/ExportImportControls/ExportImportControls.jsx` | 신규 — 버튼 세 개 컴포넌트 |
| `src/components/DiaryCanvas/DiaryCanvas.jsx` | `selectedDate`, `onImportSuccess` props 추가, `ExportImportControls` 삽입 |
| `src/App.jsx` | `refreshKey` 상태 추가, `handleImportSuccess` 작성, `DiaryCanvas`에 새 props 전달 |

## 제대로 됐는지 어떻게 확인했나?

**AC 1 — npm run build 통과**

```
dist/assets/index-BsQ5i9Dg.js  480.29 kB
✓ built in 96ms
```

에러 없이 빌드 완료. 이전 step(step 6)은 479 kB였고 1 kB 증가.

**AC 2 — JSON 내보내기**: 다이어리에 스티커·텍스트를 추가하고 저장한 뒤 "JSON 내보내기" 버튼을 누르면 `diary-backup-YYYY-MM-DD.json` 파일이 다운로드되고, 열어보면 캔버스 데이터가 담긴 JSON 구조가 보인다.

**AC 3 — JSON 불러오기**: localStorage를 비운 다른 브라우저 프로필에서 그 파일을 "JSON 불러오기"로 선택하면 캔버스가 원래 내용으로 복원된다.

**AC 4 — PNG 내보내기**: "PNG 내보내기" 버튼을 누르면 `diary-YYYY-MM-DD.png` 파일이 다운로드되고, 이미지 뷰어로 열면 캔버스에서 본 것과 동일한 내용이 보인다.

## 전체 그림에서 지금 어디?

```
[0] 데이터 저장소 설계  ✓
[1] 캔버스 껍데기       ✓
[2] 스티커 팔레트       ✓
[3] 이미지 업로드       ✓
[4] 손글씨 텍스트       ✓
[5] 캘린더 + 탭         ✓
[6] 자동 저장           ✓
[7] JSON/PNG 내보내기   ✓  ← 지금 여기
--- 1순위 완료 ---
[8] 영화 검색 (TMDB)    다음
```

1순위 기능이 모두 완료됐다. PRD의 "성공 기준 1순위"를 충족한다: 날짜별 다이어리 작성, 자유 캔버스 편집, 새로고침 후 유지, JSON 이동, PNG 공유. 다음 단계(2순위)는 TMDB API를 연동해 영화 탭을 완성하는 것이다.

## 아직 안 된 것 (솔직하게)

- JSON 불러오기 시 파일 유효성 검사 없음. 잘못된 JSON을 고르면 `JSON.parse`가 예외를 던지지만 UI에 아무 메시지도 표시하지 않는다. 단, PRD·CLAUDE.md 방침("개인이 자신이 내보낸 파일을 다시 불러오는 용도, 불가능한 케이스 에러 처리 금지")에 따라 의도적으로 생략했다.
- 불러오기 후 "영화리뷰" 탭은 현재 placeholder 상태이므로, 영화 데이터가 JSON에 있어도 화면에 표시되지 않는다. 이는 step 8(TMDB 연동)에서 해결된다.
- PNG 내보내기는 현재 열린 탭의 캔버스만 저장한다. 여러 날짜를 한 번에 PNG로 일괄 내보내는 기능은 요청 범위 밖이다.
