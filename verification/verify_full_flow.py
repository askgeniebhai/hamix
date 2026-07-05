from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    # 1. HAMIX Marketing Site (Root)
    print("Visiting Root Marketing Site...")
    page.goto("http://localhost:3000")
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/marketing_site.png")

    # 2. HAMIX CRM Portal
    print("Visiting CRM Portal...")
    page.goto("http://localhost:3000/platform/index.html")
    page.wait_for_timeout(1000)

    # Click Launch CRM if landing is active
    launch_btn = page.query_selector(".btn-launch-crm")
    if launch_btn:
        launch_btn.click()
        page.wait_for_timeout(1000)

    page.screenshot(path="/home/jules/verification/screenshots/crm_dashboard.png")

    # Open Lead Import Modal (Bug fix area)
    print("Opening Lead Import Modal...")
    page.get_by_role("link", name="Leads").click()
    page.wait_for_timeout(500)
    page.get_by_role("button", name="Import Leads").click()
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/crm_import_modal.png")

    # 3. NSF Application
    print("Visiting NSF Application...")
    page.goto("http://localhost:3000/nsf/index.html")
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/nsf_home.png")

    # Final state
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
