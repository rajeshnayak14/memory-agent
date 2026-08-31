export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;

  if (!detail) {
    if (error?.message === "Network Error") {
      return "Could not reach the server. Check your connection and try again.";
    }
    return fallback;
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first?.msg) {
      const field = Array.isArray(first.loc) ? first.loc.at(-1) : null;
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }

  return fallback;
}
