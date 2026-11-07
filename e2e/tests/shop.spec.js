const { test, expect } = require("@playwright/test");
const { ShopApi } = require("../pages/ShopApi");

const email = `e2e_${Date.now()}@test.com`; 
const password = "password123";
const productId = "64b7f0c2a1b2c3d4e5f60718"; 

test.describe.serial("shop API flow", () => {
  let shop;
  test.beforeAll(({ playwright }) => {});
  test.beforeEach(async ({ request }) => {
    shop = shop || new ShopApi(request);
    shop.request = request;
  });

  test("1. регистрация", async () => {
    const res = await shop.register({ fullName: "E2E User", email, password });
    expect(res.status()).toBe(200);
  });

  test("2. вход", async () => {
    const res = await shop.login(email, password);
    expect(res.status()).toBe(200);
    expect(shop.token).toBeTruthy();
  });

  test("3. список товаров", async () => {
    const res = await shop.products();
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("4. добавление в корзину", async () => {
    const add = await shop.addToCart({
      userId: shop.userId, images: ["a.png"], title: "Shirt",
      price: 50, quantity: 2, size: "M", productId,
    });
    expect(add.status()).toBe(201);
    const cart = await (await shop.cart()).json();
    expect(cart.length).toBeGreaterThan(0);
  });

  test("5. оформление заказа", async () => {
    const res = await shop.createOrder({
      products: [{ images: ["a.png"], title: "Shirt", productId, quantity: 2, price: 50 }],
      totalPrice: 100,
      shippingAddress: "Frankfurt",
    });
    expect(res.status()).toBe(201);
    const orders = await (await shop.orders()).json();
    expect(orders.length).toBeGreaterThan(0);
  });

  test("6. выход: без токена доступ закрыт", async () => {
    shop.logout();
    const res = await shop.cart();
    expect(res.status()).toBe(401);
  });
});