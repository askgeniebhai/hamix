
import asyncio
from playwright.async_api import async_playwright

async def run_final_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("requestfailed", lambda request: print(f"FAILED: {request.url} - {request.failure.error_text}"))

        print("Verifying Root HAMIX Marketing Site...")
        await page.goto("http://localhost:3000/", wait_until="networkidle")

        content = await page.content()
        if "One AI Platform" in content:
             print("SUCCESS: HAMIX Marketing Site content found in HTML source.")
        else:
             print("FAILURE: HAMIX Marketing Site content NOT found in source.")

        await page.screenshot(path="verification/test_root_result.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_final_verification())
