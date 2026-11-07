const request = require("supertest");
const app = require("../app");

describe("smoke test", () => {
  test("GET / возвращает сообщение о работе сервера", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Server is running!" });
  });
});