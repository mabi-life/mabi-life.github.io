// 제작 ↔ 정가 코인 화면 전환: #craft / #coin / #coin-tala / #coin-bri (또는 ?view=coin&tab=bri)
(function(){var q=new URLSearchParams(location.search);if(q.get('view')==='coin'&&!/^#coin/.test(location.hash))history.replaceState(null,'','#coin'+(q.get('tab')?'-'+q.get('tab'):''));
function show(){var h=location.hash.slice(1),coin=/^coin/.test(h),t=h.split('-')[1];
 document.getElementById('vCraft').hidden=coin;document.getElementById('vCoin').hidden=!coin;
 document.getElementById('vTitle').textContent=coin?'정가 코인 필요 수량 계산기':'제작 재료 계산기';document.getElementById('craftDesc').hidden=coin;
 [].forEach.call(document.querySelectorAll('#vtabs a'),function(a){a.className=(a.dataset.v==='coin')===coin?'on':''});
 if(coin&&t){var b=document.querySelector('#tabs button[data-k="'+t+'"]');if(b)b.click()}
 if(!coin&&window.render)setTimeout(function(){window._gx=0;if(window.reBeads)reBeads();render()},0);
 document.title=coin?'정가 코인 계산기 · 제작 재료 계산기 · 마비라이프':document.title.replace(/^정가 코인 계산기 · /,'')}
addEventListener('hashchange',show);show()})();
