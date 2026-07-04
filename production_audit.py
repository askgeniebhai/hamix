import asyncio
import os
from playwright.async_api import async_playwright

async def production_audit():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # 1. Monitor console errors
        errors = []
        page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"[exception] {exc}"))

        # 2. Check for broken images/resources
        failed_requests = []
        page.on("requestfailed", lambda req: failed_requests.append(f"Failed: {req.url} - {req.failure.error_text}"))
        page.on("response", lambda res: failed_requests.append(f"404: {res.url}") if res.status == 404 else None)

        print("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await asyncio.sleep(2)

        # 3. Verify Attendance Section exists and is visible
        attendance = page.locator("#attendance")
        is_attendance_visible = await attendance.is_visible()
        print(f"Attendance Section Visible: {is_attendance_visible}")

        # Count features in attendance
        feature_count = await page.locator(".att-feat").count()
        print(f"Attendance Feature Cards Found: {feature_count}")

        # 4. Verify Navigation Links
        nav_links = await page.locator("nav a").all()
        print(f"Verifying {len(nav_links)} navigation links...")
        for link in nav_links:
            href = await link.get_attribute("href")
            if href.startswith("#"):
                target = page.locator(href)
                exists = await target.count() > 0
                print(f"  Link {href} target exists: {exists}")

        # 5. Accessibility Check (basic)
        images_without_alt = await page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.filter(img => !img.alt).map(img => img.src);
        }""")
        print(f"Images without alt tags: {len(images_without_alt)}")
        for img in images_without_alt:
            print(f"  Missing alt: {img}")

        # 6. Final Results
        print("\n--- AUDIT SUMMARY ---")
        if errors:
            print("CONSOLE ERRORS FOUND:")
            for e in errors: print(f"  {e}")
        else:
            print("No console errors.")

        if failed_requests:
            print("BROKEN RESOURCES FOUND:")
            for fr in failed_requests: print(f"  {fr}")
        else:
            print("No broken resources.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(production_audit())
