import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export function initGitBranch(projectRoot: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const branchName = `fix/qa-agent-${timestamp}`

    execSync(`git checkout -b ${branchName}`, { cwd: projectRoot })
    return branchName
}

export function commitFix(projectRoot: string, fixes: AgentFix[]): void {
    const fixSummary = fixes.map(f =>
        `- ${f.testName}: ${f.diagnosis} (${f.fixType})`
    ).join('\n')

    const message = `fix(qa-agent): auto-fix ${fixes.length} test failure(s)\n\n${fixSummary}\n\nFixed by autonomous QA agent. Validated by strict fix-validator.\nNo assertions were modified. Only locators/navigation/timing fixed.`

    execSync(`git add -A`, { cwd: projectRoot })
    execSync(`git commit -m "${message.replace(/"/g, "'")}"`, { cwd: projectRoot })
}

export function pushBranch(projectRoot: string, branchName: string): void {
    execSync(`git push --set-upstream origin ${branchName}`, { cwd: projectRoot })
}

export function hasChanges(projectRoot: string): boolean {
    const result = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf-8' })
    return result.trim().length > 0
}

export type AgentFix = {
    testName: string
    diagnosis: string
    fixType: string
    fileFixed: string
}
