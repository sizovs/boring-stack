create table if not exists secrets (
  id TEXT PRIMARY KEY,
  value TEXT not null
) strict;

create table if not exists todos (
  id integer primary key autoincrement,
  description text not null
) strict;
