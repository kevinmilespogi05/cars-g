import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Navigate to the registration page by clicking a relevant element
        frame = context.pages[-1]
        # Click 'Get Started' to navigate to the registration page
        elem = frame.locator('xpath=html/body/div/div/div/main/div/nav/div/div/div[2]/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in the registration form with valid user details including email kevin123@gmail.com and password 123456
        frame = context.pages[-1]
        # Input First Name
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Kevin')
        

        frame = context.pages[-1]
        # Input Last Name
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Test')
        

        frame = context.pages[-1]
        # Input Email Address
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('kevin123@gmail.com')
        

        frame = context.pages[-1]
        # Input Username
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('kevin123')
        

        frame = context.pages[-1]
        # Input Password
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/div[5]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Input Confirm Password
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/div[6]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Agree to terms checkbox
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/div[7]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Scroll through the Privacy Policy modal to the bottom and close it to proceed
        await page.mouse.wheel(0, 400)
        

        # -> Close the Privacy Policy modal and click 'Continue to ID Verification' to submit the registration form
        frame = context.pages[-1]
        # Close Privacy Policy modal
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[4]/div/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Continue to ID Verification' button to submit the registration form
        frame = context.pages[-1]
        # Click 'Continue to ID Verification' button to submit registration form
        elem = frame.locator('xpath=html/body/div/div/div/main/div/div[3]/div/div[2]/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Join the CARS-G community').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Step 1').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Account Info').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Step 2').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=ID Verification').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=ID Verification Required').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Upload clear photos of both sides of your government-issued ID').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Ensure all text is readable with good lighting and no glare').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Maximum file size: 5MB per image').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Front of ID *').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Click to upload front of ID').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=PNG, JPG up to 5MB').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Back of ID *').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Click to upload back of ID').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Back').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Complete Registration').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Already have an account? Sign in').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    