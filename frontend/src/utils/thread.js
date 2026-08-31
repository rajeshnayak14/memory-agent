function storageKey(userId) {
  return `recall.thread.${userId}`;
}

export function getOrCreateThreadId(userId) {
  const key = storageKey(userId);
  let threadId = localStorage.getItem(key);

  if (!threadId) {
    threadId = crypto.randomUUID();
    localStorage.setItem(key, threadId);
  }

  return threadId;
}

export function resetThreadId(userId) {
  const threadId = crypto.randomUUID();
  localStorage.setItem(storageKey(userId), threadId);
  return threadId;
}
