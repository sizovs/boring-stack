import { db } from "../modules/database/connect.js"
import { Admin } from "../views/Admin.js"

/**
 * @param {{ app: import("fastify").FastifyInstance, db: import("better-sqlite3").Database }}
 */
export const initAdmin = async ({ app }) => {

  app.get("/admin", async (request, reply) => {

    const errors = db.sql`select context ->> 'source' as source, * from errors order by last_seen desc limit 10`.all()
    return reply.render(Admin, { errors })
  })

}
