const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const CURRENCY_CODES = Object.keys(CURRENCY_SYMBOLS);

export function formatMoney(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const value = Number(amount ?? 0).toFixed(2);
  return `${symbol}${value}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export { todayIso };
