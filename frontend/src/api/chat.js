import { apiClient } from "./client";

export function sendChatMessage({ threadId, message }) {
  return apiClient
    .post("/chat", { thread_id: threadId, message })
    .then((res) => res.data);
}
