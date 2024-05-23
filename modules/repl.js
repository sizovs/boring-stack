import { start } from 'node:repl';
import { db } from "#modules/database/database.js";

const repl = start();

repl.context.db = db
