/* One-shot: pass Cloudflare with headed Chrome under Xvfb, login via cookies,
   click "Create project" on the HealthHack 48 manage page. */
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const { spawn } = require('child_process')
const fs = require('fs')

const COOKIES = [
  {
    name: 'jwt',
    value: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTA3ODY4OTl9.2sxA6KuQTSGs-m1BggFUxtEs64iYMsoOG0y9_2Gbu0M',
    domain: '.devpost.com',
    path: '/',
    secure: true,
    httpOnly: true,
  },
  {
    name: 'remember_user_token',
    value:
      'W1sxMDc4Njg5OV0sIko4X05BeHpIV3RFMkxjYjhHdGI3IiwiMTc5MjI4Nzg0NC40MTg2MDIiXQ%3D%3D--325186fd8d04bb981ccbc6bbf93ccd6ba03eaf81',
    domain: '.devpost.com',
    path: '/',
    secure: true,
    httpOnly: true,
  },
]

const MANAGE_URL = 'https://devpost.com/submit-to/31511-healthhack-48/manage/submissions'
const CHROME = '/home/z/.agent-browser/browsers/chrome-155.0.8059.39/chrome'

async function main() {
  // Start Xvfb ourselves (stays alive for the script duration)
  const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1440x900x24', '-nolisten', 'tcp'], {
    stdio: 'ignore',
    detached: false,
  })
  await new Promise((r) => setTimeout(r, 2500))
  console.log('[1] Xvfb started pid', xvfb.pid)

  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME,
    env: { ...process.env, DISPLAY: ':99' },
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
    locale: 'en-US',
  })
  await context.addCookies(COOKIES)
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 150))
  })

  console.log('[2] navigating to manage page...')
  await page.goto(MANAGE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })

  // Wait for Cloudflare to clear (title stops being "Just a moment...")
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(2500)
    const title = await page.title()
    console.log(`   [${i}] title: ${title.slice(0, 60)}`)
    if (!/just a moment|attention required|checking/i.test(title)) break
  }

  const title = await page.title()
  const url = page.url()
  console.log('[3] landed:', title.slice(0, 60), '|', url.slice(0, 80))

  if (/just a moment|attention/i.test(title)) {
    await page.screenshot({ path: '/home/z/my-project/hackathon/shots/30_cf_stuck.png' })
    console.log('RESULT=CF_STUCK')
    await browser.close()
    xvfb.kill()
    return
  }

  const html = await page.content()
  fs.writeFileSync('/home/z/my-project/hackathon/manage_pw.html', html)
  const loggedIn = html.includes('Log out')
  console.log('[4] logged in:', loggedIn)

  if (!loggedIn) {
    await page.screenshot({ path: '/home/z/my-project/hackathon/shots/31_not_logged_in.png' })
    console.log('RESULT=NOT_LOGGED_IN')
    await browser.close()
    xvfb.kill()
    return
  }

  // Save storage state for later runs
  await context.storageState({ path: '/home/z/my-project/hackathon/devpost_state.json' })

  // Find the "Create project" button (blank state CTA with invisible recaptcha)
  const createBtn = page.locator('form#create-project-blank-state-cta button[type="submit"]').first()
  const btnCount = await createBtn.count()
  console.log('[5] create button count:', btnCount)

  if (btnCount === 0) {
    // Maybe a project already exists — dump the page for analysis
    console.log('RESULT=NO_BLANK_STATE (project may already exist)')
    await page.screenshot({ path: '/home/z/my-project/hackathon/shots/32_manage_state.png' })
    await browser.close()
    xvfb.kill()
    return
  }

  await page.screenshot({ path: '/home/z/my-project/hackathon/shots/33_before_create.png' })
  console.log('[6] clicking Create project (invisible recaptcha will run)...')

  // Click and wait for navigation (recaptcha callback submits the form)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}),
    createBtn.click(),
  ])

  // Give it time; invisible recaptcha may take a few seconds
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2500)
    const t = await page.title()
    console.log(`   [post ${i}] ${t.slice(0, 60)} | ${page.url().slice(0, 90)}`)
    if (!/just a moment/i.test(t) && !page.url().includes('manage/submissions')) break
  }

  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/z/my-project/hackathon/shots/34_after_create.png' })
  const afterHtml = await page.content()
  fs.writeFileSync('/home/z/my-project/hackathon/after_create.html', afterHtml)
  await context.storageState({ path: '/home/z/my-project/hackathon/devpost_state.json' })

  console.log('[7] final URL:', page.url())
  console.log('RESULT=DONE url=' + page.url())

  await browser.close()
  xvfb.kill()
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
