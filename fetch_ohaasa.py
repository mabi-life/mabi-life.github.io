#!/usr/bin/env python3
"""Fetch ABC Asahi 「おはよう朝日です」 12星座 ranking into docs/fortune/ohaasa.json.

Official public JSON (same file the ohaasa website loads):
  https://www.asahi.co.jp/data/ohaasa2020/horoscope.json

Only writes when onair_date matches today's JST calendar date and all 12 signs
parse cleanly. Weekends/holidays/no-broadcast → leave file unchanged (site falls back).
Does NOT copy Japanese fortune text — ranking order only.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

URL = "https://www.asahi.co.jp/data/ohaasa2020/horoscope.json"
OUT = Path("docs/fortune/ohaasa.json")
JST = timezone(timedelta(hours=9))

# horoscope_st codes used by the official JSON (see ohaasa main.min.js)
ST_TO_KO = {
    "01": "양자리",
    "02": "황소자리",
    "03": "쌍둥이자리",
    "04": "게자리",
    "05": "사자자리",
    "06": "처녀자리",
    "07": "천칭자리",
    "08": "전갈자리",
    "09": "사수자리",
    "10": "염소자리",
    "11": "물병자리",
    "12": "물고기자리",
}


def jst_today() -> str:
    return datetime.now(JST).strftime("%Y-%m-%d")


def fetch() -> dict:
    req = urllib.request.Request(
        URL,
        headers={"User-Agent": "mabi-life-ohaasa-bot/1.0 (+https://mabi-life.com/; fortune ranking sync)"},
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        raw = json.loads(r.read().decode("utf-8"))
    if isinstance(raw, list):
        if not raw:
            raise RuntimeError("empty horoscope list")
        return raw[0]
    if isinstance(raw, dict) and "horoscope" in raw:
        h = raw["horoscope"]
        return h[0] if isinstance(h, list) else h
    return raw


def parse(entry: dict) -> dict:
    onair = str(entry.get("onair_date") or "").strip()
    if len(onair) != 8 or not onair.isdigit():
        raise RuntimeError(f"bad onair_date: {onair!r}")
    date = f"{onair[:4]}-{onair[4:6]}-{onair[6:8]}"
    detail = sorted(entry.get("detail") or [], key=lambda x: int(x["ranking_no"]))
    if len(detail) != 12:
        raise RuntimeError(f"expected 12 ranks, got {len(detail)}")
    signs: list[str] = []
    seen: set[str] = set()
    for d in detail:
        st = str(d.get("horoscope_st") or "").zfill(2)
        ko = ST_TO_KO.get(st)
        if not ko:
            raise RuntimeError(f"unknown horoscope_st={st!r}")
        if ko in seen:
            raise RuntimeError(f"duplicate sign {ko}")
        seen.add(ko)
        signs.append(ko)
    if len(seen) != 12:
        raise RuntimeError("incomplete sign set")
    return {
        "date": date,
        "onair_date": onair,
        "source": "ohaasa",
        "source_url": URL,
        "signs": signs,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def main() -> int:
    today = jst_today()
    try:
        entry = fetch()
        out = parse(entry)
    except Exception as e:
        print(f"ohaasa fetch/parse failed: {e}", file=sys.stderr)
        return 0  # soft fail — keep previous JSON; site falls back

    if out["date"] != today:
        print(f"onair {out['date']} != today {today} (weekend/holiday/not yet) — skip write")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(out, ensure_ascii=False, indent=2) + "\n"
    if OUT.exists() and OUT.read_text(encoding="utf-8") == text:
        print(f"ohaasa.json already up to date for {today}")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} for {today}: {' → '.join(out['signs'][:3])} …")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
