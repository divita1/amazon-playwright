import { test, expect } from '@/fixtures'

test('AMAZON_TC_1 - Search and add to cart', async ({ searchPage, productPage, cartPage }) => {
    await searchPage.navigate()
    await searchPage.search('boAt Rockerz 450')
    await searchPage.selectFirstResult()

    const title = await productPage.getTitle()
    expect(title.length).toBeGreaterThan(0)

    await productPage.addToCart()

    const cartCount = await cartPage.getCartCount()
    expect(Number(cartCount)).toBeGreaterThan(0)
})
