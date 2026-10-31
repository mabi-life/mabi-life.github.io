// 한 페이지: 위 = 제작 마인드맵, 아래 = 정가 코인. #coin / #coin-tala / #coin-bri (또는 ?view=coin&tab=) → 코인 섹션으로 스크롤 + 해당 구슬 탭 선택
(function(){var q=new URLSearchParams(location.search);if(q.get('view')==='coin'&&!/^#coin/.test(location.hash))history.replaceState(null,'','#coin'+(q.get('tab')?'-'+q.get('tab'):''));
function go(){var h=location.hash.slice(1);if(!/^coin/.test(h))return;var t=h.split('-')[1];
 if(t){var b=document.querySelector('#tabs button[data-k="'+t+'"]');if(b)b.click()}
 setTimeout(function(){document.getElementById('vCoin').scrollIntoView({behavior:'smooth',block:'start'})},60)}
addEventListener('hashchange',go);go();
// 코인 탭에서 구슬가 직접 입력/붙여넣기 → 위 제작 재료비 즉시 반영
document.getElementById('vCoin').addEventListener('input',function(){setTimeout(function(){if(window.reBeads){reBeads();render()}},0)});
document.getElementById('vCoin').addEventListener('change',function(){setTimeout(function(){if(window.reBeads){reBeads();render()}},0)})})();
