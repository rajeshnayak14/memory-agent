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

export function verifyEmail({ verificationToken, code }) {
  return apiClient
    .post("/verify-email", { verification_token: verificationToken, code })
    .then((res) => res.data);
}

export function resendVerification(verificationToken) {
  return apiClient
    .post("/verify-email/resend", { verification_token: verificationToken })
    .then((res) => res.data);
}

export function signInWithGoogle(credential) {
  return apiClient
    .post("/auth/google", { credential })
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
