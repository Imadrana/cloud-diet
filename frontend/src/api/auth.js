import client from "./client";

export function registerUser(data) {
  return client.post("/register", data);
}

export function loginUser(data) {
  return client.post("/login", data);
}

export function fetchCurrentUser() {
  return client.get("/me");
}
