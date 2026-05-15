import { mergeTests } from '@playwright/test'
import { test as authTest } from './auth.fixture'
import { test as pagesTest } from './pages.fixtures'

export const test = mergeTests(authTest, pagesTest)
export { expect } from '@playwright/test'
