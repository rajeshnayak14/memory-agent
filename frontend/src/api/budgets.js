import { apiClient } from "./client";

export function listBudgets(params = {}) {
  return apiClient.get("/budgets", { params }).then((res) => res.data);
}

export function createBudget(budget) {
  return apiClient.post("/budgets", budget).then((res) => res.data);
}

export function updateBudget(budgetId, changes) {
  return apiClient
    .put(`/budgets/${encodeURIComponent(budgetId)}`, changes)
    .then((res) => res.data);
}

export function deleteBudget(budgetId) {
  return apiClient
    .delete(`/budgets/${encodeURIComponent(budgetId)}`)
    .then((res) => res.data);
}
