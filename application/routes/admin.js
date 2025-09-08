import { sql } from "#application/modules/database/database.js"
import { Admin } from "#application/views/Admin.js"

/**
 * @param {{ app: import("fastify").FastifyInstance, db: import("better-sqlite3").Database }}
 */
export const initAdmin = async ({ app, db }) => {

  app.get("/admin", async (request, reply) => {

    const errors = db.prepare(sql`select context ->> 'source' as source, * from errors order by last_seen desc limit 10`).all()
    return reply.render(Admin, { errors })
  })

}
