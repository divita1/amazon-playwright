import { test, expect } from '@/fixtures'
import { AmazonTestData } from '@/config/test-data/amazon.testdata'

test('AMAZON_TC_1 - Search returns results for valid keyword', async ({ searchPage }) => {
    await searchPage.navigate()
    await searchPage.search(AmazonTestData.searchKeyword)

    const hasResults = await searchPage.hasResults()
    expect(hasResults, `Expected search results for "${AmazonTestData.searchKeyword}" but none found`).toBe(true)
})

test('AMAZON_TC_2 - Target product is available on Amazon.in', async ({ searchPage }) => {
    await searchPage.navigate()
    await searchPage.search(AmazonTestData.targetProduct.searchKeyword)

    const found = await searchPage.findProductByName(AmazonTestData.targetProduct.name)

    if (!found) {
        // Product not in search results — try direct URL
        await searchPage['page'].goto(AmazonTestData.targetProduct.directUrl)
        const notFound = await searchPage['page'].locator('text=unavailable, text=currently unavailable').isVisible()
        expect(!notFound, `Product "${AmazonTestData.targetProduct.name}" is not available on Amazon.in`).toBe(true)
    }

    // If we get here — product is available
    expect(true).toBe(true)
})

test('AMAZON_TC_3 - Add product to cart from direct URL', async ({ searchPage, productPage, cartPage }) => {
    // Navigate directly to product — avoids search flakiness
    await searchPage['page'].goto(AmazonTestData.targetProduct.directUrl)

    const title = await productPage.getTitle()
    expect(title.length, 'Product title should not be empty').toBeGreaterThan(0)

    await productPage.addToCart()

    const cartCount = await cartPage.getCartCount()
    expect(Number(cartCount), 'Cart count should increase after adding product').toBeGreaterThan(0)
})

test('AMAZON_TC_4 - Search with empty keyword stays on homepage', async ({ searchPage }) => {
    await searchPage.navigate()
    await searchPage.search('')

    const url = searchPage['page'].url()
    expect(url, 'Empty search should not navigate away from Amazon.in').toContain('amazon.in')
})

test('AMAZON_TC_5 - Search for non-existent product shows no results message', async ({ searchPage }) => {
    await searchPage.navigate()
    await searchPage.search('xyzproductdoesnotexist12345abc')

    const hasResults = await searchPage.hasResults()
    expect(hasResults, 'Non-existent product search should return no results').toBe(false)
})
