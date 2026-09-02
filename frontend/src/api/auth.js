import { apiClient } from "./client";

export function registerUser({ username, email, password }) {
  return apiClient
    .post("/register", { username, email, password })
    .then((res) => res.data);
}

export function loginUser({ username, password }) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  return apiClient.post("/login", body).then((res) => res.data);
}

export function verifyLoginOtp({ mfaToken, code }) {
  return apiClient
    .post("/login/verify-otp", { mfa_token: mfaToken, code })
    .then((res) => res.data);
}

export function resendLoginOtp(mfaToken) {
  return apiClient
    .post("/login/resend-otp", { mfa_token: mfaToken })
    .then((res) => res.data);
}

export function logoutUser(refreshToken) {
  return apiClient
    .post("/logout", null, { params: { refresh_token: refreshToken } })
    .then((res) => res.data);
}

export function fetchCurrentUser() {
  return apiClient.get("/me").then((res) => res.data);
}

export function updateProfile({ preferredCurrency }) {
  return apiClient
    .put("/me", { preferred_currency: preferredCurrency })
    .then((res) => res.data);
}
