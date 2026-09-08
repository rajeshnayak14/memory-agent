import { apiClient } from "./client";

export function sendChatMessage({ threadId, message, signal }) {
  return apiClient
    .post("/chat", { thread_id: threadId, message }, { signal })
    .then((res) => res.data);
}
