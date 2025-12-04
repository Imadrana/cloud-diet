import client from "./client";

// Email/password register
export function registerUser(data) {
  return client.post("/register", data);
}

// Email/password login  (MUST be POST)
export function loginUser(data) {
  return client.post("/login", data);
}

// Get current user from /me
export function fetchCurrentUser() {
  return client.get("/me");
}
