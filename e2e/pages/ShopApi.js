class ShopApi {
  constructor(request) {
    this.request = request;
    this.token = "";
    this.userId = "";
  }
  headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
  register(user) {
    return this.request.post("/api/users/register", { data: user });
  }
  async login(email, password) {
    const res = await this.request.post("/api/users/login", { data: { email, password } });
    if (res.ok()) {
      const body = await res.json();
      this.token = body.token;
      this.userId = body.userId;
    }
    return res;
  }
  products() {
    return this.request.get("/api/products");
  }
  addToCart(item) {
    return this.request.post("/api/cart/add", { data: item, headers: this.headers() });
  }
  cart() {
    return this.request.get("/api/cart/", { headers: this.headers() });
  }
  createOrder(order) {
    return this.request.post("/api/orders/create", { data: order, headers: this.headers() });
  }
  orders() {
    return this.request.get("/api/orders/get", { headers: this.headers() });
  }
  logout() {
    this.token = "";
  }
}
module.exports = { ShopApi };