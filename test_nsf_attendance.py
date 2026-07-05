import asyncio
from playwright.async_api import async_playwright
import os

async def test_attendance():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        print("--- STARTING ATTENDANCE E2E TEST ---")
        await page.goto("http://localhost:3000/nsf/index.html")
        await page.wait_for_selector("#openGuardPortal")

        # 1. Open Portal
        print("[Test] Opening Guard Portal...")
        await page.click("#openGuardPortal")
        await page.wait_for_selector("#guardPortal.active")
        await page.screenshot(path="verification/attendance/1_portal_open.png")

        # 2. Mark Attendance
        print("[Test] Marking Attendance (Attendance Tab)...")
        await page.click("button[data-tab='attendance']")
        await page.wait_for_selector("#p-guard-list tr")
        # Mark Rajesh Kumar as Present
        await page.click("text=Mark Present")
        await page.wait_for_timeout(500)
        await page.screenshot(path="verification/attendance/2_marked_present.png")

        # 3. Check Dashboard
        print("[Test] Verifying Dashboard Stats...")
        await page.click("button[data-tab='dashboard']")
        present_count = await page.inner_text("#p-stat-present")
        print(f"[Test] Present count: {present_count}")
        await page.screenshot(path="verification/attendance/3_dashboard_updated.png")

        # 4. Check History
        print("[Test] Verifying History...")
        await page.click("button[data-tab='history']")
        await page.wait_for_selector("#p-history-list tr td:has-text('Rajesh Kumar')")
        await page.screenshot(path="verification/attendance/4_history_logged.png")

        # 5. Generate Report
        print("[Test] Generating Report...")
        await page.click("button[data-tab='reports']")
        # Set month
        await page.fill("#p-report-month", "2026-07")
        await page.click("#btn-gen-report")
        await page.wait_for_selector("#p-report-result table")
        await page.screenshot(path="verification/attendance/5_report_generated.png")

        # 6. Close Portal
        print("[Test] Closing Portal...")
        await page.click("#closePortal")
        await page.wait_for_selector("#guardPortal.active", state="hidden")

        print("--- ATTENDANCE E2E TEST COMPLETED ---")
        await browser.close()

if __name__ == "__main__":
    os.makedirs("verification/attendance", exist_ok=True)
    asyncio.run(test_attendance())
