const CartModel = require("../../models/CartModel");
const {
  getCart,
  addCart,
  updateCart,
  removeCart,
} = require("../../controller/CartController");

const mockSave = jest.fn();
jest.mock("../../models/CartModel", () => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = mockSave;
  });
  Model.find = jest.fn();
  Model.findByIdAndUpdate = jest.fn();
  Model.findByIdAndDelete = jest.fn();
  return Model;
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe("getCart", () => {
  test("возвращает элементы корзины текущего пользователя", async () => {
    const items = [{ title: "Shirt" }];
    CartModel.find.mockResolvedValue(items);
    const res = makeRes();

    await getCart({ userId: "u1" }, res);

    expect(CartModel.find).toHaveBeenCalledWith({ userId: "u1" });
    expect(res.json).toHaveBeenCalledWith(items);
  });

  test("500 при ошибке БД", async () => {
    CartModel.find.mockRejectedValue(new Error("db"));
    const res = makeRes();

    await getCart({ userId: "u1" }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("addCart", () => {
  const body = {
    userId: "u1",
    images: ["a.png"],
    title: "Shirt",
    price: 100,
    quantity: 2,
    size: "M",
    productId: "p1",
  };

  test("201: товар добавлен в корзину", async () => {
    mockSave.mockResolvedValue();
    const res = makeRes();

    await addCart({ body }, res);

    expect(CartModel).toHaveBeenCalledWith(body);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].message).toBe("Added to cart Sucsessfully");
  });

  test("500, если сохранение упало", async () => {
    mockSave.mockRejectedValue(new Error("db"));
    const res = makeRes();

    await addCart({ body }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("updateCart", () => {
  test("обновляет количество и возвращает элемент", async () => {
    const updated = { _id: "c1", quantity: 5 };
    CartModel.findByIdAndUpdate.mockResolvedValue(updated);
    const res = makeRes();

    await updateCart({ params: { id: "c1" }, body: { quantity: 5 } }, res);

    expect(CartModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "c1",
      { quantity: 5 },
      { new: true }
    );
    expect(res.json).toHaveBeenCalledWith({
      message: "Cart updated sucessfully",
      cartItem: updated,
    });
  });

  test("404, если элемента нет", async () => {
    CartModel.findByIdAndUpdate.mockResolvedValue(null);
    const res = makeRes();

    await updateCart({ params: { id: "x" }, body: { quantity: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("500 при ошибке БД", async () => {
    CartModel.findByIdAndUpdate.mockRejectedValue(new Error("db"));
    const res = makeRes();

    await updateCart({ params: { id: "c1" }, body: { quantity: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("removeCart", () => {
  test("удаляет элемент", async () => {
    CartModel.findByIdAndDelete.mockResolvedValue({ _id: "c1" });
    const res = makeRes();

    await removeCart({ params: { id: "c1" } }, res);

    expect(CartModel.findByIdAndDelete).toHaveBeenCalledWith("c1");
    expect(res.json).toHaveBeenCalledWith({ message: "Product removed from cart" });
  });

  test("404, если элемента нет", async () => {
    CartModel.findByIdAndDelete.mockResolvedValue(null);
    const res = makeRes();

    await removeCart({ params: { id: "x" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("500 при ошибке БД", async () => {
    CartModel.findByIdAndDelete.mockRejectedValue(new Error("db"));
    const res = makeRes();

    await removeCart({ params: { id: "c1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});