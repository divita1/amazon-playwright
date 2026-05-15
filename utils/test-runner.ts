import { spawnSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

export type TestResult = {
    passed: number
    failed: number
    failures: TestFailure[]
}

export type TestFailure = {
    testName: string
    testFile: string
    error: string
    screenshotPath: string | null
}

const JSON_REPORT_PATH = path.join(__dirname, '../test-results/agent-results.json')

export function runTests(projectRoot: string): TestResult {
    // Clean previous report
    if (fs.existsSync(JSON_REPORT_PATH)) fs.unlinkSync(JSON_REPORT_PATH)

    const result = spawnSync(
        'npx',
        ['playwright', 'test', `--reporter=json`],
        {
            cwd: projectRoot,
            encoding: 'utf-8',
            env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: 'test-results/agent-results.json' },
            timeout: 300_000,
        }
    )

    return parseResults(projectRoot, result.stdout + result.stderr)
}

export function runSingleTest(projectRoot: string, testFile: string): TestResult {
    if (fs.existsSync(JSON_REPORT_PATH)) fs.unlinkSync(JSON_REPORT_PATH)

    const result = spawnSync(
        'npx',
        ['playwright', 'test', testFile, '--reporter=json'],
        {
            cwd: projectRoot,
            encoding: 'utf-8',
            env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: 'test-results/agent-results.json' },
            timeout: 180_000,
        }
    )

    return parseResults(projectRoot, result.stdout + result.stderr)
}

function parseResults(projectRoot: string, output: string): TestResult {
    const failures: TestFailure[] = []

    // Try JSON report file first
    if (fs.existsSync(JSON_REPORT_PATH)) {
        try {
            const json = JSON.parse(fs.readFileSync(JSON_REPORT_PATH, 'utf-8'))
            const passed = json.stats?.expected ?? 0
            const failed = json.stats?.unexpected ?? 0

            for (const suite of json.suites ?? []) {
                collectFailures(suite, failures, projectRoot)
            }

            return { passed, failed, failures }
        } catch {
            // Fall through to text parsing
        }
    }

    // Fallback — parse text output
    const passedMatch = output.match(/(\d+) passed/)
    const failedMatch = output.match(/(\d+) failed/)
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0

    if (failed > 0) {
        const errorBlocks = output.split(/\d+\) /).slice(1)
        for (const block of errorBlocks) {
            const lines = block.split('\n')
            const testName = lines[0]?.trim() ?? 'unknown'
            const errorLine = lines.find(l => l.trim().startsWith('Error:') || l.trim().startsWith('TimeoutError:'))
            const specMatch = block.match(/tests\/[^\s:]+\.spec\.ts/)

            failures.push({
                testName,
                testFile: specMatch ? specMatch[0] : 'tests/amazon/amazon-cart.spec.ts',
                error: errorLine ?? block.slice(0, 300),
                screenshotPath: findScreenshot(path.join(projectRoot, 'test-results')),
            })
        }
    }

    return { passed, failed, failures }
}

function collectFailures(suite: any, failures: TestFailure[], projectRoot: string): void {
    for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
            for (const result of test.results ?? []) {
                if (result.status === 'failed' || result.status === 'timedOut') {
                    const errorMsg = result.errors?.map((e: any) => e.message).join('\n') ?? 'Unknown error'
                    const screenshotAttachment = result.attachments?.find((a: any) => a.name === 'screenshot')

                    failures.push({
                        testName: spec.title,
                        testFile: suite.file ?? 'tests/amazon/amazon-cart.spec.ts',
                        error: errorMsg,
                        screenshotPath: screenshotAttachment?.path ?? findScreenshot(path.join(projectRoot, 'test-results')),
                    })
                }
            }
        }
    }

    for (const child of suite.suites ?? []) {
        collectFailures(child, failures, projectRoot)
    }
}

function findScreenshot(resultsDir: string): string | null {
    if (!fs.existsSync(resultsDir)) return null
    const entries = fs.readdirSync(resultsDir, { withFileTypes: true })
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const p = path.join(resultsDir, entry.name, 'test-failed-1.png')
            if (fs.existsSync(p)) return p
        }
    }
    return null
}
