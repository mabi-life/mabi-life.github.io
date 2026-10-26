(function () {
  var R = 'all', P = [], U = '';
  function f(v) { return Math.round(v / 1e4).toLocaleString('ko-KR') + '만'; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function kt(t) {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date(t));
    var m = {};
    parts.forEach(function (p) { m[p.type] = p.value; });
    return m.month + '.' + m.day + ' ' + m.hour + ':' + m.minute;
  }
  function el(name, attrs, text) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', name);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function draw() {
    var s = document.getElementById('pcSvg');
    if (!s) return;
    while (s.firstChild) s.removeChild(s.firstChild);
    var now = Date.now();
    var a = P.filter(function (p) { return R === 'all' || now - new Date(p.t) <= 864e5; });
    if (a.length < 2 && P.length) a = P.slice(-2);
    if (!a.length) return;

    var W = 640, H = 220, L = 48, T = 12, B = 40;
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var xs = a.map(function (p) { return +new Date(p.t); });
    var ys = a.map(function (p) { return p.min; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs) || x0 + 1;
    var y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    if (y1 === y0) { y0 -= 1e5; y1 += 1e5; }
    var padY = (y1 - y0) * 0.08; y0 -= padY; y1 += padY;
    function X(v) { return L + (W - L - 8) * (x1 === x0 ? 0.5 : (v - x0) / (x1 - x0)); }
    function Y(v) { return T + (H - T - B) * (1 - (v - y0) / (y1 - y0)); }
    var baseY = H - B + 2;

    for (var i = 0; i <= 3; i++) {
      var v = y0 + (y1 - y0) * i / 3;
      s.appendChild(el('line', { x1: L, x2: W, y1: Y(v), y2: Y(v), stroke: 'rgba(255,255,255,.08)' }));
      s.appendChild(el('text', { class: 'ax', x: 4, y: Y(v) + 3.5 }, f(v)));
    }
    s.appendChild(el('line', { x1: L, x2: W, y1: baseY, y2: baseY, stroke: 'rgba(255,255,255,.14)' }));

    var d = a.map(function (p, i) {
      return (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(p.min).toFixed(1);
    }).join('');
    s.appendChild(el('path', {
      d: d + 'L' + X(x1) + ' ' + (H - B) + 'L' + X(x0) + ' ' + (H - B) + 'Z',
      fill: 'rgba(247,217,139,.1)'
    }));
    s.appendChild(el('path', {
      d: d, fill: 'none', stroke: '#f7d98b', 'stroke-width': 2,
      'vector-effect': 'non-scaling-stroke'
    }));

    var w = Math.max(1, Math.min(4, Math.floor(a.length / 12) || 1));
    var valleys = [];
    for (var i = w; i < a.length - w; i++) {
      var ok = true, mn = a[i].min;
      for (var j = i - w; j <= i + w; j++) {
        if (j !== i && a[j].min <= mn) { ok = false; break; }
      }
      if (!ok) continue;
      var hi = a[i - w].min;
      for (var j = i - w; j <= i + w; j++) if (a[j].min > hi) hi = a[j].min;
      if ((hi - mn) / hi < 0.03) continue;
      valleys.push({ i: i, cx: X(xs[i]), cy: Y(mn), t: a[i].t, min: mn });
    }
    valleys.sort(function (A, B) { return A.cx - B.cx; });
    var lastX = -1e9, shown = [];
    valleys.forEach(function (v) {
      if (v.cx - lastX < 54) return;
      lastX = v.cx;
      shown.push(v);
    });
    shown.forEach(function (v) {
      s.appendChild(el('line', {
        x1: v.cx, x2: v.cx, y1: v.cy, y2: baseY,
        stroke: '#7ee0b5', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: '.55'
      }));
      var tri = el('path', {
        d: 'M' + v.cx + ' ' + (v.cy + 1) + ' l-3.5 5.5 h7 z', fill: '#7ee0b5'
      });
      tri.appendChild(el('title', null, '골짜기 ' + kt(v.t) + ' · ' + f(v.min)));
      s.appendChild(tri);
      s.appendChild(el('path', {
        d: 'M' + v.cx + ' ' + (baseY - 1) + ' l-3.5 -5.5 h7 z', fill: '#7ee0b5'
      }));
      s.appendChild(el('text', {
        class: 'vt', x: v.cx, y: baseY + 12, 'text-anchor': 'middle'
      }, kt(v.t)));
    });

    function nearValley(x) {
      return shown.some(function (v) { return Math.abs(v.cx - x) < 50; });
    }
    var xL = X(xs[0]), xR = X(xs[xs.length - 1]);
    if (!nearValley(xL)) {
      s.appendChild(el('text', { class: 'ax', x: xL, y: baseY + 12, 'text-anchor': 'start' }, kt(a[0].t)));
    }
    if (!nearValley(xR)) {
      s.appendChild(el('text', { class: 'ax', x: xR, y: baseY + 12, 'text-anchor': 'end' }, kt(a[a.length - 1].t)));
    }

    a.forEach(function (p, i) {
      if (i > 0 && Math.abs(p.min - a[i - 1].min) / a[i - 1].min >= 0.1) {
        var c = el('circle', {
          cx: X(xs[i]), cy: Y(p.min), r: 3.5,
          fill: '#1b1636', stroke: '#ff7a8a', 'stroke-width': 2
        });
        c.appendChild(el('title', null, kt(p.t) + ' ' + f(p.min) + ' (급변동)'));
        s.appendChild(c);
      }
    });
    var l = a[a.length - 1];
    s.appendChild(el('circle', { cx: X(xs[xs.length - 1]), cy: Y(l.min), r: 3.5, fill: '#f7d98b' }));
  }
  function hd() {
    var l = P[P.length - 1];
    if (l) document.getElementById('pcCur').textContent = '현재 최저 ' + f(l.min);
    if (U) document.getElementById('pcUpd').textContent = kt(U) + ' 기준 (한국 시간)';
  }
  document.querySelectorAll('#pcCard .pcTg button').forEach(function (b) {
    b.onclick = function () {
      R = b.dataset.r;
      document.querySelectorAll('#pcCard .pcTg button').forEach(function (x) {
        x.classList.toggle('on', x === b);
      });
      draw();
    };
  });
  fetch('/pyeollin_history.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      P = j.points || [];
      U = j.updated;
      return fetch('/prices.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (q) {
          var e = q.prices && q.prices['균열의 편린'];
          if (e && e.min > 0 && new Date(q.updated) > new Date(P.length ? P[P.length - 1].t : 0)) {
            if (!P.length || P[P.length - 1].min !== e.min) P.push({ t: q.updated, min: e.min });
            U = q.updated;
          }
        })
        .catch(function () {});
    })
    .then(function () { hd(); draw(); })
    .catch(function () {
      var n = document.getElementById('pcNote');
      if (n) n.textContent = '시세 기록을 불러오지 못했어요';
    });
  window.addEventListener('resize', function () { if (P.length) draw(); });
})();
