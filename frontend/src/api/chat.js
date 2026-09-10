import { apiClient } from "./client";

export function sendChatMessage({ threadId, message, signal }) {
  return apiClient
    .post("/chat", { thread_id: threadId, message }, { signal })
    .then((res) => ({
      response: res.data.response,
      card: res.data.card,
      memorySuggestion: res.data.memory_suggestion,
    }));
}
