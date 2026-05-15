# Amazon Playwright Framework

Automated end-to-end tests for Amazon India (amazon.in) using Playwright and TypeScript.

## Workflow Covered

Search for a product → Select first result → Add to cart → Verify cart

## Project Structure

```
amazon-playwright/
├── config/
│   ├── types.ts                  # TenantConfig, Credentials types
│   └── tenants/
│       └── amazon.tenant.ts      # Amazon URL config
├── properties/
│   ├── search.locators.ts        # Search page locators
│   ├── product.locators.ts       # Product page locators
│   └── cart.locators.ts          # Cart page locators
├── pages/
│   ├── SearchPage.ts             # Navigate, search, select result
│   ├── ProductPage.ts            # Get title, add to cart
│   └── CartPage.ts               # Get cart count, verify cart
├── fixtures/
│   ├── pages.fixtures.ts         # Page object fixtures
│   └── index.ts                  # Merged fixtures export
├── tests/
│   └── amazon/
│       └── amazon-cart.spec.ts   # Add to cart test
├── .env                          # AMAZON_URL (not committed)
├── playwright.config.ts
└── tsconfig.json
```

## Setup

```bash
npm install
npx playwright install chromium
```

## Configuration

Create a `.env` file in the root:

```
AMAZON_URL=https://www.amazon.in
```

## Running Tests

```bash
# Headless
npm test

# Headed (see the browser)
npm run test:headed

# View HTML report
npm run report
```

## Tech Stack

- [Playwright](https://playwright.dev/) — browser automation
- TypeScript — type-safe test code
- dotenv — environment config
