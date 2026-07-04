import asyncio
import os
from playwright.async_api import async_playwright

async def audit():
    breakpoints = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920]
    output_dir = "/home/jules/verification/audit"
    os.makedirs(output_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Monitor console errors
        errors = []
        page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"[exception] {exc}"))

        await page.goto("http://localhost:3000")
        await asyncio.sleep(2) # Wait for initial load

        for width in breakpoints:
            await page.set_viewport_size({"width": width, "height": 1000})
            # Wait for any resizing animations
            await asyncio.sleep(0.5)

            # Check for horizontal scroll
            is_overflowing = await page.evaluate("document.body.scrollWidth > window.innerWidth")

            path = os.path.join(output_dir, f"resp_{width}.png")
            await page.screenshot(path=path, full_page=True)
            print(f"Captured {width}px. Overflow: {is_overflowing}")

        print("\nJavaScript Errors found:")
        for err in errors:
            print(err)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(audit())
