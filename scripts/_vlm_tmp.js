const ZAI = require('z-ai-web-dev-sdk').default
const fs = require('fs')
async function main() {
  const zai = await ZAI.create()
  const b64 = fs.readFileSync("/home/z/my-project/hackathon/shots/challenge.png").toString('base64')
  const res = await zai.chat.completions.createVision({
    model: 'glm-4.5v',
    messages: [{ role: 'user', content: [
      { type: 'text', text: "This is a Google reCAPTCHA image challenge screenshot (round 2). The instruction asks to select all images with a specific object. Number cells starting at 1, left-to-right then top-to-bottom (1-9 for 3x3, 1-16 for 4x4). Look at EACH cell carefully and identify which cells show the requested object (even partially). If no cells match or the grid is not visible, answer NONE. Answer STRICTLY: CELLS: <comma-separated numbers> or CELLS: NONE" },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
    ]}],
    thinking: { type: 'disabled' },
  })
  console.log(res.choices[0]?.message?.content)
}
main().catch(e => { console.error('ERR', e.message); process.exit(1) })
