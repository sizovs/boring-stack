CREATE TABLE IF NOT EXISTS secrets (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY,
  description TEXT NOT NULL
) STRICT;
