const ACCESS_TOKEN_KEY = "recall.access_token";
const REFRESH_TOKEN_KEY = "recall.refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function setTokens({ access_token, refresh_token }) {
  setAccessToken(access_token);
  if (refresh_token) setRefreshToken(refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasSession() {
  return Boolean(getRefreshToken());
}
