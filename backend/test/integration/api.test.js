process.env.JWT_SECRET = "test_secret";
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../../app");

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterEach(async () => {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const user = { fullName: "Ivan", email: "ivan@test.com", password: "password123" };

// хелпер: регистрация + вход, возвращает токен и userId
const signIn = async () => {
  await request(app).post("/api/users/register").send(user);
  const res = await request(app)
    .post("/api/users/login")
    .send({ email: user.email, password: user.password });
  return { token: res.body.token, userId: res.body.userId };
};

describe("auth", () => {
  test("register: 200", async () => {
    const res = await request(app).post("/api/users/register").send(user);
    expect(res.status).toBe(200);
  });
  test("register: дубликат email -> 400", async () => {
    await request(app).post("/api/users/register").send(user);
    const res = await request(app).post("/api/users/register").send(user);
    expect(res.status).toBe(400);
  });
  test("login: верный пароль -> 200 + token", async () => {
    const { token } = await signIn();
    expect(token).toBeTruthy();
  });
  test("login: неверный пароль -> 401", async () => {
    await request(app).post("/api/users/register").send(user);
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: user.email, password: "wrong" });
    expect(res.status).toBe(401);
  });
  test("login: нет пользователя -> 404", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "no@test.com", password: "x" });
    expect(res.status).toBe(404);
  });
});

describe("products", () => {
  test("GET /api/products -> 200 и массив", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  test("GET /api/products/:id несуществующий -> 404", async () => {
    const res = await request(app).get(`/api/products/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});

describe("cart", () => {
  const item = (userId) => ({
    userId, images: ["a.png"], title: "Shirt", price: 100,
    quantity: 1, size: "M", productId: new mongoose.Types.ObjectId().toString(),
  });

  test("без токена -> 401", async () => {
    const res = await request(app).get("/api/cart/");
    expect(res.status).toBe(401);
  });
  test("add + get: товар появляется в корзине", async () => {
    const { token, userId } = await signIn();
    const add = await request(app)
      .post("/api/cart/add").set("Authorization", `Bearer ${token}`).send(item(userId));
    expect(add.status).toBe(201);
    const get = await request(app).get("/api/cart/").set("Authorization", `Bearer ${token}`);
    expect(get.body).toHaveLength(1);
  });
  test("update и remove", async () => {
    const { token, userId } = await signIn();
    const add = await request(app)
      .post("/api/cart/add").set("Authorization", `Bearer ${token}`).send(item(userId));
    const id = add.body.cartItem._id;
    const upd = await request(app)
      .put(`/api/cart/update/${id}`).set("Authorization", `Bearer ${token}`).send({ quantity: 3 });
    expect(upd.body.cartItem.quantity).toBe(3);
    const del = await request(app)
      .delete(`/api/cart/remove/${id}`).set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);
  });
});

describe("orders", () => {
    const order = {
    products: [
      {
        images: ["a.png"],
        title: "Shirt",
        productId: new mongoose.Types.ObjectId().toString(),
        quantity: 2,
        price: 50,
      },
    ],
    totalPrice: 100,
    shippingAddress: "Frankfurt",
  };


  test("без токена -> 401", async () => {
    const res = await request(app).post("/api/orders/create").send(order);
    expect(res.status).toBe(401);
  });
  test("пустой products -> 400", async () => {
    const { token } = await signIn();
    const res = await request(app)
      .post("/api/orders/create").set("Authorization", `Bearer ${token}`)
      .send({ ...order, products: [] });
    expect(res.status).toBe(400);
  });
  test("create + get: заказ виден только владельцу", async () => {
    const { token } = await signIn();
    const create = await request(app)
      .post("/api/orders/create").set("Authorization", `Bearer ${token}`).send(order);
    expect(create.status).toBe(201);
    const get = await request(app).get("/api/orders/get").set("Authorization", `Bearer ${token}`);
    expect(get.body).toHaveLength(1);
  });
});