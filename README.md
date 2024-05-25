# What is this?

This is my starter for full-stack web app development on Node.

JS and TS ecosystem suffers from extreme churn, making migrations between major framework releases extremely challenging, often forcing 'a big rewrite' on app developers every 3-5 years. If  you're playing long-term game, it's better and safer to build on top of stable and boring foundation. Moreover, the SPA ecosystem, and frameworks like Next and SvelteKit, are complex beasts with too much hidden "magic" under the hood. That magic works until it doesn't, because all abstractions are leaky. For the problem of sending data over HTTP to and from the database, I find that complexity hard to justify. By making certain architectural trade-offs, such as embracing [hypermedia systems](https://hypermedia.systems/), it's possible to eliminate that complexity altogether.

I don't think it's reasonable to split apps prematurely across all axes — 1) vertically into microservices, 2) horizontally into BE and FE, and 3) across servers with DB running on a separate machine. Instead, I prefer building self-contained, monolith systems that run on a single server. Such systems can handle 10,000s of requests on a beefy VPS (which is enough for most apps) and can be split into multiple self-contained systems for scalability, if necessary.

Loosely coupled, distributed architectures are challenging to operate, which is why they are better suited for running on the cloud. This is one of the reasons why cloud providers advocate for such architectures. On the other hand, monolithic, self-contained architectures diminish the benefit of running on PaaS or cloud hyperscalers that are opaque and 5-20x more expensive abstractions over good old servers. Therefore, I am running my stuff on Hetzner VPS, provisioning servers with Terraform, and deploying using a simple, homegrown bash script that supports zero-downtime deployments.

As a guiding principles, I bet on stability, simplicity, and fewer abstractions. As a result, I made the following tech choices:
* JS (you don't need TS for large-scale apps if you write tests; rails is a great example)
* Express.js
* Edge.js for templating
* Htmx for SPA experience
* Alpine.js for sprinkling JS here and there
* CSS for styling w/o build tools
* SQLite with better-sqlite3 for DB acccess w/o ORMs and query builders
* Livestream for DB replication to R2

By looking into the code, you'll discover lesser-known gems such as Vine validation library. Generally, the dependencies are minimal, giving a refreshing feel after dealing with bloated frameworks.

# A note on infrastructure
Public traffic to our Hetzner VPS is routed through a Cloudflare Worker. This setup allows us to cache static assets on Cloudflare's CDN and switch between `blue.<your.domain>` and `green.<your.domain>` without downtime by calling `task promote:green` or `task promote:blue`. Essentially, the Cloudflare Worker serves as a reverse proxy, load balancer, and CDN.

# Provisioning infra
Before provisioning infra, create `<project_dir>/.env.devops`:
```
WORKER_SECRET=<secret goes here> # This is a secret that we use to access Cloudflare worker.
X_SECRET_TOKEN=<secret goes here> # This is a secret our Cloudflare Worker sends to Hetzner.
TF_VAR_hcloud_token=<secret goes here>
TF_VAR_cloudflare_token=<secret goes here>
TF_VAR_cloudflare_zone_id=<secret goes here>
R2_BACKUP_KEY=<secret goes here>
R2_BACKUP_SECRET=<secret goes here>
R2_BACKUP_ENDPOINT=<secret goes here>
R2_BACKUP_BUCKET=<secret goes here>
```

```
task terraform -- init
task terraform -- apply
task deploy:worker
```

# Deploying to production

Before deploying, create `<project_dir>/.env`:
```
COOKIE_SECRET=<secret goes here>
```

```
task deploy
```

# Running an app locally
```
task dev
```

# Running tests
```
task test
```

# Troubleshooting on prod
```
DB_LOCATION=/mnt/database/db.sqlite3 npm run repl
```



