const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("../../models/UserModel");
const { register, login } = require("../../controller/UserController");

const mockSave = jest.fn();
jest.mock("../../models/UserModel", () => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = mockSave;
  });
  Model.findOne = jest.fn();
  return Model;
});

jest.mock("bcryptjs");

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeAll(() => {
  process.env.JWT_SECRET = "test_secret";
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("register", () => {
  const body = { fullName: "Ivan", email: "ivan@test.com", password: "password123" };

  test("400, если email уже существует", async () => {
    UserModel.findOne.mockResolvedValue({ email: body.email });
    const res = makeRes();

    await register({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Email already exists" });
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("успех: пароль хэшируется, пользователь сохраняется, 200", async () => {
    UserModel.findOne.mockResolvedValue(null);
    bcrypt.hash.mockImplementation((pwd, rounds, cb) => cb(null, "hashed_pwd"));
    mockSave.mockResolvedValue();
    const res = makeRes();

    await register({ body }, res);
    await flush();

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 5, expect.any(Function));
    expect(UserModel).toHaveBeenCalledWith({
      fullName: "Ivan",
      email: "ivan@test.com",
      password: "hashed_pwd", // в базу уходит хэш, не пароль
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ message: "Signup successful" });
  });

  test("500, если bcrypt вернул ошибку", async () => {
    UserModel.findOne.mockResolvedValue(null);
    bcrypt.hash.mockImplementation((pwd, rounds, cb) => cb(new Error("boom")));
    mockSave.mockResolvedValue();
    const res = makeRes();

    await register({ body }, res);
    await flush();

    expect(res.status.mock.calls[0][0]).toBe(500);
    expect(res.send.mock.calls[0][0]).toEqual({
      message: "Something went wrong, please try again",
    });
  });
});

describe("login", () => {
  const body = { email: "ivan@test.com", password: "password123" };
  const dbUser = { _id: "user1", fullName: "Ivan", password: "hashed_pwd" };

  test("404, если пользователь не найден", async () => {
    UserModel.findOne.mockResolvedValue(null);
    const res = makeRes();

    await login({ body }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: "User not found" });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test("401, если пароль неверный", async () => {
    UserModel.findOne.mockResolvedValue(dbUser);
    bcrypt.compare.mockImplementation((pwd, hash, cb) => cb(null, false));
    const res = makeRes();

    await login({ body }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ message: "Login failed" });
  });

  test("500, если bcrypt.compare вернул ошибку", async () => {
    UserModel.findOne.mockResolvedValue(dbUser);
    bcrypt.compare.mockImplementation((pwd, hash, cb) => cb(new Error("boom")));
    const res = makeRes();

    await login({ body }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("успех: 200 и валидный JWT с userId", async () => {
    UserModel.findOne.mockResolvedValue(dbUser);
    bcrypt.compare.mockImplementation((pwd, hash, cb) => cb(null, true));
    const res = makeRes();

    await login({ body }, res);
    await flush();

    expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashed_pwd", expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.send.mock.calls[0][0];
    expect(payload.message).toBe("Login successful");
    expect(payload.userId).toBe("user1");

    const decoded = jwt.verify(payload.token, "test_secret");
    expect(decoded.userId).toBe("user1");
  });
});