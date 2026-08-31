import { apiClient } from "./client";

export function listGoals() {
  return apiClient.get("/goals").then((res) => res.data);
}

export function createGoal(goal) {
  return apiClient.post("/goals", goal).then((res) => res.data);
}

export function updateGoal(goalId, changes) {
  return apiClient
    .put(`/goals/${encodeURIComponent(goalId)}`, changes)
    .then((res) => res.data);
}

export function contributeToGoal(goalId, amount) {
  return apiClient
    .post(`/goals/${encodeURIComponent(goalId)}/contribute`, { amount })
    .then((res) => res.data);
}

export function deleteGoal(goalId) {
  return apiClient
    .delete(`/goals/${encodeURIComponent(goalId)}`)
    .then((res) => res.data);
}
