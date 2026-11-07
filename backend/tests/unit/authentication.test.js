const jwt = require("jsonwebtoken");
const { protect } = require("../../middleware/authentication");

const SECRET = "test_secret";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

const makeReq = (authorization) => ({
  headers: authorization ? { authorization } : {},
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("protect middleware", () => {
  test("401, если заголовка Authorization нет", async () => {
    const res = makeRes();
    const next = jest.fn();

    await protect(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("401, если после Bearer нет токена", async () => {
    const res = makeRes();
    const next = jest.fn();

    await protect(makeReq("Bearer"), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("401, если токен - мусор", async () => {
    const res = makeRes();
    const next = jest.fn();

    await protect(makeReq("Bearer not.a.token"), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("401, если токен подписан другим секретом", async () => {
    const token = jwt.sign({ userId: "u1" }, "other_secret");
    const res = makeRes();
    const next = jest.fn();

    await protect(makeReq(`Bearer ${token}`), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("401, если токен просрочен", async () => {
    const token = jwt.sign({ userId: "u1" }, SECRET, { expiresIn: -10 });
    const res = makeRes();
    const next = jest.fn();

    await protect(makeReq(`Bearer ${token}`), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("валидный токен: кладёт userId в req и вызывает next", async () => {
    const token = jwt.sign({ userId: "u1" }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(req.userId).toBe("u1");
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});