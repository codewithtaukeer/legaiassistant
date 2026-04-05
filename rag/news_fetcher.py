import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import json
import os

NEWS_CACHE_FILE = "data/legal_news_cache.json"

RSS_FEEDS = [
    {
        "name": "Live Law",
        "url": "https://www.livelaw.in/rss/news",
        "category": "General Legal"
    },
    {
        "name": "Bar and Bench",
        "url": "https://www.barandbench.com/feed",
        "category": "General Legal"
    },
    {
        "name": "Supreme Court Observer",
        "url": "https://www.scobserver.in/feed",
        "category": "Supreme Court"
    },
    {
        "name": "India Corporate Law",
        "url": "https://indiacorplaw.in/feed",
        "category": "Corporate"
    },
    {
        "name": "Mondaq India Law",
        "url": "https://www.mondaq.com/rss/India/",
        "category": "Corporate"
    },
    {
        "name": "SCC Online Blog",
        "url": "https://www.scconline.com/blog/feed/",
        "category": "Judgements"
    },
    {
        "name": "Legal Service India",
        "url": "https://www.legalserviceindia.com/rss/article.xml",
        "category": "General Legal"
    }
]


def fetch_full_content(url):
    """Try to fetch more content from the article page"""
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        res = requests.get(url, timeout=5, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        # Try common article content selectors
        for selector in ["article", ".entry-content", ".post-content", ".article-body", "main p"]:
            content = soup.select(selector)
            if content:
                text = " ".join([c.get_text() for c in content[:3]])
                return text[:800].strip()
    except:
        pass
    return ""


def fetch_rss_feed(feed_info):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        parsed = feedparser.parse(feed_info["url"], request_headers=headers)
        articles = []
        for entry in parsed.entries[:6]:
            raw_summary = entry.get("summary", entry.get("description", ""))
            clean_summary = BeautifulSoup(raw_summary, "html.parser").get_text().strip()
            clean_summary = " ".join(clean_summary.split())[:500]

            articles.append({
                "title": entry.get("title", "").strip(),
                "summary": clean_summary,
                "url": entry.get("link", ""),
                "source": feed_info["name"],
                "category": feed_info["category"],
                "published": entry.get("published", datetime.now().isoformat()),
                "published_parsed": str(entry.get("published_parsed", "")),
            })
        return articles
    except Exception as e:
        print(f"Failed to fetch {feed_info['name']}: {e}")
        return []


def fetch_all_news():
    from concurrent.futures import ThreadPoolExecutor
    all_articles = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(fetch_rss_feed, RSS_FEEDS))

    for result in results:
        all_articles.extend(result)

    # Deduplicate by title
    seen = set()
    unique_articles = []
    for a in all_articles:
        if a["title"] not in seen and a["title"]:
            seen.add(a["title"])
            unique_articles.append(a)

    # Sort newest first
    unique_articles.sort(key=lambda x: x.get("published", ""), reverse=True)

    os.makedirs("data", exist_ok=True)
    with open(NEWS_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "last_updated": datetime.now().isoformat(),
            "articles": unique_articles
        }, f, ensure_ascii=False, indent=2)

    print(f"Fetched {len(unique_articles)} articles")
    return unique_articles


def get_cached_news():
    if not os.path.exists(NEWS_CACHE_FILE):
        return {"last_updated": None, "articles": fetch_all_news()}
    with open(NEWS_CACHE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)