# diary — Windows XP(Luna) 스타일 가이드

`Diary XP.dc.html` 리디자인에서 뽑아낸 스타일 스펙. 기존 React 컴포넌트(`src/components/**`)에 그대로 옮겨 적용하면 됨. 기능/구조는 변경 없음 — 색상·그라디언트·폰트·보더만 교체.

## 0. 공통

```css
font-family: Tahoma, "Malgun Gothic", "Segoe UI", sans-serif;
```

손글씨 폰트(텍스트 메모용, 기존 유지) — `index.html`의 `<head>`에 추가:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Gaegu:wght@700&family=Hi+Melody&family=Poor+Story&family=Caveat:wght@600&family=Kalam:wght@700&family=Gochi+Hand&family=Shadows+Into+Light&display=swap" rel="stylesheet">
```

패널 배경(Luna 실버): `#ece9d8`
패널 보더: `1px solid #7d7d64` + `box-shadow: 1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)`
포인트 블루: `#1657d6` / 딥 네이비: `#0a246a`

---

## 1. Desktop.jsx

- 배경: `background-image:url(wallpaper); background-size:cover; background-position:center;`
- 아이콘 버튼: hover 시 `border:1px dotted rgba(255,255,255,.6); background:rgba(30,70,160,.25);`
- 라벨: `color:#fff; font-size:12px; text-shadow:1px 1px 2px rgba(0,0,0,.9);`

## 2. Window.jsx

**titleBarStyle**
```js
{
  display: 'flex', alignItems: 'center', gap: 6, height: 32,
  padding: '0 4px 0 8px',
  background: 'linear-gradient(180deg,#4e9af7 0%,#2f7ff2 10%,#0d5be0 55%,#0a4fd0 100%)',
  borderBottom: '1px solid #04266b',
}
```
- 타이틀 앞에 16~17px 앱 아이콘(`diary-icon.png`) 추가
- 텍스트: `color:#fff; fontWeight:bold; fontSize:13px; textShadow:'1px 1px 1px rgba(0,0,0,.5)'`

**windowBoxStyle**
```js
{
  background: '#ece9d8',
  border: '1px solid #003ea6',
  borderRadius: '8px 8px 3px 3px', // 상단만 라운드
  boxShadow: '0 10px 34px rgba(0,0,0,.55)',
}
```

**closeButtonStyle**
```js
{
  width: 21, height: 20, borderRadius: 3,
  border: '1px solid #f6b8ab',
  background: 'linear-gradient(180deg,#f5a29c 0%,#e8544a 45%,#c81707 100%)',
  color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)',
}
```

## 3. Taskbar.jsx

```js
const barStyle = {
  height: 38,
  background: 'linear-gradient(180deg,#2c88f0 0%,#1560e0 6%,#1055d8 45%,#0f4cc9 88%,#1a5ddc 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
}
const traySegmentStyle = {
  background: 'linear-gradient(180deg,#2c88f0 0%,#1560e0 6%,#1055d8 45%,#0f4cc9 88%,#1a5ddc 100%)',
  borderRadius: '10px 0 0 10px',
  boxShadow: 'inset 1px 0 0 rgba(255,255,255,.3)',
}
```

## 4. PowerButton.jsx → "start" 버튼으로 교체

기존엔 전원 아이콘 하나였음. 실제 XP처럼 초록 필 버튼 + 4색 플래그 + "start" 텍스트로 교체:

```js
const startButtonStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '0 16px 0 6px',
  borderRadius: '0 14px 14px 0',
  background: 'linear-gradient(180deg,#8ee060 0%,#4ec42a 15%,#2a9e12 45%,#1c7d0d 85%,#278f16 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 1px 0 3px rgba(0,0,0,.3)',
}
```
- 플래그: 18×18 2×2 그리드, 각 칸 `#ff5b4d / #7ed321 / #4a90e2 / #ffd23f`, 전체 `transform: rotate(-6deg)`
- 텍스트: `color:#fff; fontStyle:italic; fontWeight:bold; fontSize:15px; textShadow:'1px 1px 1px rgba(0,0,0,.5)'`

## 5. StartMenu.jsx

```js
const headerStyle = {
  height: 46,
  background: 'linear-gradient(115deg,#0b60c8 0%,#0c62c8 35%,#5388d8 100%)',
  borderBottom: '2px solid #f3ddcb',
}
```
- 메뉴 박스: `borderRadius:'8px 8px 4px 4px'; boxShadow:'2px -2px 12px rgba(0,0,0,.45)'; border:'1px solid #0a3fae'`
- 좌측 패널 아이템 hover: `background:#2a63d6` (텍스트 흰색으로 반전)
- 하단 두 바: 위쪽 `linear-gradient(180deg,#3d3d3d,#2a2a2a)` 18px, 아래쪽 `linear-gradient(180deg,#4489dc 0%,#1e66c9 45%,#0e3f8b 100%)` 28px

## 6. XPCalendar.jsx

```js
const headerBarStyle = {
  background: 'linear-gradient(180deg,#3d84ec 0%,#1657d6 55%,#0e46bc 100%)',
  borderBottom: '1px solid #04266b',
  padding: '7px 10px',
}
const weekdayRowStyle = {
  background: '#f4f2e8',
  borderBottom: '1px solid #d8d5c2',
}
```
- 일요일 라벨만 `color:#a33` (빨강), 나머지 `#333`
- 오늘 셀: `background:#ffff66`
- 선택 셀: `border:2px solid #1657d6`
- 기본 셀 보더: `1px solid #cfcbb4`

## 7. TodoWidget.jsx / WeatherWidget.jsx / AnalogClockWidget.jsx

세 위젯 모두 동일한 패널 프레임 적용:
```js
const panelStyle = {
  border: '1px solid #7d7d64',
  borderRadius: 3,
  background: '#ece9d8',
  boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
}
const panelHeaderStyle = { // TodoWidget에만 해당 (Weather/Clock은 헤더 없이 중앙 정렬)
  background: 'linear-gradient(180deg,#3d84ec,#1657d6)',
  color: '#fff', fontWeight: 'bold', fontSize: 12,
  padding: '5px 10px',
  textShadow: '1px 1px 1px rgba(0,0,0,.5)',
}
```

## 8. Tabs.jsx (다이어리 / 영화리뷰)

```js
{
  padding: '7px 18px',
  border: 'none',
  borderBottom: active ? '2px solid #1657d6' : '2px solid transparent',
  color: active ? '#1657d6' : '#666',
  fontWeight: active ? 'bold' : 'normal',
  marginBottom: '-2px',
}
```
하단 구분선: `borderBottom: '2px solid #b8b49c'`

## 9. StickerPalette / ImageUploadButton / TextMemoButton / ExportImportControls

버튼 공통 스타일(XP 버튼):
```js
{
  border: '1px solid #7d7d64',
  borderRadius: 3,
  background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)', // 강조 버튼 아님
  cursor: 'pointer',
}
```
- 캔버스 바깥 테두리: `border:'2px inset #9a9a9a'` (fabric `<canvas>`에 그대로 적용)
- 스티커 그리드 컨테이너: 위 패널 프레임 + 헤더바("스티커") 동일 스타일 적용

---

## 적용 순서 제안
1. `index.css`에 폰트 스택 + Google Fonts link 추가
2. `Window.jsx`, `Taskbar.jsx`, `PowerButton.jsx`(start 버튼으로), `StartMenu.jsx` 순으로 교체 — 크롬이 제일 체감 큼
3. `XPCalendar.jsx`, `TodoWidget.jsx`, `WeatherWidget.jsx`, `AnalogClockWidget.jsx` 패널 스타일 통일
4. `Tabs.jsx`, `DiaryCanvas.jsx` 하위 버튼들 마무리

실제 픽셀 결과물은 `Diary XP.dc.html` 열어서 눈으로 대조하며 값 옮기면 됨.
