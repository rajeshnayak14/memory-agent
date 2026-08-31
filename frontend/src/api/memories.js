import { apiClient } from "./client";

export function listMemories() {
  return apiClient.get("/memories").then((res) => res.data);
}

export function createMemory(content) {
  return apiClient.post("/memories", { content }).then((res) => res.data);
}

export function updateMemory(memoryId, content) {
  return apiClient
    .put(`/memories/${encodeURIComponent(memoryId)}`, { content })
    .then((res) => res.data);
}

export function deleteMemory(memoryId) {
  return apiClient
    .delete(`/memories/${encodeURIComponent(memoryId)}`)
    .then((res) => res.data);
}

export function deleteAllMemories() {
  return apiClient.delete("/memories").then((res) => res.data);
}
