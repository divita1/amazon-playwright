import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config()

import { runTests, runSingleTest } from '../utils/test-runner'
import { diagnoseFailure, writeLog } from '../utils/ai-healer'
import { validateFix } from '../utils/fix-validator'
import { initGitBranch, commitFix, pushBranch, hasChanges, AgentFix } from '../utils/git-manager'

const PROJECT_ROOT = path.join(__dirname, '..')
const MAX_RETRIES = 3

type AgentReport = {
    totalTests: number
    passed: number
    autoFixed: number
    needsHumanReview: string[]
    appBugs: string[]
    fixes: AgentFix[]
}

async function applyFix(fileToFix: string, oldCode: string, newCode: string): Promise<void> {
    const fullPath = path.join(PROJECT_ROOT, fileToFix)
    if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${fullPath}`)
    const content = fs.readFileSync(fullPath, 'utf-8')
    if (!content.includes(oldCode.trim())) {
        throw new Error(`Old code not found in ${fileToFix}. Code may have already changed.`)
    }
    const updated = content.replace(oldCode, newCode)
    fs.writeFileSync(fullPath, updated, 'utf-8')
}

async function run(): Promise<void> {
    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║     Autonomous QA Agent — Starting       ║')
    console.log('╚══════════════════════════════════════════╝\n')

    writeLog({ event: 'agent_start', projectRoot: PROJECT_ROOT })

    const report: AgentReport = {
        totalTests: 0,
        passed: 0,
        autoFixed: 0,
        needsHumanReview: [],
        appBugs: [],
        fixes: [],
    }

    // Step 1 — Run all tests
    console.log('► Running all tests...\n')
    let results = runTests(PROJECT_ROOT)
    report.totalTests = results.passed + results.failed
    report.passed = results.passed

    if (results.failed === 0) {
        console.log('✅ All tests passed. Nothing to fix.\n')
        printReport(report)
        return
    }

    console.log(`\n⚠️  ${results.failed} test(s) failed. Starting diagnosis...\n`)

    // Step 2 — Create fix branch
    const branchName = initGitBranch(PROJECT_ROOT)
    console.log(`► Created branch: ${branchName}\n`)
    writeLog({ event: 'branch_created', branch: branchName })

    // Step 3 — Fix each failure
    for (const failure of results.failures) {
        console.log(`\n┌─────────────────────────────────────────`)
        console.log(`│ Fixing: ${failure.testName}`)
        console.log(`└─────────────────────────────────────────`)

        let fixed = false

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            console.log(`\n  [Attempt ${attempt}/${MAX_RETRIES}] Diagnosing...`)

            const diagnosis = await diagnoseFailure({
                testName: failure.testName,
                testFile: failure.testFile,
                error: failure.error,
                screenshotPath: failure.screenshotPath,
                projectRoot: PROJECT_ROOT,
                attempt,
            })

            console.log(`  Root cause  : ${diagnosis.rootCause}`)
            console.log(`  Fix type    : ${diagnosis.fixType}`)
            console.log(`  Confidence  : ${diagnosis.confidence}`)
            console.log(`  Reasoning   : ${diagnosis.reasoning}`)

            // App bug — don't fix, flag for human
            if (diagnosis.isAppBug) {
                console.log(`\n  ⛔ APP BUG DETECTED — not fixing test. This needs a developer.\n`)
                writeLog({ event: 'app_bug_detected', testName: failure.testName, rootCause: diagnosis.rootCause })
                report.appBugs.push(`${failure.testName}: ${diagnosis.rootCause}`)
                break
            }

            // No fix proposed
            if (!diagnosis.fix) {
                console.log(`\n  ⚠️  No fix proposed (confidence: ${diagnosis.confidence})`)
                if (attempt === MAX_RETRIES) {
                    report.needsHumanReview.push(`${failure.testName}: ${diagnosis.rootCause}`)
                }
                continue
            }

            // Validate the fix
            const fileToFix = path.join(PROJECT_ROOT, diagnosis.fix.fileToFix)
            const fileContent = fs.existsSync(fileToFix) ? fs.readFileSync(fileToFix, 'utf-8') : ''
            const validation = validateFix(diagnosis.fix, fileContent)

            if (!validation.approved) {
                console.log(`\n  ❌ Fix REJECTED by validator: ${validation.rejectionReason}`)
                writeLog({
                    event: 'fix_rejected',
                    testName: failure.testName,
                    attempt,
                    reason: validation.rejectionReason,
                    proposedFix: diagnosis.fix,
                })
                if (attempt === MAX_RETRIES) {
                    report.needsHumanReview.push(`${failure.testName}: Fix rejected — ${validation.rejectionReason}`)
                }
                continue
            }

            // Apply fix
            console.log(`\n  ✔ Fix approved. Applying to: ${diagnosis.fix.fileToFix}`)
            console.log(`  Old: ${diagnosis.fix.oldCode.trim().slice(0, 80)}...`)
            console.log(`  New: ${diagnosis.fix.newCode.trim().slice(0, 80)}...`)

            try {
                await applyFix(diagnosis.fix.fileToFix, diagnosis.fix.oldCode, diagnosis.fix.newCode)
            } catch (err) {
                console.log(`\n  ⚠️  Could not apply fix: ${err}`)
                continue
            }

            // Rerun the test
            console.log(`\n  ► Rerunning test...`)
            const rerun = runSingleTest(PROJECT_ROOT, failure.testFile)

            if (rerun.failed === 0) {
                console.log(`\n  ✅ Test now PASSING after fix.`)
                fixed = true
                report.autoFixed++
                report.fixes.push({
                    testName: failure.testName,
                    diagnosis: diagnosis.rootCause,
                    fixType: diagnosis.fixType,
                    fileFixed: diagnosis.fix.fileToFix,
                })
                writeLog({
                    event: 'fix_applied_and_verified',
                    testName: failure.testName,
                    attempt,
                    fileFixed: diagnosis.fix.fileToFix,
                    fix: diagnosis.fix,
                })
                break
            } else {
                console.log(`\n  ✗ Test still failing after fix. ${attempt < MAX_RETRIES ? 'Retrying...' : 'Max retries reached.'}`)
                // Revert the bad fix
                fs.writeFileSync(fileToFix, fileContent, 'utf-8')
                console.log(`  ↩ Reverted bad fix.`)
                writeLog({ event: 'fix_reverted', testName: failure.testName, attempt })
            }
        }

        if (!fixed && !report.appBugs.find(b => b.startsWith(failure.testName))) {
            if (!report.needsHumanReview.find(n => n.startsWith(failure.testName))) {
                report.needsHumanReview.push(`${failure.testName}: Could not auto-fix after ${MAX_RETRIES} attempts`)
            }
        }
    }

    // Step 4 — Commit and push if any fixes applied
    if (report.fixes.length > 0) {
        console.log('\n► Committing and pushing fixes...')
        commitFix(PROJECT_ROOT, report.fixes)
        pushBranch(PROJECT_ROOT, branchName)
        console.log(`✅ Pushed to branch: ${branchName}`)
        writeLog({ event: 'pushed', branch: branchName, fixes: report.fixes.length })
    } else {
        console.log('\n⚠️  No fixes applied — nothing to push.')
    }

    printReport(report)
    writeLog({ event: 'agent_complete', report })
}

function printReport(report: AgentReport): void {
    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║              AGENT REPORT                ║')
    console.log('╠══════════════════════════════════════════╣')
    console.log(`║  Total tests      : ${String(report.totalTests).padEnd(20)}║`)
    console.log(`║  Passed           : ${String(report.passed).padEnd(20)}║`)
    console.log(`║  Auto-fixed       : ${String(report.autoFixed).padEnd(20)}║`)
    console.log(`║  App bugs found   : ${String(report.appBugs.length).padEnd(20)}║`)
    console.log(`║  Needs human      : ${String(report.needsHumanReview.length).padEnd(20)}║`)
    console.log('╠══════════════════════════════════════════╣')

    if (report.fixes.length > 0) {
        console.log('║  FIXES APPLIED:                          ║')
        for (const fix of report.fixes) {
            console.log(`║  ✔ ${fix.testName.slice(0, 37).padEnd(37)}║`)
            console.log(`║    → ${fix.fileFixed.slice(0, 35).padEnd(35)}║`)
        }
        console.log('╠══════════════════════════════════════════╣')
    }

    if (report.appBugs.length > 0) {
        console.log('║  APP BUGS (need developer):              ║')
        for (const bug of report.appBugs) {
            console.log(`║  ⛔ ${bug.slice(0, 37).padEnd(37)}║`)
        }
        console.log('╠══════════════════════════════════════════╣')
    }

    if (report.needsHumanReview.length > 0) {
        console.log('║  NEEDS HUMAN REVIEW:                     ║')
        for (const item of report.needsHumanReview) {
            console.log(`║  ⚠ ${item.slice(0, 37).padEnd(37)}║`)
        }
        console.log('╠══════════════════════════════════════════╣')
    }

    console.log('╚══════════════════════════════════════════╝\n')
}

run().catch(err => {
    console.error('\n[Agent Fatal Error]', err)
    writeLog({ event: 'agent_fatal_error', error: String(err) })
    process.exit(1)
})
