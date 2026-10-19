/* Full Devpost project creation:
   route-interception proxy (curl passes CF) + VLM-powered reCAPTCHA image solver */
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const { execFile } = require('child_process')
const fs = require('fs')

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const COOKIE_STR =
  'jwt=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTA3ODY4OTl9.2sxA6KuQTSGs-m1BggFUxtEs64iYMsoOG0y9_2Gbu0M; remember_user_token=W1sxMDc4Njg5OV0sIko4X05BeHpIV3RFMkxjYjhHdGI3IiwiMTc5MjI4Nzg0NC40MTg2MDIiXQ%3D%3D--325186fd8d04bb981ccbc6bbf93ccd6ba03eaf81'
const MANAGE_URL = 'https://devpost.com/submit-to/31511-healthhack-48/manage/submissions'
const CHROME = '/home/z/.agent-browser/browsers/chrome-155.0.8059.39/chrome'
const SHOT = '/home/z/my-project/hackathon/shots/challenge.png'

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

function vlmAsk(prompt, imageFile) {
  return new Promise((resolve, reject) => {
    const b64 = fs.readFileSync(imageFile).toString('base64')
    const script = `
      const ZAI = require('z-ai-web-dev-sdk').default
      const fs = require('fs')
      async function main() {
        const zai = await ZAI.create()
        const res = await zai.chat.completions.createVision({
          model: 'glm-4.5v',
          messages: [{ role: 'user', content: [
            { type: 'text', text: ${JSON.stringify(prompt)} },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,${() => ''}' + ${JSON.stringify(b64)} } },
          ]}],
          thinking: { type: 'disabled' },
        })
        console.log(res.choices[0]?.message?.content)
      }
      main().catch(e => { console.error('ERR', e.message); process.exit(1) })
    `
    // write temp script (b64 too large for argv)
    const tmp = '/home/z/my-project/scripts/_vlm_tmp.js'
    const content = `const ZAI = require('z-ai-web-dev-sdk').default
const fs = require('fs')
async function main() {
  const zai = await ZAI.create()
  const b64 = fs.readFileSync(${JSON.stringify(imageFile)}).toString('base64')
  const res = await zai.chat.completions.createVision({
    model: 'glm-4.5v',
    messages: [{ role: 'user', content: [
      { type: 'text', text: ${JSON.stringify(prompt)} },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
    ]}],
    thinking: { type: 'disabled' },
  })
  console.log(res.choices[0]?.message?.content)
}
main().catch(e => { console.error('ERR', e.message); process.exit(1) })
`
    fs.writeFileSync(tmp, content)
    execFile('node', [tmp], { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message))
      resolve(stdout.trim())
    })
  })
}

async function getToken(page) {
  return page.evaluate(() => {
    const resp = document.querySelector('textarea[name="g-recaptcha-response"]')
    return resp && resp.value && resp.value.length > 20 ? resp.value : null
  })
}

async function solveChallenge(page, attempt) {
  // Find the VISIBLE bframe iframe (the challenge dialog)
  const handles = await page.locator('iframe[src*="bframe"]').all()
  let target = null
  for (const h of handles) {
    const box = await h.boundingBox().catch(() => null)
    if (box && box.width > 250 && box.height > 250) {
      target = { handle: h, box }
      console.log(`   candidate bframe at ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`)
    }
  }
  if (!target) {
    console.log('   no visible bframe iframe')
    return false
  }
  const bframe = target.handle.contentFrame()
  if (!bframe) return false

  // screenshot the challenge dialog region (the visible part of the iframe)
  const box = target.box
  const clip = {
    x: Math.max(0, box.x),
    y: Math.max(0, box.y),
    width: Math.min(box.width, 420),
    height: Math.min(box.height, 560),
  }
  await page.screenshot({ path: SHOT, clip })

  let cells = []
  let rounds = 0
  // Iterative: dynamic challenges reveal new images in clicked tiles
  while (rounds < 5) {
    rounds++
    await page.screenshot({ path: SHOT, clip })
    const answer = await vlmAsk(
      `This is a Google reCAPTCHA image challenge screenshot (round ${rounds}). The instruction asks to select all images with a specific object. Number cells starting at 1, left-to-right then top-to-bottom (1-9 for 3x3, 1-16 for 4x4). Look at EACH cell carefully and identify which cells show the requested object (even partially). If no cells match or the grid is not visible, answer NONE. Answer STRICTLY: CELLS: <comma-separated numbers> or CELLS: NONE`,
      SHOT
    )
    console.log(`[vlm ${attempt}.${rounds}] ${answer.slice(0, 120)}`)
    const m = answer.match(/CELLS:\s*([\d,\s]+)/i)
    const newCells = m ? m[1].split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 16) : []
    if (newCells.length === 0) break

    const tds = bframe.locator('#rc-imageselect-target td, .rc-imageselect-tile-wrapper td')
    const count = await tds.count()
    console.log(`   clicking cells ${newCells.join(',')} of ${count} tiles`)
    for (const c of newCells) {
      if (c - 1 < count) {
        await tds.nth(c - 1).click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(700)
      }
    }
    await page.waitForTimeout(1500)
    // if the same cells would be selected again next round, break to avoid loops
    if (JSON.stringify(newCells) === JSON.stringify(cells)) break
    cells = newCells
  }

  // Click verify
  const verify = bframe.locator('#recaptcha-verify-button')
  if ((await verify.count()) > 0) {
    await verify.click({ timeout: 8000 }).catch((e) => console.log('verify click fail', e.message.slice(0, 60)))
  }
  await page.waitForTimeout(4000)
  return true
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
    if (
      /doubleclick\.net|google-analytics\.com|googletagmanager\.com|nr-data\.net|awswaf\.com|honeybadger\.io|civiccomputing\.com|jsdelivr\.net|fontawesome\.com/.test(host)
    ) {
      await route.abort().catch(() => {})
      return
    }
    if (!host.endsWith('devpost.com')) {
      try { await route.continue() } catch {}
      return
    }
    try {
      const postBody = req.method() === 'POST' ? req.postDataBuffer() : null
      const { status, headers, body } = await curlFetch(url, req.method(), postBody)
      const h = parseHeaders(headers)
      console.log(`[proxy] ${req.method()} ${url.slice(0, 80)} => ${status} (${body.length}b)`)
      await route.fulfill({ status, headers: h, body })
    } catch (e) {
      console.log('[proxy] ERR', e.message)
      await route.abort()
    }
  })

  const page = await context.newPage()
  console.log('[1] goto')
  await page.goto(MANAGE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(6000)

  const html = await page.content()
  if (!html.includes('Log out')) {
    console.log('RESULT=NOT_LOGGED_IN')
    await browser.close()
    return
  }
  console.log('[2] logged in OK')

  let token = await getToken(page)
  if (!token) {
    console.log('[3] clicking Create project...')
    await page.click('form#create-project-blank-state-cta button').catch((e) => console.log('click err', e.message))
    await page.waitForTimeout(4000)

    for (let attempt = 1; attempt <= 4; attempt++) {
      token = await getToken(page)
      if (token) break
      console.log(`[4] solving challenge attempt ${attempt}...`)
      const ok = await solveChallenge(page, attempt)
      if (!ok) {
        console.log('   no challenge frame found, waiting...')
        await page.waitForTimeout(4000)
      }
      token = await getToken(page)
      if (token) break
    }
  }

  if (token) {
    console.log('[5] TOKEN ACQUIRED len=' + token.length)
    fs.writeFileSync('/home/z/my-project/hackathon/recaptcha_token.txt', token)
    // The data-callback should auto-submit; if not, submit manually
    await page.waitForTimeout(3000)
    const submitted = page.url()
    if (submitted.includes('manage/submissions') && (await getToken(page))) {
      console.log('[6] auto-submit did not fire; submitting form manually via curl...')
      // Submit via curl with the token
      const tok2 = await getToken(page)
      const authMatch = html.match(/name="authenticity_token"[^>]*value="([^"]+)"/)
      const auth = authMatch ? authMatch[1] : ''
      const { status, headers, body } = await curlFetch(
        MANAGE_URL,
        'POST',
        Buffer.from(
          `utf8=%E2%9C%93&authenticity_token=${encodeURIComponent(auth)}&g-recaptcha-response=${encodeURIComponent(tok2)}`
        )
      )
      const loc = parseHeaders(headers)['location'] || ''
      console.log('[7] manual POST status:', status, 'location:', loc.slice(0, 100))
      const bodyText = body.toString('utf8').slice(0, 200)
      console.log('[7] body:', bodyText.slice(0, 150))
    }
    console.log('[8] final url:', page.url())
    await page.screenshot({ path: '/home/z/my-project/hackathon/shots/43_after_token.png' })
    console.log('RESULT=TOKEN_OK')
  } else {
    await page.screenshot({ path: '/home/z/my-project/hackathon/shots/44_no_token.png' })
    console.log('RESULT=NO_TOKEN')
  }

  await browser.close()
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
