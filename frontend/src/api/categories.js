import { apiClient } from "./client";

export function listCategories() {
  return apiClient.get("/categories").then((res) => res.data);
}

export function createCategory(category) {
  return apiClient.post("/categories", category).then((res) => res.data);
}

export function updateCategory(categoryId, changes) {
  return apiClient
    .put(`/categories/${encodeURIComponent(categoryId)}`, changes)
    .then((res) => res.data);
}

export function deleteCategory(categoryId) {
  return apiClient
    .delete(`/categories/${encodeURIComponent(categoryId)}`)
    .then((res) => res.data);
}
