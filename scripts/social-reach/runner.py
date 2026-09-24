#!/usr/bin/env python3
"""That day host runner (Agent-Reach fork).

Runs on a host or in GitHub Actions, never in the browser or the Worker. It drains queued That day
requests from the Intelligence Worker, searches X with the Agent-Reach backend that is configured,
and posts the results to the token-gated ingest. The Worker re-checks every post (dated X status,
inside the day_0..+7 window, mentions the ticker/name/mint) before anything is retained.

Backends, in order:
  1. twitter-cli, when TWITTER_AUTH_TOKEN and TWITTER_CT0 are set for a dedicated account
     (saved with `agent-reach configure twitter-cookies` or passed as env). Never the owner's main account.
  2. Exa through mcporter (`mcporter call exa.web_search_exa ...`), the Agent-Reach zero-credential route.

Env: INTELLIGENCE_ORIGIN (default https://www.abullsapp.com), SOCIAL_INGEST_TOKEN (required).
"""

import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request

ORIGIN = os.environ.get("INTELLIGENCE_ORIGIN", "https://www.abullsapp.com").rstrip("/")
TOKEN = os.environ.get("SOCIAL_INGEST_TOKEN", "")
STATUS_URL = re.compile(r"https?://(?:www\.)?(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})/status/(\d{6,25})")


def api(path, body=None):
    request = urllib.request.Request(
        f"{ORIGIN}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"authorization": f"Bearer {TOKEN}", "content-type": "application/json", "accept": "application/json", "user-agent": "A-Bulls-App-social-reach/1.0"},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode())


def twitter_env():
    """Credentials for one child process only, from env or Agent-Reach's saved config."""
    try:
        from agent_reach.channels.twitter import twitter_cli_child_env
        from agent_reach.config import Config

        extra = twitter_cli_child_env(Config())
    except Exception:
        extra = {}
    env = {**os.environ, **extra}
    return env if env.get("TWITTER_AUTH_TOKEN") and env.get("TWITTER_CT0") else None


def twitter_search(terms, since, until, env):
    out = subprocess.run(
        ["twitter", "search", terms, "--type", "Latest", "--since", since, "--until", until, "--exclude", "retweets", "-n", "40", "--json"],
        capture_output=True, text=True, timeout=120, env=env,
    )
    if out.returncode != 0:
        raise RuntimeError(f"twitter-cli exit {out.returncode}")
    payload = json.loads(out.stdout or "{}")
    return [
        {"id": str(t.get("id", "")), "handle": (t.get("author") or {}).get("screenName", ""), "text": t.get("text", ""), "postedAt": t.get("createdAtISO") or t.get("createdAt"), "url": f"https://x.com/{(t.get('author') or {}).get('screenName', 'i')}/status/{t.get('id', '')}"}
        for t in (payload.get("data") or [])
        if isinstance(t, dict)
    ]


def exa_search(terms, since):
    if not shutil.which("mcporter"):
        return []
    out = subprocess.run(["mcporter", "call", "exa.web_search_exa", f"query={terms} site:x.com {since}", "numResults=10"], capture_output=True, text=True, timeout=120)
    if out.returncode != 0:
        return []
    posts, blocks = [], re.split(r"\n-{3,}\n", out.stdout)
    for block in blocks:
        match = STATUS_URL.search(block)
        if match:
            highlights = block.split("Highlights:", 1)[-1]
            posts.append({"id": match.group(2), "handle": match.group(1), "url": match.group(0), "text": " ".join(highlights.replace("...", " ").split())})
    return posts


def main():
    if not TOKEN:
        print("SOCIAL_INGEST_TOKEN is not set; nothing to do.")
        return 0
    env = twitter_env()
    backend = "twitter-cli" if env and shutil.which("twitter") else "exa" if shutil.which("mcporter") else None
    if not backend:
        print("No Agent-Reach backend is ready (twitter-cli with a dedicated account, or mcporter for Exa).")
        return 0
    queue = api("/api/intelligence/social/queue").get("items", [])
    print(f"{len(queue)} That day requests queued; backend {backend}.")
    for item in queue:
        terms = item.get("terms")
        if not terms:
            continue
        posts = []
        for piece in item.get("slices", []):
            try:
                posts += twitter_search(terms, piece["since"], piece["until"], env) if backend == "twitter-cli" else exa_search(terms, piece["since"])
            except Exception as error:
                print(f"  {item['request_key']} {piece['bucket']}: {error}")
        result = api("/api/intelligence/social/ingest", {"mint": item["mint"], "day0": item["day0"], "symbol": item.get("symbol"), "name": item.get("name"), "chain": item.get("chain_key"), "room": item.get("room"), "provider": f"agent-reach-{backend}", "posts": posts})
        print(f"  {item['request_key']}: {len(posts)} found, {result.get('accepted', 0)} retained")
    return 0


if __name__ == "__main__":
    sys.exit(main())
