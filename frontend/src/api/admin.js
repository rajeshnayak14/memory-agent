import { apiClient } from "./client";

export function createAdminUser(user) {
  return apiClient.post("/admin/users", user).then((res) => res.data);
}

export function listAdminUsers(query) {
  return apiClient
    .get("/admin/users", { params: query ? { q: query } : undefined })
    .then((res) => res.data.users);
}

export function getAdminStats() {
  return apiClient.get("/admin/stats").then((res) => res.data);
}

export function getAdminUserDetail(userId) {
  return apiClient
    .get(`/admin/users/${encodeURIComponent(userId)}`)
    .then((res) => res.data);
}

export function updateAdminUser(userId, changes) {
  return apiClient
    .put(`/admin/users/${encodeURIComponent(userId)}`, changes)
    .then((res) => res.data);
}

export function deleteAdminUser(userId) {
  return apiClient
    .delete(`/admin/users/${encodeURIComponent(userId)}`)
    .then((res) => res.data);
}
