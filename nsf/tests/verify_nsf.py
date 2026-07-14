import asyncio
from playwright.async_api import async_playwright
import os

async def test_nsf_flow():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        # Grant location permission
        await context.grant_permissions(['geolocation'], origin='http://localhost:3000')
        await context.set_geolocation({"latitude": 12.9716, "longitude": 77.5946})

        page = await context.new_page()

        print("--- STARTING NSF E2E VERIFICATION ---")

        # 1. Test Homepage
        print("[Test] Loading NSF Homepage...")
        await page.goto("http://localhost:3000/nsf/index.html")
        title = await page.title()
        print(f"[Test] Page Title: {title}")
        assert "Neela Security Force" in title
        await page.screenshot(path="verification/nsf_1_homepage.png")

        # 2. Test Login
        print("[Test] Navigating to Login...")
        await page.click("text=Portal Login")
        await page.wait_for_url("**/login.html")
        await page.screenshot(path="verification/nsf_2_login.png")

        # 3. Guard Flow
        print("[Test] Logging in as Guard...")
        await page.select_option("#role", "guard")
        await page.fill("#username", "NFS-9921")
        await page.fill("#password", "password")
        await page.click("text=Sign In")
        await page.wait_for_url("**/guard/dashboard.html")
        print("[Test] Guard Dashboard loaded.")
        await page.screenshot(path="verification/nsf_3_guard_dash.png")

        # 4. Attendance Flow
        print("[Test] Marking Attendance...")
        await page.click("text=Mark Attendance")
        await page.wait_for_url("**/guard/attendance.html")
        await page.click("#btn-check-in")
        await page.wait_for_selector("text=Checked in successfully!")
        print("[Test] Attendance marked successfully.")
        await page.screenshot(path="verification/nsf_4_attendance.png")

        # 5. Admin Flow
        print("[Test] Logging out and in as Admin...")
        await page.goto("http://localhost:3000/nsf/login.html")
        await page.select_option("#role", "admin")
        await page.fill("#username", "admin")
        await page.fill("#password", "admin")
        await page.click("text=Sign In")
        await page.wait_for_url("**/admin/dashboard.html")
        print("[Test] Admin Dashboard loaded.")

        # Verify attendance record in admin log
        await page.wait_for_selector("text=John Smith")
        print("[Test] Verified John Smith's attendance in Admin Log.")
        await page.screenshot(path="verification/nsf_5_admin_dash.png")

        # 6. Payroll Check
        print("[Test] Checking Payroll...")
        await page.click("text=Payroll")
        await page.wait_for_url("**/admin/payroll.html")
        await page.wait_for_selector("text=₹ 650.00")
        print("[Test] Payroll foundation verified.")
        await page.screenshot(path="verification/nsf_6_payroll.png")

        print("--- NSF E2E VERIFICATION COMPLETED ---")
        await browser.close()

if __name__ == "__main__":
    os.makedirs("verification", exist_ok=True)
    asyncio.run(test_nsf_flow())
