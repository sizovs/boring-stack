# What is this?

This is my starter for full-stack web development with Node.js deployed to Hetzner. Learn it, change it, and use it as you wish.

# Motivation

JS and TS ecosystem suffers from extreme churn, making migrations between major framework releases extremely challenging, often forcing 'a big rewrite' on app developers every 3-5 years. If you're playing a long-term game, it's wise to build on top of a stable and boring foundation that will transcend neverending hype waves and community whims. Moreover, the SPA ecosystem, and frameworks like Next and SvelteKit, are complex beasts with too much hidden "magic" under the hood. This magic works until it doesn't. For the problem of sending data over HTTP to and from the database, such complexity is hard to justify. By making certain architectural trade-offs, such as embracing [hypermedia systems](https://hypermedia.systems/) and ditching unnecessary abstractions, it's possible to eliminate all that accidental complexity.

It's unreasonable to split apps prematurely across all axes — 1) vertically into microservices, 2) horizontally into BE and FE, and 3) across 'tiers' with DB running on a separate machine. Instead, start with [self-contained](https://scs-architecture.org), [monolithic](https://signalvnoise.com/svn3/the-majestic-monolith) systems that run on a single server. Such systems can handle [10,000s of requests on a beefy VPS](https://blog.wesleyac.com/posts/consider-sqlite) (which is enough for most apps), scale up to the moon, and, if necessary, can be split into multiple self-contained systems for scalability. Since every self-contained system includes a UI, integration can be achieved through dynamic inclusion using iframes or server-side includes at the reverse-proxy level. Simple hyperlinks can be utilized to navigate between systems. Essentially, hypermedia systems represent the final frontier of microservices, as each service integrates a front-end that can evolve independently.

Loosely coupled, distributed architectures are challenging to operate, so they are better suited for running on the cloud. This is one of the reasons why cloud providers advocate for such architectures. On the other hand, monolithic, self-contained architectures diminish the benefit of running on PaaS or cloud hyperscalers that are opaque and insanely expensive abstractions over good old servers.

Thanks to deliberate architectural simplification, we can run our app on a single Hetzner VPS, which is one of, if not the most cost-efficient and robust cloud provider on the market. 20TB transfer on Vercel is $2850, on Hetzner it's free. Go check the math, you'll be mind-blown by how much you're being ripped off by AWS and alike.

To simplify ops and alleviate tooling fatigue, this project includes custom scripts for database migrations, zero-downtime deployments, and infrastructure provisioning (Terraform state management is a hassle and HCL syntax too restrictive).

Since stability, simplicity, and fewer abstractions are the guiding principles, the following tech choices were made:
* JS (you don't really need TS for large-scale apps if you write tests)
* Node (22+)
* Fastify web server
* Edge.js for templating
* Htmx for SPA experience
* Vanilla JS with [Alpine.js](https://alpinejs.dev/) for reactivity
* Tailwind for styling with great DX
* Playwright for E2E tests
* SQLite with better-sqlite3 for DB access w/o ORMs and query builders
* Litestream for streaming DB replication
* Caddy for zero-downtime deployments and and automatic TLS

☺️ The dependencies are minimal, giving a refreshing feel after dealing with bloated frameworks.

Simplicity is achieved through reduction, not addition. The project is built and shipped straight from local dev, making Docker, artifact repo, and external CI server unnecessary. By following the #1 rule of distributing systems (don't distribute) and choosing SQLite, the project enjoys dev/prod environment parity. By eliminating indirection and build tools we can quickly spin up a local dev server and run all tests in parallel.

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
Don't worry. You can use SQLite as a [KV store](https://rodydavis.com/sqlite/key-value), [JSON store](https://rodydavis.com/sqlite/nosql) and it even has [built-in full-text search capability](https://www.sqlite.org/fts5.html). Moreover, there are a lot of [SQLite extensions](https://github.com/nalgeon/sqlean) out there. So, if you choose SQLite, very unlikely you'll need an additional database. Nevertheless, nothing stops you from adding another specialized database, such as Redis (e.g. for [queues](https://bullmq.io/)) or DuckDB to the mix.

# But... SQLite writes don't scale.
It's well-known that SQLite doesn't support concurrent writes – while one process is writing, others are waiting. Even though you can still get thousands of iops on a single DB file, you may need higher throughput. You can achieve that by splitting the database into multiple files. For example, `app.db` can become `users.db` and `comments.db`. Or, learning from Rails, you can use SQLite as a cache and queue, extracting `cache.db` and `queue.db`
There are many ways how database can be partitioned, but the point is – if write throughput was a bottleneck, splitting the database into two nearly doubles your write performance. ⚡


# But... SQLite is single-writer, but my app is multi-process.
Don't worry about that. Also don't attempt to coordinate writes between processes. There can be multiple database connections open at the same time, and all of those database connections can write to the database file, but they have to take turns. SQLite uses locks to serialize the writes automatically; this is not something that the applications using SQLite need to worry about.

Note on performance: it's true that SQLite performs better when a single process handles writes because it eliminates processes fighting for the lock (aka resource contention). Unfortunately, this is impossible to achieve with Node.js running in a cluster. Nevertheless, for most apps, the throughput should be adequate.

# But... JS sucks.
Modern JS is not the same JS many developers disliked a decade ago. It offers one of the best developer experiences (DX), a vibrant ecosystem, and is a highly agile language that doesn't require re-compilation (DX goes to the moon). It is well-suited for I/O-heavy applications, like most web apps. The throughput is pretty much on par with Go.

You might squeeze more performance from your server with Rust, but who cares? Unless you're very CPU/RAM limited, the bottleneck for web apps will be I/O, not CPU or RAM, so Rust won’t necessarily help you handle more users on a single box (it might reduce latency, though, since it doesn't have garbage collection). The cool thing about JS runtimes is that they are built using "fast" languages—C++ or Rust—so you get all the speed benefits without sacrificing DX.

Regarding TypeScript: I've worked with many strongly typed languages, and I find the TS type system a bit too intricate for my taste. While it’s sophisticated and feature-rich, it often produces more boilerplate than I would prefer. Moreover, while types in general can be beneficial when integrated into the language, I view TypeScript as a hacky abstraction over a nice and simple dynamic language. TS compiles into an unwieldy JS, making troubleshooting and debugging a nightmare. I hope one day JS adopts optional types, or that TS evolves into a separate language with its own runtime that doesn’t compile into JS. Then it might be worth considering a switch. Meanwhile, JS remains my preferred choice—especially with plenty of tests, which you should be writing with TS anyway.

# Testing
A traditional front-end/back-end separation via APIs requires developing and maintaining two distinct test suites—one for testing the back-end through the API and another for testing the front-end against a mock API, which can easily fall out of sync with the actual back-end.  This is cumbersome and clunky. By forgoing JSON APIs and instead sending HTML over the wire, we streamline the process, allowing us to test-drive a single app at the user level using Playwright.

# Stateless
Since the app runs in cluster mode meaning data won’t be shared across cluster nodes, make sure your app is stateless. Use SQLite to share states between processes. In some cases, instead of sharing data between nodes, consider moving the “shared logic” up to the reverse proxy (e.g. rate limiting is a good use case). You can also move data to the client (JWT) or use sticky sessions (less preferred) if you need consecutive requests from the same client to share data.

# Analytics
For web analytics, you can use self-hosted https://plausible.io, but https://goaccess.io is also a great option because it can run on the same server (and it's not subject to ad-blocking).

# Workers
In Node.js everything runs in parallel, except your code. What this means is that all I/O code that you write in Node.js is non-blocking, while (conversely) all non-I/O code that you write in Node.js is blocking. Therefore, CPU intensive and synchronous tasks should be offloaded from the main event loop onto dedicated workers. [Piscina](https://github.com/piscinajs/piscina) is the way to go. Note that workers are useful for performing CPU-intensive operations. [They do not help](https://nodejs.org/api/worker_threads.html#:~:text=Workers%20(threads)%20are%20useful%20for%20performing%20CPU%2Dintensive%20JavaScript%20operations.%20They%20do%20not%20help%20much%20with%20I/O%2Dintensive%20work.%20The%20Node.js%20built%2Din%20asynchronous%20I/O%20operations%20are%20more%20efficient%20than%20Workers%20can%20be) much with I/O-intensive work.

# Bun
Bun is great, but I prefer building on stable foundation, t.i. – Node. Bun is still in its early days and it doesn't support many features Node does. Moreover, benchmarks are often selective in what they reveal. Bun claims a 4x read performance improvement over better-sqlite3 on Node, and while that might be accurate, on my Mac, writes are actually 30% slower. 🙉

# Postgres
Some people prefer Postgres over SQLite mainly because it's more feature-rich (Postgres gives you live migrations, read replicas, higher write concurrency, pub-sub, and much more). If chances of becoming Twitter-scale are high and some maintenance downtime for data migrations is not an option, starting with Postgres is a safer bet because you won't need to migrate from SQLite[^1]. The cool thing about Postgres is that you can run it next to the app, just like SQLite, and move to a separate machine if you outgrow a single box. The major drawback is that it's much harder to achive dev/prod parity with Postgres without shaggy solutions. This codebase does not support or showcases a use of Postgres.

#### ⚡ Postgres vs. SQLite benchmark
On my laptop, a single SQLite database file achieves ~7.5-8.5K writes/sec. Using 2 shards increases this to 11.5-15K writes/sec, and 4 shards to 19-25K writes/sec, with no further improvement beyond that due to disk I/O limits. Postgres delivers throughput similar to 2 files. Therefore, well-sharded SQLite outperformed Postgres on a single machine (Postgres 17 with Postgres.js driver). On Hetzner, for SQLite to roughly match Postgres write throughput, I needed to create from 4 to 12 shards, with throughput increasing linearly from 5-10K writes/second to 120K writes/second on a dedicated cloud AMD machine (CCX33). As the number of shards increases, the administrative overhead grows as each shard needs to be backed up, reducing the benefits of SQLite and making PostgreSQL a smarter choice. It’s also worth mentioning that AMD machines did 2-3 times better than ARM for in SQLite and Postgres tests.

[^1]: Even if migration is necessary, it doesn't mean you have to rewrite the entire app. You can gradually move some parts to PostgreSQL while keeping the rest of the data in SQLite.

# TODOS
- The current implementation uses Livestream to replicate data to a network-attached volume. While this isn't a critical issue, it would be more efficient to replicate to R2 instead. Otherwise, if Hetzner experiences downtime, restoring data could be challenging.
