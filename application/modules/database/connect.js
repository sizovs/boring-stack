import { connect } from "./database.js";

export const { db } = await connect(process.env.DB_LOCATION)
