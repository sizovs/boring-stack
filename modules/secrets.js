export function cookieSecret(db) {
  const SECRET_KEY = 'cookie_secret'
  const stmt = db.transaction(() => {
    const insertIfAbsent = db.prepare(`insert or ignore into secrets (id, value) values (?, hex(randomblob(32)))`);
    insertIfAbsent.run(SECRET_KEY);

    const select = db.prepare(`select value from secrets where id = ? limit 1`);
    return select.get(SECRET_KEY);
  });

  const secret = stmt();
  return secret.value;
}

