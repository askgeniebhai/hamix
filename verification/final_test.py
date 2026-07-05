
import asyncio
from playwright.async_api import async_playwright

async def run_final_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        print("Verifying Root HAMIX Marketing Site...")
        await page.goto("http://localhost:3000/")
        # Wait for the react app to mount
        try:
            await page.wait_for_selector('text="One AI Platform"', timeout=5000)
            print("SUCCESS: HAMIX Marketing Site content rendered at root.")
        except Exception:
            print("FAILURE: HAMIX Marketing Site content DID NOT render at root.")
            content = await page.content()
            print(f"DEBUG: Root content length: {len(content)}")

        print("\nVerifying HAMIX CRM (/platform)...")
        await page.goto("http://localhost:3000/platform/index.html")
        crm_title = await page.title()
        print(f"CRM Page Title: {crm_title}")

        sidebar = await page.query_selector('.sidebar')
        if sidebar:
            print("SUCCESS: HAMIX CRM loaded successfully.")
        else:
            print("FAILURE: HAMIX CRM failed to load (Sidebar not found).")

        print("\nVerifying NSF Application (/nsf)...")
        await page.goto("http://localhost:3000/nsf/index.html")
        await page.wait_for_load_state("networkidle")
        nsf_title = await page.title()
        print(f"NSF Page Title: {nsf_title}")
        nsf_content = await page.content()
        if "Neela Security Force" in nsf_title or "Neela Security Force" in nsf_content:
            print("SUCCESS: NSF Application is live at /nsf.")
        else:
            print("FAILURE: NSF Application failed to load at /nsf.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_final_verification())
