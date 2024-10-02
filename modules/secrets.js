import crypto from "crypto"
export function cookieSecret(db) {
  const SECRET_KEY = 'cookie_secret'
  const SECRET_VAL = crypto.randomBytes(32).toString('base64')

  const tx = db.transaction(() => {
    const insertIfAbsent = db.prepare(`insert or ignore into secrets (id, value) values (?, ?)`)
    insertIfAbsent.run(SECRET_KEY, SECRET_VAL)

    const select = db.prepare(`select value from secrets where id = ? limit 1`)
    return select.get(SECRET_KEY)
  })

  const secret = tx.immediate()
  return secret.value
}

