import { apiClient } from "./client";

export function listExpenses(params = {}) {
  return apiClient.get("/expenses", { params }).then((res) => res.data);
}

export function createExpense(expense) {
  return apiClient.post("/expenses", expense).then((res) => res.data);
}

export function updateExpense(expenseId, changes) {
  return apiClient
    .put(`/expenses/${encodeURIComponent(expenseId)}`, changes)
    .then((res) => res.data);
}

export function deleteExpense(expenseId) {
  return apiClient
    .delete(`/expenses/${encodeURIComponent(expenseId)}`)
    .then((res) => res.data);
}

export function getExpenseBreakdown(params = {}) {
  return apiClient
    .get("/expenses/breakdown", { params })
    .then((res) => res.data);
}

export function getExpenseDailyBreakdown(params = {}) {
  return apiClient
    .get("/expenses/daily-breakdown", { params })
    .then((res) => res.data);
}
