# What is this?

This is my starter for full-stack web development with Node.js deployed to Hetzner. Learn it, change it, and use it as you wish.

# Motivation

JS and TS ecosystem suffers from extreme churn, making migrations between major framework releases extremely challenging, often forcing 'a big rewrite' on app developers every 3-5 years. If  you're playing a long-term game, it's wise to build on top of a stable and boring foundation. Moreover, the SPA ecosystem, and frameworks like Next and SvelteKit, are complex beasts with too much hidden "magic" under the hood. That magic works until it doesn't. For the problem of sending data over HTTP to and from the database, such complexity is hard to justify. By making certain architectural trade-offs, such as embracing [hypermedia systems](https://hypermedia.systems/) and ditching unnecessary abstractions, it's possible to eliminate all that accidental complexity.

It's unreasonable to split apps prematurely across all axes — 1) vertically into microservices, 2) horizontally into BE and FE, and 3) across 'tiers' with DB running on a separate machine. Instead, start with [self-contained](https://scs-architecture.org), [monolithic](https://signalvnoise.com/svn3/the-majestic-monolith) systems that run on a single server. Such systems can handle [10,000s of requests on a beefy VPS](https://blog.wesleyac.com/posts/consider-sqlite) (which is enough for most apps), can be scaled up to the moon, and, if necessary, can be split into multiple self-contained systems for scalability. Since every self-contained system includes a UI, integration can be achieved through dynamic inclusion using iframes or server-side includes at the reverse-proxy level. Simple hyperlinks can be utilized to navigate between systems.

Loosely coupled, distributed architectures are challenging to operate, so they are better suited for running on the cloud. This is one of the reasons why cloud providers advocate for such architectures. On the other hand, monolithic, self-contained architectures diminish the benefit of running on PaaS or cloud hyperscalers that are opaque and insanely expensive abstractions over good old servers. Thanks to deliberate architectural simplification, we can run our app on a single Hetzner VPS, which is one of, if not the most cost-efficient and robust cloud provider on the market. To simplify ops and alleviate tooling fatigue, this project includes custom scripts for database migrations, zero-downtime deployments, and infrastructure provisioning (Terraform state management is a hassle and HCL syntax too restrictive).

Since stability, simplicity, and fewer abstractions are the guiding principles, the following tech choices were made:
* Node (22+)
* JS (you don't need TS for large-scale apps if you write tests; Rails is a great example)
* Express.js
* Edge.js for templating ([WebC](https://github.com/11ty/webc) would be a good alternative)
* Htmx for SPA experience
* Vanilla JS and [Alpine.js](https://alpinejs.dev/) for reactivity.
* Tailwind for styling with great DX. You can use vanilla CSS or [Bulma](https://bulma.io/), if you like.
* Playwright for E2E tests
* SQLite with better-sqlite3 for DB access w/o ORMs and query builders (nobody switches databases anyway)
* Litestream for streaming DB replication

By looking into the code, you'll discover lesser-known gems such as `staticify` that add a hash suffix to static assets for CDN. Generally, the dependencies are minimal, giving a refreshing feel after dealing with bloated frameworks.

Simplicity is achieved through reduction, not addition. The project is built and shipped straight from local dev, making Docker, artifact repo, and external CI server unnecessary. By following the #1 rule of distributing systems (don't distribute) and choosing SQLite, the project enjoys dev/prod environment parity. By eliminating indirection and build tools we can quickly spin up a local dev server and run all tests in parallel. Simplicity is great.

# Before deployment
Create `<project_dir>/.env` with the following content:
```
# Path to a public key used for accessing your VPS. Optional, defaults to ~/.ssh/hetzner.pub
PUBLIC_KEY=<value>

# Your public domain such as sizovs.net. Optional, defaults to <server ip>.nip.io
DOMAIN=<value>
```

# Provisioning infra
```
HETZNER_API_TOKEN=<secret goes here> task infra
```

If you're using a custom app domain, point your DNS records to the IP address of your Hetzner VPS.

# Deploying to production

```
SERVER_IP=<server ip> task deploy
```

🎉 Your app should be publicly available via HTTPS on your custom domain or via `<server ip>.nip.io`.

# Running locally
```
task dev
```

# Running tests
```
task test
```

# Pulling production DB to local dev
```
task db:pull
```

# Troubleshooting on prod
```
DB_LOCATION=<db location> npm run repl
```

# But... Too many requests will overload my server.
Instead of adding multiple servers to reduce latency and get extra horsepower (which *forces* you to move out data, which leads to even more servers to manage), reduce the load on *the* server by batching frequent or heavy requests at the edge, possibly deduplicating them, and sending them to *the* server. It significantly reduces latency and availability w/o adding complexity to your infrastructure. Thanks to [workers](https://workers.cloudflare.com/), this can be implemented in a transparent way as a “booster layer” that runs in front of your app, meaning you can develop and test your app locally without any changes. Besides write performance gains, certain data can be cached at the edge, improving read performance.

# But... I need more than SQL.
Don't worry. You can use SQLite as a [KV store](https://rodydavis.com/sqlite/key-value), [JSON store](https://rodydavis.com/sqlite/nosql) and it even has [built-in full-text search capability](https://www.sqlite.org/fts5.html). Moreover, there are a lot of [SQLite extensions](https://github.com/nalgeon/sqlean) out there. So, if you choose SQLite, very unlikely you'll need additional databases such as Redis. Nevertheless, nothing stops you from adding another specialized database, such as Redis or DuckDB to the mix.

# But... SQLite writes don't scale.
It's well-known that SQLite doesn't support concurrent writes – while one process is writing, others are waiting. Even though you can still get thousands of iops on a single DB file, you may need higher throughput. Rather than complicating your architecture by splitting a system into multiple self-contained systems, you can split the database into multiple files. For example, `db.sqlite3` can become `users.sqlite3` and `comments.sqlite3`. Or, learning from Rails, you can use SQLite as a cache and queue, extracting `cache.sqlite3` and `queue.sqlite3`. If write throughput was a bottleneck, this approach nearly doubles your write performance.

# But... SQLite is single-writer, but my app is multi-process.
Don't worry about that. Also don't attempt to coordinate writes between processes. There can be multiple database connections open at the same time, and all of those database connections can write to the database file, but they have to take turns. SQLite uses locks to serialize the writes automatically; this is not something that the applications using SQLite need to worry about. See [Isolation in SQLite](https://www.sqlite.org/isolation.html#:~:text=There%20can%20be%20multiple%20database%20connections%20open%20at%20the%20same%20time%2C%20and%20all%20of%20those%20database%20connections%20can%20write%20to%20the%20database%20file%2C%20but%20they%20have%20to%20take%20turns.%20SQLite%20uses%20locks%20to%20serialize%20the%20writes%20automatically%3B%20this%20is%20not%20something%20that%20the%20applications%20using%20SQLite%20need%20to%20worry%20about.).

# Testing
A traditional front-end/back-end separation via APIs requires developing and maintaining two distinct test suites—one for testing the back-end through the API and another for testing the front-end against a mock API, which can easily fall out of sync with the actual back-end.  This is cumbersome and clunky. By forgoing JSON APIs and instead sending HTML over the wire, we streamline the process, allowing us to test-drive a single app at the user level using Playwright.


# Stateless
Since the app runs in cluster mode meaning data won’t be shared across cluster nodes, make sure your app is stateless. Use SQLite to share states between processes. In some cases, instead of sharing data between nodes, consider moving the “shared logic” up to the reverse proxy (e.g. rate limiting is a good use case). You can also move data to the client (JWT) or use sticky sessions (less preferred) if you need consecutive requests from the same client to share data.

# Analytics
For web analytics, you can use self-hosted https://plausible.io, but https://goaccess.io is also a great option because it can run on the same server (and it's not subject to ad-blocking).

# Caddy
I chose Caddy as a reverse proxy primarily for its ability to automatically provision and manage Let's Encrypt certificates for our server. If Let's Encrypt weren't a factor, I would opt for Nginx due to its extensive built-in features, like sticky sessions and rate limiting, and because I find its syntax more straightforward.

# Bun
Bun is great, but I prefer building on stable foundation, t.i. – Node. Bun is still in its early days and it doesn't support many features Node does.

# Postgres
Some people prefer Postgres over SQLite mainly because it's more feature-rich (Postgres gives you live migrations, read replicas, higher write concurrency, pub-sub, and much more). If chances of becoming Twitter-scale are high and some maintenance downtime is not an option, starting with Postgres is a safer bet because you won't need to migrate from SQLite[^1]. The cool thing about Postgres is that you can run it next to the app, just like SQLite, and move to a separate machine if you outgrow a single box. The major drawback is that it's much harder to achive dev/prod parity with Postgres without shaggy solutions. This codebase does not support or showcases a use of Postgres.

[^1]: Even if migration is necessary, it doesn't mean you have to rewrite the entire app. You can gradually move some parts to PostgreSQL while keeping the rest of the data in SQLite.

# SQLite caveats
For transactions that contain multiple statements where the first statement is not an INSERT, UPDATE, or DELETE, it is important to run the transaction as `.immediate()`. This ensures that SQLite will queue the write if other writes are in progress, respecting the `busy_timeout` pragma. If you forget to do this, SQLite will run the transaction in a deferred mode. This means it will attempt to acquire a write lock only when it first encounters the INSERT, UPDATE, or DELETE statement and won't respect `busy_timeout` if the database is locked for writing, leading to `sqlite_busy` errors.

# TODOS
- The current implementation uses Livestream to replicate data to a network-attached volume. While this isn't a critical issue, it would be more efficient to replicate to R2 instead. Otherwise, if Hetzner experiences downtime, restoring data could be challenging.
- The current implementation stores SQLite database on a network-attached volume, which improves redundancy at the expense of throughput. If you want to squeeze (much) more performance from your SQLite, **move the database to the local disk.**
