import { apiClient } from "./client";

export function listRecurringExpenses() {
  return apiClient.get("/recurring/expenses").then((res) => res.data);
}

export function createRecurringExpense(rule) {
  return apiClient.post("/recurring/expenses", rule).then((res) => res.data);
}

export function updateRecurringExpense(recurringId, changes) {
  return apiClient
    .put(`/recurring/expenses/${encodeURIComponent(recurringId)}`, changes)
    .then((res) => res.data);
}

export function deleteRecurringExpense(recurringId) {
  return apiClient
    .delete(`/recurring/expenses/${encodeURIComponent(recurringId)}`)
    .then((res) => res.data);
}

export function listRecurringBudgets() {
  return apiClient.get("/recurring/budgets").then((res) => res.data);
}

export function createRecurringBudget(rule) {
  return apiClient.post("/recurring/budgets", rule).then((res) => res.data);
}

export function updateRecurringBudget(recurringId, changes) {
  return apiClient
    .put(`/recurring/budgets/${encodeURIComponent(recurringId)}`, changes)
    .then((res) => res.data);
}

export function deleteRecurringBudget(recurringId) {
  return apiClient
    .delete(`/recurring/budgets/${encodeURIComponent(recurringId)}`)
    .then((res) => res.data);
}
