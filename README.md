# What is this?

This is my starter for full-stack web development with Node.js deployed to Hetzner. Learn it, change it, and use it as you wish.

# Motivation

JS and TS ecosystem suffers from extreme churn, making migrations between major framework releases extremely challenging, often forcing 'a big rewrite' on app developers every 3-5 years. If  you're playing a long-term game, it's wise to build on top of a stable and boring foundation. Moreover, the SPA ecosystem, and frameworks like Next and SvelteKit, are complex beasts with too much hidden "magic" under the hood. That magic works until it doesn't. For the problem of sending data over HTTP to and from the database, I find that complexity hard to justify. By making certain architectural trade-offs, such as embracing [hypermedia systems](https://hypermedia.systems/) and ditching unnecessary abstractions, it's possible to eliminate all that accidental complexity.

I don't think it's reasonable to split apps prematurely across all axes — 1) vertically into microservices, 2) horizontally into BE and FE, and 3) across 'tiers' with DB running on a separate machine. Instead, I prefer building [self-contained](https://scs-architecture.org), [monolithic](https://signalvnoise.com/svn3/the-majestic-monolith) systems that run on a single server. Such systems can handle [10,000s of requests on a beefy VPS](https://blog.wesleyac.com/posts/consider-sqlite) (which is enough for most apps) and, if necessary, can be split into multiple self-contained systems for scalability, each having its database file. Since every self-contained system includes a UI, integration can be achieved through dynamic inclusion using iframes or server-side includes at the reverse-proxy level. Simple hyperlinks can be utilized to navigate between systems.

Loosely coupled, distributed architectures are challenging to operate, so they are better suited for running on the cloud. This is one of the reasons why cloud providers advocate for such architectures. On the other hand, monolithic, self-contained architectures diminish the benefit of running on PaaS or cloud hyperscalers that are opaque and insanely expensive abstractions over good old servers. Thanks to deliberate architectural simplification, I can easily run my apps on a single Hetzner VPS, which is one of, if not the most cost-efficient and robust cloud provider on the market. I created several custom scripts for database migrations, zero-downtime deployments, and infrastructure provisioning (I find Terraform state management a hassle and HCL syntax too restrictive). Don't shy away from coding a bit yourself.

I bet on stability, simplicity, and fewer abstractions as guiding principles. As a result, I made the following tech choices:
* Node (22+)
* JS (you don't need TS for large-scale apps if you write tests; Rails is a great example)
* Express.js
* Edge.js for templating
* Htmx for SPA experience
* Vanilla.js because all heavy lifting like state and routing is done on the server, we're not building client-heavy app like spreadsheets, and JS today is much better than most people think (see [Low JS](https://edofic.com/posts/2022-01-28-low-js/), [Designed to Last](https://jeffhuang.com/designed_to_last/), and [You Might Not Need jQuery](https://youmightnotneedjquery.com/))
* CSS for styling w/o frameworks and build tools (see [Do I Need CSS Framework?](https://doineedacssframework.com))
* Playwright for E2E tests
* SQLite with better-sqlite3 for DB access w/o ORMs and query builders (nobody switches databases anyway)
* Litestream for streaming DB replication

By looking into the code, you'll discover lesser-known gems such as `staticify` that add a hash suffix to static assets for CDN. Generally, the dependencies are minimal, giving a refreshing feel after dealing with bloated frameworks.

Simplicity is achieved through reduction, not addition. We can build and ship straight from local dev by saying no to Docker and external CI servers. By following the #1 rule of distributing systems (don't distribute) and choosing SQLite, we achieve dev/prod environment parity. By eliminating indirection and build tools we can quickly spin up a local dev server and run all tests in parallel. Simplicity is great.

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

# SQLite caveats
For transactions that contain multiple statements where the first statement is not an INSERT, UPDATE, or DELETE, it is important to run the transaction as `.immediate()`. This ensures that SQLite will queue the write if other writes are in progress, respecting the `busy_timeout` pragma. If you forget to do this, SQLite will run the transaction in a deferred mode. This means it will attempt to acquire a write lock only when it first encounters the INSERT, UPDATE, or DELETE statement and won't respect `busy_timeout` if the database is locked for writing, leading to `sqlite_busy` errors.

# Scaling SQLite write performance
It's well-known that SQLite doesn't support concurrent writes – while one process is writing, others are waiting. Even though you can still get 1,000 writes/second on a single DB file, you may need higher throughput. Rather than complicating your architecture by (prematurely) splitting a system into multiple self-contained systems, you can split the database into multiple files. For example, db.sqlite3 can become users.sqlite3 and comments.sqlite3. If write concurrency was a bottleneck, this approach nearly doubles your write performance. Simple and effective.


# Web analytics
For web analytics I use self-hosted https://plausible.io, but https://goaccess.io is also a great option because it can run on the same server (and it's not subject to ad-blocking).

# TODOS
[ ] Backup to R2 instead of Hetzner. Otherwise, how do you restore the data when Hetzner is down? :-)
