# diary 프로젝트 로드맵

전체 범위가 커서 "지금 뭐가 끝났고 다음이 뭔지"를 추적하기 위한 문서.
각 phase는 `coplan`(PRD/architecture 합의) → `step-build`(step 단위 실행) 순서로 진행한다.

## 완료된 phase

| Phase | 내용 | 상태 |
|---|---|---|
| `desktop-ui` | 데스크톱 화면, Window 창 껍데기, Taskbar, 전원 버튼, StartMenu | 완료 (step0~7 + XP 실측 반영 fix 다수) |
| `diary-app` | Fabric.js 캔버스 에디터, 스티커 팔레트, 이미지 업로드, 텍스트 메모, JSON/PNG export | 완료 (step0~7, report 있음) |
| `diary-main-screen` | XP 스타일 캘린더 + 위젯 3종(할일/날씨/시계), 메인/편집 화면 전환 | 완료 (step0~5, report 있음) |
| XP 스타일 리디자인 | `docs/design.md` — 기능 변경 없이 색·그라디언트·폰트·보더만 Luna 스타일로 교체 | 완료 (대상 컴포넌트 전부 Luna 색상값 적용 확인됨) |

> 참고: `desktop-ui/steps/index.json`은 상태가 "pending"으로 남아있었으나 실제로는 완료된 상태라 "done"으로 동기화함(git log 기준).

## 다음 phase (확정된 순서)

기존 전제 유지: 서버 없음, 클라이언트 전용, localStorage + JSON export/import.

| 순서 | Phase | 내용 | 비고 |
|---|---|---|---|
| 1 | `canvas-object-toolbar` | 오브젝트 복사/삭제/정렬/레이어 순서/회전 등 편의 툴바 (PPT 도형 조작 수준) | 이후 phase들이 이 위에서 동작하는 기반 |
| 2 | `free-drawing` | 캔버스 위에 자유롭게 그림 그리기 (Fabric.js free drawing mode) | |
| 3 | `asset-import-pipeline` | 배경/폰트 파일 업로드 + 폴더 일괄 추가·드래그앤드롭·붙여넣기 감지로 에셋을 등록하는 공용 입력 방식 | localStorage 용량 한계 검토 필요. 이후 스티커 에디터가 재사용 |
| 4 | `sticker-studio` | 스티커 전용 에디터 메뉴 — 새 스티커 그리기/만들기 + 기존 스티커 편집 | `asset-import-pipeline`에 의존 |
| 5 | `youtube-embed` | 다이어리에 유튜브 링크를 넣으면 재생 가능한 썸네일 카드로 표시 | |
| 6 | `desktop-custom` | 바탕화면 아이콘/배경화면 사용자 커스터마이징 | |
| 7 | `movie-review-standalone` | 영화 리뷰를 diary와 분리된 독립 메뉴로 재구성, 템플릿/배경 커스텀, 동일 편집기 재사용 | 가장 큼. 기존 PRD의 "다이어리 탭 하위" 구조에서 "독립 메뉴"로 재정의 필요 |

## 보류 (별도 결정 필요 — 지금 계획에 없음)

이 두 항목은 "서버 없음, 로컬 전용" 전제를 깨뜨리는 결정이라 위 phase들과 급이 다름. 1~7 완료 후 별도로 논의.

- **배포**: 다른 사람도 쓸 수 있게 배포 (프로그램 vs 웹 호스팅 결정 필요)
- **소셜 공유**: 친구끼리 작성한 다이어리를 공개 게시 (로그인/서버/DB 필요)
