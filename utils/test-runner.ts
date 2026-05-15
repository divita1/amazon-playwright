import { execSync, spawnSync } from 'child_process'
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

export function runTests(projectRoot: string): TestResult {
    const resultsDir = path.join(projectRoot, 'test-results')
    const jsonReport = path.join(projectRoot, 'test-results', 'results.json')

    const result = spawnSync(
        'npx',
        ['playwright', 'test', '--reporter=json'],
        {
            cwd: projectRoot,
            encoding: 'utf-8',
            env: { ...process.env },
            timeout: 300_000,
        }
    )

    const output = result.stdout + result.stderr

    // Parse failures from output since JSON reporter writes to stdout
    const failures: TestFailure[] = []
    const lines = output.split('\n')

    let currentTest = ''
    let currentError = ''
    let capture = false

    for (const line of lines) {
        if (line.includes('›') && line.includes('──')) {
            currentTest = line.replace(/.*›/, '').replace(/──.*/, '').trim()
            capture = true
            currentError = ''
        } else if (capture && line.trim().startsWith('at ')) {
            capture = false
            if (currentTest && currentError) {
                const screenshot = findScreenshot(resultsDir, currentTest)
                failures.push({
                    testName: currentTest,
                    testFile: extractTestFile(lines, currentTest),
                    error: currentError.trim(),
                    screenshotPath: screenshot,
                })
            }
        } else if (capture) {
            currentError += line + '\n'
        }
    }

    const passedMatch = output.match(/(\d+) passed/)
    const failedMatch = output.match(/(\d+) failed/)

    return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : failures.length,
        failures,
    }
}

export function runSingleTest(projectRoot: string, testFile: string): TestResult {
    const result = spawnSync(
        'npx',
        ['playwright', 'test', testFile, '--reporter=line'],
        {
            cwd: projectRoot,
            encoding: 'utf-8',
            env: { ...process.env },
            timeout: 180_000,
        }
    )

    const output = result.stdout + result.stderr
    const failures: TestFailure[] = []

    if (result.status !== 0) {
        const errorMatch = output.match(/Error:([^\n]+(?:\n(?!\s+at\s).*)*)/m)
        const errorMsg = errorMatch ? errorMatch[0].trim() : output.slice(0, 500)

        const resultsDir = path.join(projectRoot, 'test-results')
        const screenshot = findScreenshot(resultsDir, testFile)

        failures.push({
            testName: testFile,
            testFile,
            error: errorMsg,
            screenshotPath: screenshot,
        })
    }

    const passedMatch = output.match(/(\d+) passed/)
    return {
        passed: result.status === 0 ? 1 : (passedMatch ? parseInt(passedMatch[1]) : 0),
        failed: result.status !== 0 ? 1 : 0,
        failures,
    }
}

function findScreenshot(resultsDir: string, testName: string): string | null {
    if (!fs.existsSync(resultsDir)) return null
    const entries = fs.readdirSync(resultsDir, { withFileTypes: true })
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const screenshotPath = path.join(resultsDir, entry.name, 'test-failed-1.png')
            if (fs.existsSync(screenshotPath)) return screenshotPath
        }
    }
    return null
}

function extractTestFile(lines: string[], testName: string): string {
    for (const line of lines) {
        if (line.includes('.spec.ts') && line.includes('›')) {
            const match = line.match(/tests\/[^\s]+\.spec\.ts/)
            if (match) return match[0]
        }
    }
    return 'tests/amazon/amazon-cart.spec.ts'
}
