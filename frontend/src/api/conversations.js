import { apiClient } from "./client";

export function listConversations() {
  return apiClient
    .get("/conversations")
    .then((res) => res.data);
}

export function getConversation(threadId) {
  return apiClient
    .get(`/conversations/${encodeURIComponent(threadId)}`)
    .then((res) => res.data);
}

export function deleteConversation(threadId) {
  return apiClient
    .delete(`/conversations/${encodeURIComponent(threadId)}`)
    .then((res) => res.data);
}