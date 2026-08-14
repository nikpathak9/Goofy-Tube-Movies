/** Normalize the identifier without changing password semantics. */
export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isQuotaError(error) {
  return Boolean(
    error &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error.code === 22 ||
        error.code === 1014)
  );
}

/** Remove only obsolete API response caches; account and watch-list data stay intact. */
function clearLegacyMediaCaches() {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("tmdb_")) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

/**
 * Authentication data gets priority over disposable media caches. Older
 * builds persisted large TMDB payloads without a size limit, which could fill
 * the browser quota and make an otherwise valid registration fail.
 */
export function writeAuthValue(key, value) {
  const serialized = JSON.stringify(value);
  try {
    localStorage.setItem(key, serialized);
  } catch (error) {
    if (!isQuotaError(error)) throw error;
    clearLegacyMediaCaches();
    localStorage.setItem(key, serialized);
  }
}

export function authStorageError(error, operation) {
  const label = operation === "registration" ? "Registration" : "Sign in";
  if (isQuotaError(error)) {
    return `${label} could not be completed because browser storage is full. Clear this site's stored data and try again.`;
  }
  if (error?.name === "SecurityError") {
    return `${label} requires browser storage. Allow site data for Goofy Tube and try again.`;
  }
  return `${label} failed. Please try again.`;
}

/**
 * Read prototype accounts defensively. Older or partially written browser
 * data should not make the sign-in form throw before it can show an error.
 */
export function readAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem("users") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (account) =>
        account &&
        typeof account === "object" &&
        normalizeEmail(account.email) &&
        typeof account.password === "string"
    );
  } catch {
    return [];
  }
}

export function findAccount(accounts, email, password) {
  const normalizedEmail = normalizeEmail(email);
  return accounts.find(
    (account) =>
      normalizeEmail(account.email) === normalizedEmail &&
      account.password === password
  );
}

export function accountExists(accounts, email) {
  const normalizedEmail = normalizeEmail(email);
  return accounts.some((account) => normalizeEmail(account.email) === normalizedEmail);
}

export function writeAccounts(accounts) {
  writeAuthValue("users", accounts);
}
