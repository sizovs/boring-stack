create table todos (id integer primary key autoincrement, description text not null) strict;

create table errors (
    fingerprint text not null primary key,
    name text not null default 'Error',
    message text not null default '',
    stack text not null,
    context text not null default '{}',
    occurrences integer not null default 1,
    first_seen text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    last_seen text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) strict;

create index idx_errors_last_seen on errors (last_seen);

