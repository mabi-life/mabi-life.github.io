// Extracted from https://mabi.zip/static/js/628.a1d61f4d.chunk.js (page component) and 435.faabb3a5.chunk.js (module 8309: DU)
// (Korean strings are \u-escaped in source.)
const DU=[51,49,47,45,43,41,39,37,35,33,31,29,27,25,23]; // c.DU, 15 entries (shown as "{n}초 헤일로로" TTS text)
const j=DU.map((e,t)=>891-62*t);   // remaining-seconds thresholds on 15:00 countdown
// start button: endAt = now + 15min; n=DU copy; index A=0; K = "초 전에 알림음 재생" input, default 10, range 1..10
// useInterval(cb, running?1000:null)  (Web Worker setInterval 1000ms):
//   e = dayjs(endAt).diff(dayjs(),'second')   // integer remaining seconds
//   fire when e <= Math.min(j[A]+K, 900): speak(`${n[0]}초 헤일로로`), A++, n=DU.slice(A); stop after A>=15
// Elapsed time of spawn_i = 900 - j[i] = 9 + 62*i ; alert at spawn_i - K
