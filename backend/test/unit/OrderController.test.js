const OrderModel = require("../../models/OrderModel");
const { createOrder, getOrders } = require("../../controller/OrderController");

const mockSave = jest.fn();
jest.mock("../../models/OrderModel", () => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = mockSave;
  });
  Model.find = jest.fn();
  return Model;
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe("createOrder", () => {
  const products = [{ productId: "p1", quantity: 2, price: 50 }];
  const body = { products, totalPrice: 100, shippingAddress: "Frankfurt" };

  test("400, если products не переданы", async () => {
    const res = makeRes();

    await createOrder({ body: { totalPrice: 0 }, userId: "u1" }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "must contain products" });
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("400, если products пустой массив", async () => {
    const res = makeRes();

    await createOrder({ body: { ...body, products: [] }, userId: "u1" }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("201: заказ создаётся со статусами Pending и userId из токена", async () => {
    mockSave.mockResolvedValue();
    const res = makeRes();

    await createOrder({ body, userId: "u1" }, res);

    expect(OrderModel).toHaveBeenCalledWith({
      userId: "u1",
      products,
      totalPrice: 100,
      shippingAddress: "Frankfurt",
      paymentStatus: "Pending",
      orderStatus: "Pending",
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("500, если сохранение упало", async () => {
    mockSave.mockRejectedValue(new Error("db"));
    const res = makeRes();

    await createOrder({ body, userId: "u1" }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getOrders", () => {
  test("возвращает заказы только текущего пользователя", async () => {
    const orders = [{ _id: "o1" }];
    OrderModel.find.mockResolvedValue(orders);
    const res = makeRes();

    await getOrders({ userId: "u1" }, res);

    expect(OrderModel.find).toHaveBeenCalledWith({ userId: "u1" });
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  test("500 при ошибке БД", async () => {
    OrderModel.find.mockRejectedValue(new Error("db"));
    const res = makeRes();

    await getOrders({ userId: "u1" }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});