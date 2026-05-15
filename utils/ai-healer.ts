import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

const LOG_FILE = path.join(__dirname, '../logs/heal.log')

function writeLog(entry: object) {
    const logsDir = path.dirname(LOG_FILE)
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n'
    fs.appendFileSync(LOG_FILE, line)
}

export async function suggestFix(params: {
    error: string
    locator: string
    screenshotPath: string
}): Promise<string | null> {
    try {
        const screenshotBuffer = fs.readFileSync(params.screenshotPath)
        const base64Image = screenshotBuffer.toString('base64')

        writeLog({
            event: 'heal_attempt',
            locator: params.locator,
            error: params.error,
        })

        const response = await client.messages.create({
            model: 'claude-opus-4-7',
            max_tokens: 256,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: base64Image,
                            },
                        },
                        {
                            type: 'text',
                            text: `A Playwright test failed because this locator did not find an element: "${params.locator}"
Error: ${params.error}

Look at the screenshot and suggest ONE better CSS selector or role-based locator that would find the same element.
Reply with ONLY the locator string, nothing else. Example: #add-to-cart-button or [data-feature-id="add-to-cart"]`,
                        },
                    ],
                },
            ],
        })

        const suggested = (response.content[0] as { text: string }).text.trim()

        writeLog({
            event: 'heal_suggestion',
            original: params.locator,
            suggested,
        })

        return suggested
    } catch (err) {
        writeLog({ event: 'heal_error', error: String(err) })
        return null
    }
}
