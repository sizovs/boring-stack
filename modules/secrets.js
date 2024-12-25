import crypto from "crypto"

export function cookieSecret(db) {
  const SECRET_KEY = 'cookie_secret'
  const SECRET_VAL = crypto.randomBytes(32).toString('base64')

  const tx = db.transaction(() => {
    const insertIfAbsent = db.prepare(`insert or ignore into secrets (id, secret) values (?, ?)`)
    insertIfAbsent.run(SECRET_KEY, SECRET_VAL)

    return db.prepare(`select secret from secrets where id = ? limit 1`).pluck().get(SECRET_KEY)
  })

  return tx.immediate()
}

