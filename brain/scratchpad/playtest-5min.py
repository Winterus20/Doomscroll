"""Five-minute local playtest for Doomscroll (Playwright; localhost only)."""
from __future__ import annotations

import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

DURATION_SEC = 300
INTERVAL_SEC = 2.0
OUT = Path(__file__).resolve().parent / "playtest-output"
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:3000/"


def read_header_metrics(page) -> dict[str, str]:
    return page.evaluate(
        """() => {
      const dopamine = document.querySelector('header .font-black')?.textContent?.trim() ?? '';
      const text = document.body.innerText;
      const perSec = (text.match(/\\+[^\\n]+\\/s/) ?? [''])[0];
      const goal = (text.match(/D\\d alınabilir[^\\n]*/i) ?? text.match(/Frekans hazır[^\\n]*/i) ?? [''])[0];
      return { dopamine, perSec, goal };
    }"""
    )


def play_burst(page) -> None:
    for _ in range(10):
        page.keyboard.press("Space")

    max_all = page.get_by_role("button", name=re.compile(r"Tümü Maks", re.I))
    if max_all.count() > 0:
        btn = max_all.first
        if btn.is_enabled():
            btn.click(timeout=1500)

    hz = page.get_by_role("button", name=re.compile(r"^Hz", re.I))
    if hz.count() > 0:
        btn = hz.first
        if btn.is_enabled():
            btn.click(timeout=1500)

    buy_buttons = page.get_by_role("button", name=re.compile(r"^\d+:\s"))
    for btn in buy_buttons.all()[:4]:
        if btn.is_enabled():
            try:
                btn.click(timeout=800)
            except Exception:
                pass


def main() -> None:
    log: list[str] = []
    milestones = [0, 60, 120, 180, 240, 300]
    next_idx = 0

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto(BASE, wait_until="networkidle", timeout=60000)
        time.sleep(0.5)

        start = time.monotonic()
        while True:
            elapsed = time.monotonic() - start
            if elapsed >= DURATION_SEC:
                break

            play_burst(page)

            while next_idx < len(milestones) and elapsed >= milestones[next_idx]:
                label = milestones[next_idx]
                m = read_header_metrics(page)
                shot = OUT / f"5min-{label // 60}m.png"
                page.screenshot(path=str(shot), full_page=True)
                log.append(
                    f"t={label}s dopamine={m['dopamine']} rate={m['perSec']} goal={m['goal']}"
                )
                next_idx += 1

            time.sleep(INTERVAL_SEC)

        page.get_by_role("button", name=re.compile(r"Rapor", re.I)).click(timeout=5000)
        time.sleep(0.6)
        stats = page.evaluate(
            """() => {
          const t = document.body.innerText;
          const pick = (label) => {
            const i = t.indexOf(label);
            if (i < 0) return '';
            return t.slice(i, i + 80).replace(/\\s+/g, ' ').trim();
          };
          return {
            dopamine: document.querySelector('header .font-black')?.textContent?.trim() ?? '',
            perSec: (t.match(/\\+[^\\n]+\\/s/) ?? [''])[0],
            sleepless: pick('Uykusuz Geçen Süre'),
            scrolls: pick('Yukarı Kaydırma Sayısı'),
            totalProduced: pick('Toplam Üretilen Dopamin'),
            crises: pick('Tıklanan Gece Krizleri'),
            achievements: pick('Kazanılan Uykusuzluk Puanı'),
          };
        }"""
        )
        page.screenshot(path=str(OUT / "5min-final-rapor.png"), full_page=True)
        log.append("--- final stats tab ---")
        for key, value in stats.items():
            log.append(f"{key}: {value}")

        (OUT / "5min-log.txt").write_text("\n".join(log), encoding="utf-8")
        browser.close()

    print("done", OUT)


if __name__ == "__main__":
    main()
