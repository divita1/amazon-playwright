/**
 * Strict fix validator — enforces QA integrity rules before any fix is applied.
 * A fix that passes all rules here is safe to apply to production test code.
 */

export type FixProposal = {
    fileToFix: string
    oldCode: string
    newCode: string
    reasoning: string
    fixType: 'locator' | 'timing' | 'navigation' | 'assertion_logic' | 'unknown'
}

export type ValidationResult = {
    approved: boolean
    rejectionReason?: string
}

const FORBIDDEN_PATTERNS = [
    // Never remove or skip assertions
    { pattern: /expect\s*\(.*\)\s*$/, description: 'removes an expect() call' },
    { pattern: /\.skip\b/, description: 'adds .skip to a test' },
    { pattern: /test\.skip/, description: 'skips a test entirely' },
    // Never invert expected values
    { pattern: /toBe\s*\(\s*false\s*\)/, description: 'changes assertion to toBe(false)', onlyIfOriginalWasTrue: true },
    // Never remove await on critical actions
    { pattern: /\/\/\s*await/, description: 'comments out an await' },
]

const ASSERTION_WEAKENING = [
    // toBeGreaterThan(0) changed to toBeGreaterThanOrEqual(0) — allows empty results
    { from: /toBeGreaterThan\s*\(\s*0\s*\)/, to: /toBeGreaterThanOrEqual\s*\(\s*0\s*\)/, description: 'weakens toBeGreaterThan(0) to allow empty' },
    // toBe(true) changed to toBeTruthy — more lenient
    { from: /toBe\s*\(\s*true\s*\)/, to: /toBeTruthy\s*\(\s*\)/, description: 'weakens toBe(true) to toBeTruthy' },
    // Removes length checks
    { from: /toHaveLength/, to: null, description: 'removes length assertion' },
]

export function validateFix(proposal: FixProposal, originalFileContent: string): ValidationResult {
    const { oldCode, newCode, fixType } = proposal

    // Rule 1: Fix must actually change something
    if (oldCode.trim() === newCode.trim()) {
        return { approved: false, rejectionReason: 'Fix makes no change to the code.' }
    }

    // Rule 2: New code must not be empty or drastically shorter (deleting code)
    const oldLines = oldCode.split('\n').filter(l => l.trim()).length
    const newLines = newCode.split('\n').filter(l => l.trim()).length
    if (newLines < oldLines * 0.5) {
        return { approved: false, rejectionReason: `Fix removes too much code (${oldLines} lines → ${newLines} lines). Suspicious deletion.` }
    }

    // Rule 3: Must not add .skip or .only to tests
    if (newCode.includes('.skip') && !oldCode.includes('.skip')) {
        return { approved: false, rejectionReason: 'Fix adds .skip — this hides a failure instead of fixing it.' }
    }
    if (newCode.includes('test.only') && !oldCode.includes('test.only')) {
        return { approved: false, rejectionReason: 'Fix adds test.only — not allowed in production test code.' }
    }

    // Rule 4: Must not remove expect() calls
    const oldExpectCount = (oldCode.match(/expect\s*\(/g) || []).length
    const newExpectCount = (newCode.match(/expect\s*\(/g) || []).length
    if (newExpectCount < oldExpectCount) {
        return { approved: false, rejectionReason: `Fix removes ${oldExpectCount - newExpectCount} assertion(s). Never remove assertions.` }
    }

    // Rule 5: Must not weaken assertions
    for (const rule of ASSERTION_WEAKENING) {
        if (rule.from.test(oldCode) && rule.to === null && !rule.from.test(newCode)) {
            return { approved: false, rejectionReason: `Fix ${rule.description} — this weakens test validation.` }
        }
        if (rule.from.test(oldCode) && rule.to && rule.to.test(newCode)) {
            return { approved: false, rejectionReason: `Fix ${rule.description} — this weakens test validation.` }
        }
    }

    // Rule 6: Assertion-only fixes must not touch locator/action files
    if (fixType === 'assertion_logic') {
        return { approved: false, rejectionReason: 'Assertion logic changes are not auto-fixable. Needs human review.' }
    }

    // Rule 7: Must not change what the test is asserting — only HOW it gets there
    const oldAssertions = extractAssertions(oldCode)
    const newAssertions = extractAssertions(newCode)
    for (let i = 0; i < Math.min(oldAssertions.length, newAssertions.length); i++) {
        if (oldAssertions[i] !== newAssertions[i]) {
            return { approved: false, rejectionReason: `Fix changes assertion "${oldAssertions[i]}" → "${newAssertions[i]}". Only locators and navigation may be changed, not assertions.` }
        }
    }

    return { approved: true }
}

function extractAssertions(code: string): string[] {
    const matches = code.match(/expect\s*\([^)]+\)\s*\.[a-zA-Z]+\s*\([^)]*\)/g) || []
    return matches.map(m => m.replace(/\s+/g, ' ').trim())
}
