# Step 3: weather-widget

## 읽을 파일
- `docs/plan/diary-main-screen/PRD.md` — "2. 날씨 위젯"
- `docs/plan/diary-main-screen/architecture.md` — "WeatherWidget.jsx (신규)"

## 작업

`src/components/WeatherWidget/WeatherWidget.jsx`를 새로 만든다.

- props 없음.
- 마운트 시 `navigator.geolocation.getCurrentPosition`으로 위치를 요청한다.
  - 성공: 받은 좌표(`coords.latitude`, `coords.longitude`)를 사용한다.
  - 실패 또는 `navigator.geolocation` 미지원: 서울 좌표(`37.5665, 126.9780`)로 fallback한다.
- 좌표가 정해지면 Open-Meteo API를 호출한다: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true`
- 응답의 `current_weather.temperature`(섭씨)와 `current_weather.weathercode`를 화면에 보여준다.
  - `weathercode`는 필요한 범위만 최소로 텍스트/이모지 매핑한다(예: 0=맑음, 1~3=구름, 45/48=안개, 51~67=비, 71~86=눈, 95~99=뇌우 정도의 대략적 그룹핑이면 충분 — 세세한 전체 코드표를 다 만들 필요는 없다).
- 로딩 중 상태와, API 실패(네트워크 오류 등) 시 최소한의 안내 문구를 보여준다(예: "날씨 정보를 불러올 수 없습니다").
- 레트로(XP) 카드 스타일로 감싼다. 인라인 스타일로 구현한다.

## AC
- `npm run lint`가 에러 없이 통과한다.
- 임시로 아무 화면에 `<WeatherWidget />`를 렌더링해 브라우저에서 확인한다(확인 후 커밋에 임시 코드를 남기지 않는다): 위치 권한 프롬프트가 뜨고(허용/거부 모두 시도), 몇 초 내로 기온과 날씨 상태가 화면에 표시된다. 네트워크 탭에서 `api.open-meteo.com` 요청이 발생하는 것을 확인한다.

## 금지
- API 키가 필요한 날씨 서비스(OpenWeatherMap 등)를 쓰지 마라. 이유: PRD에 무료·키 불필요 API로 합의됨(Open-Meteo).
- 도시 검색, 지역 수동 변경 UI를 만들지 마라. 이유: PRD Out-of-scope에 명시.
- 과거 날짜나 예보(미래) 데이터를 가져오지 마라. 이유: "현재" 날씨만 보여주는 것으로 합의됨 — `selectedDate`와 무관하다.
- `DiaryApp.jsx`를 수정하지 마라. 이유: 화면 연결은 step 5의 범위.
