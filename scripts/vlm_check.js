const ZAI = require('z-ai-web-dev-sdk').default
const fs = require('fs')

async function main() {
  const file = process.argv[2]
  const prompt = process.argv[3] || 'Describe this screenshot.'
  const zai = await ZAI.create()
  const b64 = fs.readFileSync(file).toString('base64')
  const res = await zai.chat.completions.createVision({
    model: 'glm-4.5v',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  console.log(res.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
