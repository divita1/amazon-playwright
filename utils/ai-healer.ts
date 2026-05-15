import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { FixProposal } from './fix-validator'

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

const LOG_FILE = path.join(__dirname, '../logs/agent.log')

export type DiagnosisResult = {
    rootCause: string
    fixType: 'locator' | 'timing' | 'navigation' | 'assertion_logic' | 'app_bug' | 'unknown'
    isAppBug: boolean
    confidence: 'high' | 'medium' | 'low'
    fix: FixProposal | null
    reasoning: string
}

export function writeLog(entry: object): void {
    const logsDir = path.dirname(LOG_FILE)
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n'
    fs.appendFileSync(LOG_FILE, line)
    console.log(`[Agent Log] ${JSON.stringify(entry)}`)
}

export async function diagnoseFailure(params: {
    testName: string
    testFile: string
    error: string
    screenshotPath: string | null
    projectRoot: string
    attempt: number
}): Promise<DiagnosisResult> {

    const testFilePath = path.join(params.projectRoot, params.testFile)
    const testContent = fs.existsSync(testFilePath) ? fs.readFileSync(testFilePath, 'utf-8') : 'not found'

    // Find related page object and locator files
    const relatedFiles = findRelatedFiles(testContent, params.projectRoot)

    const contextParts: Anthropic.MessageParam['content'] = []

    // Add screenshot if available
    if (params.screenshotPath && fs.existsSync(params.screenshotPath)) {
        const screenshotBuffer = fs.readFileSync(params.screenshotPath)
        const base64Image = screenshotBuffer.toString('base64')
        contextParts.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64Image },
        })
    }

    contextParts.push({
        type: 'text',
        text: buildPrompt(params, testContent, relatedFiles),
    })

    writeLog({
        event: 'diagnosis_start',
        testName: params.testName,
        attempt: params.attempt,
        relatedFiles: Object.keys(relatedFiles),
    })

    const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        messages: [{ role: 'user', content: contextParts }],
    })

    const raw = (response.content[0] as { text: string }).text.trim()

    let result: DiagnosisResult
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        result = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
        result = {
            rootCause: 'Could not parse Claude response',
            fixType: 'unknown',
            isAppBug: false,
            confidence: 'low',
            fix: null,
            reasoning: raw,
        }
    }

    writeLog({
        event: 'diagnosis_result',
        testName: params.testName,
        attempt: params.attempt,
        rootCause: result.rootCause,
        fixType: result.fixType,
        isAppBug: result.isAppBug,
        confidence: result.confidence,
    })

    return result
}

function buildPrompt(
    params: { testName: string; error: string; attempt: number },
    testContent: string,
    relatedFiles: Record<string, string>
): string {
    const relatedContent = Object.entries(relatedFiles)
        .map(([file, content]) => `\n--- ${file} ---\n${content}`)
        .join('\n')

    return `You are a senior QA automation engineer responsible for production quality.
A Playwright test has failed. Your job is to diagnose the root cause and propose a minimal, safe fix.

STRICT RULES — you must follow these without exception:
1. NEVER remove, weaken, or change assertions (expect() calls)
2. NEVER skip a test or add .skip
3. NEVER change expected values to match wrong actual values
4. If the app itself is broken (e.g., button missing, page not loading), mark it as app_bug — do NOT fix the test to hide it
5. Only fix automation issues: broken locators, wrong selectors, missing waits, wrong navigation
6. Your fix must be the MINIMUM change needed — do not refactor

TEST NAME: ${params.testName}
ATTEMPT: ${params.attempt} of 3
ERROR: ${params.error}

TEST FILE CONTENT:
${testContent}

RELATED FILES:
${relatedContent}

${params.attempt > 1 ? 'NOTE: Previous fix attempt failed. Think differently — the first approach did not work.' : ''}

Respond ONLY with valid JSON in this exact format:
{
  "rootCause": "clear one-line description of why it failed",
  "fixType": "locator|timing|navigation|assertion_logic|app_bug|unknown",
  "isAppBug": false,
  "confidence": "high|medium|low",
  "reasoning": "explain your diagnosis and why this fix is safe",
  "fix": {
    "fileToFix": "relative path to file to change (e.g. properties/search.locators.ts)",
    "oldCode": "exact current code to replace",
    "newCode": "replacement code",
    "reasoning": "why this specific change fixes the root cause",
    "fixType": "locator|timing|navigation|assertion_logic|unknown"
  }
}

If it is an app bug or you cannot safely fix it, set "fix": null and explain in reasoning.`
}

function findRelatedFiles(testContent: string, projectRoot: string): Record<string, string> {
    const files: Record<string, string> = {}
    const importMatches = testContent.match(/@\/[^'"]+/g) || []

    for (const imp of importMatches) {
        const relativePath = imp.replace('@/', '') + '.ts'
        const fullPath = path.join(projectRoot, relativePath)
        if (fs.existsSync(fullPath)) {
            files[relativePath] = fs.readFileSync(fullPath, 'utf-8')
        }
    }

    return files
}
