import asyncio
import os
from playwright.async_api import async_playwright

async def audit():
    output_dir = "/home/jules/verification/audit_final"
    os.makedirs(output_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:3000")
        await asyncio.sleep(2)

        await page.set_viewport_size({"width": 1920, "height": 1080})

        # Scroll to bottom slowly to trigger all reveals
        await page.evaluate("""
            async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    let distance = 100;
                    let timer = setInterval(() => {
                        let scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if(totalHeight >= scrollHeight){
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            }
        """)
        await asyncio.sleep(2)

        # Capture major sections
        sections = ["#home", "#about", "#services", "#why", "#attendance", "#leadership", "#industries", "#contact"]
        for sec in sections:
            try:
                # Scroll into view before screenshot
                await page.locator(sec).scroll_into_view_if_needed()
                await asyncio.sleep(0.5)
                await page.locator(sec).screenshot(path=os.path.join(output_dir, f"section_{sec[1:]}.png"))
            except:
                print(f"Section {sec} failed")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(audit())
