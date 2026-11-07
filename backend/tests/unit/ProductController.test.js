const ProductModel = require("../../models/ProductModel");
const {
  getProducts,
  getSingleProducts,
} = require("../../controller/ProductController");

jest.mock("../../models/ProductModel", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe("getProducts", () => {
  test("возвращает список товаров", async () => {
    const products = [{ title: "Shirt" }, { title: "Hat" }];
    ProductModel.find.mockResolvedValue(products);
    const res = makeRes();

    await getProducts({}, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(products);
  });

  test("передаёт ошибку в next", async () => {
    const err = new Error("db");
    ProductModel.find.mockRejectedValue(err);
    const next = jest.fn();

    await getProducts({}, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("getSingleProducts", () => {
  test("возвращает товар по id", async () => {
    const product = { _id: "p1", title: "Shirt" };
    ProductModel.findById.mockResolvedValue(product);
    const res = makeRes();

    await getSingleProducts({ params: { id: "p1" } }, res);

    expect(ProductModel.findById).toHaveBeenCalledWith("p1");
    expect(res.json).toHaveBeenCalledWith(product);
  });

  test("404, если товара нет", async () => {
    ProductModel.findById.mockResolvedValue(null);
    const res = makeRes();

    await getSingleProducts({ params: { id: "x" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
  });

  test("500 при ошибке БД", async () => {
    ProductModel.findById.mockRejectedValue(new Error("db"));
    const res = makeRes();

    await getSingleProducts({ params: { id: "p1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});