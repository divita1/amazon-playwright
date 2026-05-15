import { mergeTests } from '@playwright/test'
import { test as pagesTest } from './pages.fixtures'

export const test = mergeTests(pagesTest)
export { expect } from '@playwright/test'
