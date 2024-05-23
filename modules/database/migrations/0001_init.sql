create table if not exists todos (
  id integer primary key autoincrement,
  description text not null
) strict;

