create table todos (id integer primary key autoincrement, description text not null) strict;

create table errors (
    fingerprint text not null primary key,
    name text not null default 'Error',
    message text not null default '',
    stack text not null,
    context text not null default '{}',
    occurrences integer not null default 1,
    first_seen integer not null default ((strftime('%s','now') * 1000)),
    last_seen integer not null default ((strftime('%s','now') * 1000))
) strict;

create index idx_errors_last_seen on errors (last_seen);

