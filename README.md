# What is this?

This is my starter template for full-stack web development with Node.js, designed for deployment to Hetzner.  I currently run several production projects using it and couldn't be happier. Feel free to learn from it, modify it, and use it as you wish. 🙏

# Motivation

Web development ecosystem suffers from extreme churn, making migrations between major framework releases extremely challenging, often forcing 'a big rewrite' on developers every 3-5 years. What's trendy today stops compiling tomorrow. I literally can't build multiple Vue projects that I created several years ago. If you're planning long-term, it's wiser to build on top of a stable foundation that takes backward compatibility seriously, and is immune to hype waves. Moreover, the SPA ecosystem, and frameworks like Next and SvelteKit, are complex beasts with too much hidden "magic" under the hood. This magic works until it doesn't. For the problem of sending data over HTTP to and from the database, such complexity is hard to justify. By making certain architectural trade-offs, such as embracing [hypermedia systems](https://hypermedia.systems/) and ditching unnecessary abstractions, it's possible to eliminate all that accidental complexity.

I find it unreasonable to split apps prematurely across all axes — 1) vertically into microservices, 2) horizontally into BE and FE, and 3) across 'tiers' with DB running on a separate machine. Instead, start with [self-contained](https://scs-architecture.org), [monolithic](https://signalvnoise.com/svn3/the-majestic-monolith) systems that run on a [single server](https://specbranch.com/posts/one-big-server/). Such systems can handle [10,000s of requests on a beefy VPS](https://blog.wesleyac.com/posts/consider-sqlite) (which is enough for most apps), scale up to the moon, and, if necessary, can be split into multiple self-contained systems for scalability. Navigation between systems can be achieved with simple hyperlinks, and one system can include another using server-side includes or iframes.

Loosely coupled, distributed architectures are challenging to operate, making them better suited for the cloud. This is one reason cloud providers advocate for such architectures. In contrast, monolithic, self-contained architectures reduce the benefits of PaaS and serverless solutions, which are opaque and costly abstractions over servers.

Thanks to deliberate architectural simplification, we can run our app on a single Hetzner VPS, which is one of, if not the most cost-efficient and robust cloud provider on the market. 20TB transfer on Vercel is $2850, on Hetzner it's free. Do your own math, and you'll be mind-blown by how much you're being ripped off by AWS and alikes.

To simplify ops and alleviate tooling fatigue, this project includes custom scripts for database migrations, zero-downtime deployments, and infrastructure provisioning (Terraform state management is a hassle and HCL syntax is too restrictive for my taste).

Since stability, simplicity, and fewer abstractions are the guiding principles, the following tech choices are made:
* JS
* Node (23+)
* Fastify web server
* Edge.js for templating
* Htmx for SPA experience
* Vanilla JS
* Tailwind for styling with great DX
* Playwright for E2E tests
* SQLite for DB access w/o ORMs and query builders
* Litestream for streaming DB replication
* Caddy for zero-downtime deployments and automatic TLS

Simplicity is achieved through reduction, not addition. The project is built and shipped straight from the local dev machine, eliminating the need for Docker, artifact repositories, and external CI servers. By following the #1 rule of distributing systems — don't distribute — and choosing SQLite, we achieve parity between development and production environments. By eliminating heavy tools and abstractions we can quickly spin up a local dev server, run all tests in parallel against the real database, and know within seconds if our app works.

☺️ The dependencies are minimal, with 0 vulnerabilities, giving a refreshing feel after dealing with bloated frameworks. Just think about it—you can manually track the GitHub repositories of these projects and stay updated easily. There’s not much to follow, no complicated frameworks to know – just the fundamentals and a few libraries. Enjoy low cognitive load, low anxiety, and peace of mind.

# Running & Deploying

#### Running locally
```
npm start
```

##### Running tests
```
npm test
```

#### Provisioning infra

Make sure your public key is available under  ~/.ssh/hetzner.pub.

```
HETZNER_API_TOKEN=<secret goes here> npm run devops
```

#### Before deployment

If you have a custom domain, set it in the package.json, and point your DNS records to the IP address of your Hetzner VPS. If not set, the default domain will be `<server ip>.nip.io`

#### Deploying to production

```
HETZNER_API_TOKEN=<secret goes here> npm run devops
```

🎉 Your app should be publicly available via HTTPS on your custom domain or via `<server ip>.nip.io`.

##### Running REPL
```
DB_LOCATION=<db location> npm run repl
```

# JS
Modern JS is not the same JS many developers disliked a decade ago. It offers one of the best developer experiences (DX), a vibrant ecosystem, and is a highly agile language that doesn't require re-compilation. It is well-suited for I/O-heavy applications, like most web apps.

You might squeeze more performance from your server with Rust, but who cares? Unless you're very CPU/RAM limited, the bottleneck for web apps will be I/O, not CPU or RAM, so Rust won’t necessarily help you handle more users on a single box (it might reduce latency, though, since it doesn't have garbage collection). The cool thing about JS runtimes is that they are built using "fast" runtimes—C++ or Rust—so you get speed without sacrificing DX.

Regarding TypeScript: I've worked with many strongly typed languages, and I find the TS type system a bit too intricate for my taste. While it’s sophisticated and feature-rich, it often produces more boilerplate than I would prefer. Moreover, while types in general can be beneficial when integrated into the language, I view TypeScript as a hacky abstraction over a nice and simple dynamic language. TS compiles into an unwieldy JS, making troubleshooting and debugging a nightmare. I hope one day JS adopts optional types, or that TS evolves into a separate language with its own runtime that doesn’t compile into JS. Then it might be worth considering a switch. Meanwhile, JS evolves rapidly and remains my preferred choice—especially with plenty of tests, which you should be writing with TS anyway. The great thing about JS is that most libraries come with types, so you can take advantage of code assistance without needing to write TS yourself.

#### Node > Bun
Bun is great, but I prefer building on stable foundation, t.i. – Node. Bun is still in its early days and it doesn't support many features Node does. Node powers millions of production deployments and has significantly more eyeballs on it, resulting in many more corner cases being covered. Node works and is stable. Slowly but surely, Node adopts the best parts from other runtimes. It may not be the first to implement new features, which is the approach I prefer—allowing Bun and other ecosystems to innovate first, then adopting only what matter and what works. The performance gains are minimal, if they exist at all, to justify the switch. Moreover, benchmarks are often selective in what they reveal. Bun claims a 4x read performance improvement over better-sqlite3 on Node, and while that might be accurate, on my Mac, writes are actually 30% slower. 🙉

A note on performance: If you need to squeeze every bit from your web server, you can use [http server](https://github.com/uNetworking/uWebSockets.js/) that gives Bun a lead in benchmarks, while still running on battle-proven Node/V8.

#### Workers
CPU intensive and synchronous tasks should be offloaded from the main event loop onto dedicated worker. To achieve that, you should set up a worker pool. Note that workers are useful for performing CPU-intensive operations. [They do not help](https://nodejs.org/api/worker_threads.html#:~:text=Workers%20(threads)%20are%20useful%20for%20performing%20CPU%2Dintensive%20JavaScript%20operations.%20They%20do%20not%20help%20much%20with%20I/O%2Dintensive%20work.%20The%20Node.js%20built%2Din%20asynchronous%20I/O%20operations%20are%20more%20efficient%20than%20Workers%20can%20be) much with I/O-intensive work.

#### Stateless
Since the app runs in cluster mode meaning data won’t be shared across cluster nodes, make sure your app is stateless. Use database to share the state between processes. In some cases, instead of sharing data between nodes, consider moving the “shared logic” up to the reverse proxy (e.g. rate limiting is a good use case). You can also move data to the client (JWT) or use sticky sessions (less preferred) if you need consecutive requests from the same client to share data.

# Testing
A traditional front-end/back-end separation via APIs requires developing and maintaining two distinct test suites—one for testing the back-end through the API and another for testing the front-end against a mock API, which can easily fall out of sync with the actual back-end.  This is cumbersome and clunky. By forgoing JSON APIs and instead sending HTML over the wire, we streamline the process, allowing us to test-drive a single app at the user level using Playwright.

# Postgres vs. SQLite
Postgres has an advantage over SQLite due to its extensive features—live migrations, read replicas, and higher write throughput. However, these capabilities come with a price: **complexity**. Another major drawback is that it's much harder to achive dev/prod parity with Postgres without shaggy solutions. So, stick with SQLite as long as you can, and don't overcomplicate things. As your app starts to outgrow SQLite (at this point, you'll be quite rich), you'll have plenty of options—like running Postgres alongside SQLite or creating a new self-contained system based on Postgres. Meanwhile, **stick with SQLite**. Only consider starting with Postgres if SQLite can't meet your requirements—such as if you can't afford even minimal maintenance downtime for data migrations. In that case, starting with Postgres is a safer option. Otherwise, stick with SQLite. This codebase does not support or showcases a use of Postgres.

P.S. there's a lot of innovation happening in the SQLite space, with initiatives like Turso, LiteFS, and rqlite.

#### ⚡ Postgres vs. SQLite benchmark
On my laptop, a single SQLite database file achieves ~7.5-8.5K writes/sec. Using 2 shards increases this to 11.5-15K writes/sec, and 4 shards to 19-25K writes/sec, with no further improvement beyond that due to disk I/O limits. Postgres delivers throughput similar to 2 files. Therefore, well-sharded SQLite outperformed Postgres on a single machine (Postgres 17 with Postgres.js driver). On Hetzner, for SQLite to roughly match Postgres write throughput, I needed to create from 4 to 12 shards, with throughput increasing linearly from 5-10K writes/second to 120K writes/second on a dedicated cloud AMD machine (CCX33). As the number of shards increases, the administrative overhead also rises since each shard requires backup, diminishing SQLite's advantages and making Postgres a more sensible choice. **It's worth mentioning that AMD machines scored better than ARM in SQLite and Postgres tests.**

#### SQLite as NoSQL store
You can use SQLite as a KV store, JSON store and it even has [built-in full-text search capability](https://www.sqlite.org/fts5.html). Moreover, there are a lot of [SQLite extensions](https://github.com/nalgeon/sqlean) out there. So, if you choose SQLite, very unlikely you'll need an additional database. Nevertheless, nothing stops you from adding another specialized database, such as Redis (e.g. for [queues](https://bullmq.io/)) or DuckDB to the mix.

#### SQLite and parallel writers
It's well-known that SQLite doesn't support parallel writes – while one process is writing, others are waiting. Even though you can still get thousands of iops on a single DB file, you may need higher throughput. You can achieve that by splitting the database into multiple files. For example, `app.db` can become `users.db` and `comments.db`. Or, learning from Rails, you can use SQLite as a cache and queue, extracting `cache.db` and `queue.db`
There are many ways how database can be partitioned, but the point is – if write throughput was a bottleneck, splitting the database into two nearly doubles your write performance. ⚡

#### SQLite in a multi-process environment
There can be multiple database connections open at the same time, and all of those database connections can write to the database file, but they have to take turns. SQLite uses locks to serialize the writes automatically; this is not something that the applications using SQLite need to worry about.

Note on performance: in theory, SQLite *could* perform better when a single process handles writes because you can compile SQLite with SQLITE_THREADSAFE=0 and omit all mutexing logic from the binary. Unfortunately, this is impossible to achieve with Node.js running in a cluster. However, for most apps, the throughput should be sufficient with mutexes enabled since SQLite uses file system locks (flocks). Flocking occurs in-memory, requiring no disk I/O apart from the initial lock setup. I benchmarked a multi-process Node app that relies on SQLite locking against a Go app that coordinates writes using a Mutex, and Node showed approximately 30% better performance. So, unless SQLite is recompiled, an additional layer of app-level locking only adds overhead.

# Cloudflare
It’s a good idea to place your server behind Cloudflare. This way, you get DDoS protection and CDN for free, but there is much more. For example, CF can take care of Brotli compression or TLS encryption, so our Caddy server doesn't have to.

One of Cloudflare's standout features is [Workers](https://workers.cloudflare.com/). Workers allow you to run code at the edge before requests reach your server. For example, you can create a transparent "booster layer" in front of your app using a custom Worker. The Worker will batch and deduplicate frequent requests before sending to the server. Or it will cache certain data at the edge. This approach unloads your server and lowers latency and without complicating your infrastructure.

# Security
The project passes the Wapiti security scan with 0 vulnerabilities and has a strict Content-Security Policy (CSP) enabled, thanks to the absence of inline scripting.

# Analytics
For web analytics, you can use self-hosted https://plausible.io, but https://goaccess.io is also a great option because it can run on the same server (and it's not subject to ad-blocking).

# For inspiration
- https://kerkour.com/sqlite-for-servers
- https://github.com/morris/vanilla-todo
- https://blog.jim-nielsen.com/2020/switching-from-react-to-js-for-templating
- https://github.com/radically-straightforward/radically-straightforward
- https://ricostacruz.com/rscss
- https://ricostacruz.com/rsjs
- https://github.com/11ty/webc
- https://lit.dev

# TODOS
- Litestream should replicate to Cloudflare R2. This enables better and faster recovery.
- [Nano JSX](https://libs.tech/project/274209897/nano) is probably a better choice than Edge because (IDE support + direct `import` support)
