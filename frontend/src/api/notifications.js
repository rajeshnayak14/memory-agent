import { apiClient } from "./client";

export function listNotifications({ unreadOnly = false, limit = 20 } = {}) {
  return apiClient
    .get("/notifications", { params: { unread_only: unreadOnly, limit } })
    .then((res) => res.data);
}

export function getUnreadCount() {
  return apiClient.get("/notifications/unread-count").then((res) => res.data);
}

export function markNotificationRead(notificationId) {
  return apiClient
    .put(`/notifications/${encodeURIComponent(notificationId)}/read`)
    .then((res) => res.data);
}

export function markAllNotificationsRead() {
  return apiClient.put("/notifications/read-all").then((res) => res.data);
}
