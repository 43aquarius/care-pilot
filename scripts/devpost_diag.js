/* Diagnose recaptcha state inside the proxied Devpost page */
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const { execFile } = require('child_process')

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const COOKIE_STR =
  'jwt=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTA3ODY4OTl9.2sxA6KuQTSGs-m1BggFUxtEs64iYMsoOG0y9_2Gbu0M; remember_user_token=W1sxMDc4Njg5OV0sIko4X05BeHpIV3RFMkxjYjhHdGI3IiwiMTc5MjI4Nzg0NC40MTg2MDIiXQ%3D%3D--325186fd8d04bb981ccbc6bbf93ccd6ba03eaf81'
const MANAGE_URL = 'https://devpost.com/submit-to/31511-healthhack-48/manage/submissions'
const CHROME = '/home/z/.agent-browser/browsers/chrome-155.0.8059.39/chrome'

function curlFetch(url, method, body) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '--compressed', '--max-time', '40', '-D', '-', '-X', method,
      '-H', `User-Agent: ${UA}`, '-H', `Cookie: ${COOKIE_STR}`,
    ]
    if (method === 'POST') args.push('-H', 'Content-Type: application/x-www-form-urlencoded')
    if (body) args.push('--data-binary', body)
    args.push(url)
    execFile('curl', args, { maxBuffer: 30 * 1024 * 1024, encoding: 'buffer' }, (err, stdout) => {
      if (err) return reject(err)
      let remaining = stdout
      let status = 200
      const headers = []
      while (true) {
        const sep = remaining.indexOf('\r\n\r\n')
        if (sep === -1) break
        const lines = remaining.slice(0, sep).toString('utf8').split('\r\n')
        const m = lines[0].match(/^HTTP\/[\d.]+ (\d+)/)
        if (!m) break
        status = parseInt(m[1], 10)
        for (let i = 1; i < lines.length; i++) headers.push(lines[i])
        remaining = remaining.slice(sep + 4)
        if (status >= 200) break
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'en-US' })

  await context.route('**/*', async (route) => {
    const req = route.request()
    const url = req.url()
    const host = new URL(url).hostname
    // Block noisy third parties
    if (
      /doubleclick\.net|google-analytics\.com|googletagmanager\.com|nr-data\.net|awswaf\.com|honeybadger\.io|civiccomputing\.com|jsdelivr\.net|fontawesome\.com/.test(host)
    ) {
      await route.abort().catch(() => {})
      return
    }
    const isDevpost = host.endsWith('devpost.com')
    if (!isDevpost) {
      // let non-devpost requests go direct; log them
      console.log(`[direct] ${req.method()} ${url.slice(0, 90)}`)
      try {
        await route.continue()
      } catch {}
      return
    }
    try {
      const postBody = req.method() === 'POST' ? req.postDataBuffer() : null
      console.log(`[proxy] ${req.method()} ${url.slice(0, 100)}`)
      const { status, headers, body } = await curlFetch(url, req.method(), postBody)
      const h = parseHeaders(headers)
      console.log(`[proxy] => ${status} (${body.length}b)`)
      await route.fulfill({ status, headers: h, body })
    } catch (e) {
      console.log('[proxy] ERR', e.message)
      await route.abort()
    }
  })

  const page = await context.newPage()
  page.on('requestfailed', (r) => console.log(`[FAILED] ${r.url().slice(0, 100)} :: ${r.failure()?.errorText}`))
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[pg.err]', m.text().slice(0, 150))
  })

  await page.goto(MANAGE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(8000)

  const state = await page.evaluate(() => {
    const btn = document.querySelector('form#create-project-blank-state-cta button')
    return {
      title: document.title,
      grecaptchaLoaded: typeof window.grecaptcha !== 'undefined',
      btnExists: !!btn,
      btnDisabled: btn ? btn.disabled : null,
      recaptchaFrames: Array.from(document.querySelectorAll('iframe')).map((f) => (f.src || '').slice(0, 80)),
      recaptchaScripts: Array.from(document.querySelectorAll('script[src*=recaptcha]')).map((s) => s.src),
      sitekey: btn ? btn.dataset.sitekey : null,
    }
  })
  console.log('STATE:', JSON.stringify(state, null, 1))

  // Try executing recaptcha manually via the button click and watch what happens
  await page.click('form#create-project-blank-state-cta button', { timeout: 10000 }).catch((e) => console.log('click err:', e.message))
  await page.waitForTimeout(10000)

  const state2 = await page.evaluate(() => {
    const resp = document.querySelector('textarea[name="g-recaptcha-response"]')
    return {
      url: location.href.slice(0, 90),
      tokenPresent: !!(resp && resp.value && resp.value.length > 20),
      tokenLen: resp && resp.value ? resp.value.length : 0,
    }
  })
  console.log('AFTER CLICK:', JSON.stringify(state2))
  await page.screenshot({ path: '/home/z/my-project/hackathon/shots/42_diag.png' })

  await browser.close()
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
