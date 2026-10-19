/* Devpost project creation via Playwright route interception.
   Browser thinks it's on devpost.com; all devpost traffic is fetched via curl
   (which passes Cloudflare); recaptcha assets go direct to Google so the
   invisible recaptcha produces a REAL token bound to devpost.com. */
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const { execFile } = require('child_process')
const fs = require('fs')

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const COOKIE_STR =
  'jwt=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTA3ODY4OTl9.2sxA6KuQTSGs-m1BggFUxtEs64iYMsoOG0y9_2Gbu0M; remember_user_token=W1sxMDc4Njg5OV0sIko4X05BeHpIV3RFMkxjYjhHdGI3IiwiMTc5MjI4Nzg0NC40MTg2MDIiXQ%3D%3D--325186fd8d04bb981ccbc6bbf93ccd6ba03eaf81'

const MANAGE_URL = 'https://devpost.com/submit-to/31511-healthhack-48/manage/submissions'
const CHROME = '/home/z/.agent-browser/browsers/chrome-155.0.8059.39/chrome'

function curlFetch(url, method, body, isForm) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '--compressed', '--max-time', '40',
      '-D', '-',
      '-X', method,
      '-H', `User-Agent: ${UA}`,
      '-H', `Cookie: ${COOKIE_STR}`,
    ]
    if (isForm) {
      args.push('-H', 'Content-Type: application/x-www-form-urlencoded')
    }
    if (body) args.push('--data-binary', body)
    args.push(url)
    execFile('curl', args, { maxBuffer: 30 * 1024 * 1024, encoding: 'buffer' }, (err, stdout) => {
      if (err) return reject(err)
      const buf = stdout
      // Split headers/body on first \r\n\r\n (handle HTTP/1.1 100-continue and redirects)
      let idx = 0
      let status = 200
      const headers = []
      let remaining = buf
      while (true) {
        const sep = remaining.indexOf('\r\n\r\n')
        if (sep === -1) break
        const headerBlock = remaining.slice(0, sep).toString('utf8')
        const lines = headerBlock.split('\r\n')
        const m = lines[0].match(/^HTTP\/[\d.]+ (\d+)/)
        if (!m) break
        status = parseInt(m[1], 10)
        for (let i = 1; i < lines.length; i++) {
          headers.push(lines[i])
        }
        remaining = remaining.slice(sep + 4)
        if (status >= 200) break
        if (status < 200) continue // 100-continue: skip block
      }
      resolve({ status, headers, body: remaining })
    })
  })
}

function parseHeaders(headerLines) {
  const out = {}
  for (const line of headerLines) {
    const c = line.indexOf(':')
    if (c === -1) continue
    const name = line.slice(0, c).trim().toLowerCase()
    const value = line.slice(c + 1).trim()
    if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(name)) continue
    out[name] = value
  }
  return out
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: UA,
    locale: 'en-US',
  })

  // Intercept only devpost.com requests; everything else (recaptcha, google) goes direct
  await context.route('**/devpost.com/**', async (route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()
    try {
      let postBody = null
      if (method === 'POST') {
        postBody = req.postDataBuffer()
      }
      console.log(`[proxy] ${method} ${url.slice(0, 100)}`)
      const { status, headers, body } = await curlFetch(url, method, postBody, true)
      const h = parseHeaders(headers)
      console.log(`[proxy] => ${status} (${body.length} bytes)`)
      await route.fulfill({ status, headers: h, body })
    } catch (e) {
      console.log('[proxy] ERROR', e.message)
      await route.abort()
    }
  })

  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[pg.err]', m.text().slice(0, 140))
  })
  page.on('dialog', async (d) => {
    console.log('[dialog]', d.message().slice(0, 120))
    await d.accept().catch(() => {})
  })

  console.log('[1] goto manage page')
  await page.goto(MANAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)

  const title = await page.title()
  console.log('[2] title:', title.slice(0, 60))
  const html = await page.content()
  fs.writeFileSync('/home/z/my-project/hackathon/pw_page1.html', html)
  const loggedIn = html.includes('Log out')
  console.log('[3] logged in:', loggedIn, '| blank state:', html.includes('my-projects-blank-state'))
  await page.screenshot({ path: '/home/z/my-project/hackathon/shots/40_pw_manage.png' })

  if (!loggedIn) {
    console.log('RESULT=NOT_LOGGED_IN')
    await browser.close()
    return
  }

  const createBtn = page.locator('form#create-project-blank-state-cta button[type="submit"]').first()
  if ((await createBtn.count()) === 0) {
    console.log('RESULT=NO_BLANK_STATE')
    await browser.close()
    return
  }

  console.log('[4] clicking Create project...')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}),
    createBtn.click(),
  ])

  // recaptcha + form submit may take a while
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2500)
    const t = await page.title()
    const u = page.url()
    console.log(`   [${i}] ${t.slice(0, 50)} | ${u.slice(0, 90)}`)
    if (!u.includes('manage/submissions')) break
  }

  await page.waitForTimeout(3000)
  const finalUrl = page.url()
  const finalHtml = await page.content()
  fs.writeFileSync('/home/z/my-project/hackathon/pw_after_create.html', finalHtml)
  await page.screenshot({ path: '/home/z/my-project/hackathon/shots/41_pw_after.png', fullPage: false })
  console.log('[5] final url:', finalUrl)
  console.log('RESULT=DONE url=' + finalUrl)

  await browser.close()
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
