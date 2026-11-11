# mabi-life.github.io
마비노기 경매장 시세. 10분마다 GitHub Actions가 `items.json`의 아이템을
`auction/list`(최저가·매물수) + `auction/history`(체결)로 조회해 `prices.json`을 만든다.
history는 ~1시간 창이라 `history_roll.json`에 `auction_buy_id`로 쌓아 24h 근사(`trades24`/`volume24`).

수집 결과(NEXON Open API 데이터)는 공개 파일로 두지 않는다. 비공개 저장소 `mabi-life/mabi-data`
(`prices`·`horn` 브랜치, 매번 커밋 1개로 덮어씀)에 올리고, Worker `mabi-data`(cloudflare/data-worker)가
`https://mabi-life.com` 출처 요청에만 제공한다(그 외 403). 거뿔 내역은 Worker `mabi-horn`이 같은 방식으로 제공.

형식: `{updated, hotMinVolume, prices: {이름: {min, count, trades, volume, trades24, volume24, t}}}`

- `count` = 조회 시점 매물 수량 (참고)
- `trades`/`volume` = 이번 history 창의 거래횟수/체결물량
- `trades24`/`volume24` = 롤링 24h 근사 (중복 제거). 수집 공백 시 누락 가능
- 🔥 HOT = `volume24`(없으면 `volume`) ≥ `hotMinVolume` (피드 p80 근사, 알바·물교 재료용)

앱: 알바 도우미 https://mabi-life.github.io/alba/ · 물교 도우미 https://mabi-life.github.io/barter/ · 던전 도우미 https://mabi-life.github.io/dungeon/

## 뿔피리 갱신 주기 (update-horn.yml)
GitHub 스케줄은 10분 cron이어도 실제론 ~1시간 간격으로 밀림. 촘촘하게 하려면 외부 핑:
cron-job.org에서 10분마다 POST
`https://api.github.com/repos/mabi-life/mabi-life.github.io/actions/workflows/horn.yml/dispatches`
헤더 `Authorization: Bearer <fine-grained PAT, 이 repo Actions: write>`, `Accept: application/vnd.github+json`, 바디 `{"ref":"main"}`.
