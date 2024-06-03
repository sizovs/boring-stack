export function cookieSecret(db) {
  const SECRET_KEY = 'COOKIE_SECRET'
  const stmt = db.transaction(() => {
    const insertIfAbsent = db.prepare(`INSERT OR IGNORE INTO secrets (id, value) VALUES (?, hex(randomblob(32)))`);
    insertIfAbsent.run(SECRET_KEY);

    const select = db.prepare(`SELECT value FROM secrets WHERE id = ? LIMIT 1`);
    return select.get(SECRET_KEY);
  });

  const secret = stmt();
  return secret.value;
}

