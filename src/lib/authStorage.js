/** Normalize the identifier without changing password semantics. */
export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

