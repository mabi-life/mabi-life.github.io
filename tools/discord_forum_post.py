#!/usr/bin/env python3
"""Post a forum thread to Discord via Incoming Webhook (thread_name).

Env:
  DISCORD_UPDATES_WEBHOOK  full https://discord.com/api/webhooks/... URL

Usage:
  DISCORD_UPDATES_WEBHOOK=... python3 tools/discord_forum_post.py \\
    --title "11.04 업데이트" \\
    --body $'알바\\n- 등급 체크\\n\\n경매장\\n- 에코스톤 탭'

No URLs in body by default (Discord 업데이트 포럼 policy).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

URL_RE = re.compile(r"https?://\S+|discord\.gg/\S+|www\.\S+", re.I)


def strip_urls(text: str) -> str:
    return URL_RE.sub("", text).rstrip()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--title", required=True, help="Forum thread title (max 100)")
    p.add_argument("--body", required=True, help="Post content (no site URLs)")
    p.add_argument("--allow-urls", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--edit-message-id", default="", help="Edit an existing webhook message (forum starter message id = thread id) instead of posting")
    args = p.parse_args()

    webhook = os.environ.get("DISCORD_UPDATES_WEBHOOK", "").strip()
    if not webhook and not args.dry_run:
        print("DISCORD_UPDATES_WEBHOOK is missing", file=sys.stderr)
        return 2

    title = args.title.strip()[:100]
    body = args.body.strip()
    if not args.allow_urls:
        body = strip_urls(body)
    if not title or not body:
        print("title/body empty", file=sys.stderr)
        return 2
    if len(body) > 1900:
        body = body[:1890] + "…"

    edit_id = (args.edit_message_id or "").strip()
    if edit_id and not edit_id.isdigit():
        print("edit-message-id must be numeric", file=sys.stderr)
        return 2
    payload = {
        "content": body,
        "allowed_mentions": {"parse": []},
    }
    if not edit_id:
        payload["thread_name"] = title
    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    base = webhook.split("?", 1)[0]
    if edit_id:
        # forum post starter message: message id == thread id
        url = f"{base}/messages/{edit_id}?thread_id={edit_id}"
        method = "PATCH"
    else:
        url = webhook + ("&" if "?" in webhook else "?") + "wait=true"
        method = "POST"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "mabi-life-updates/1"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read().decode("utf-8", "replace")
            print(raw or f"ok {res.status}")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "replace")
        print(f"HTTP {e.code}: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
