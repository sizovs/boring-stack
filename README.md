# What is this?

This is a started for full-stack web applications running on Node.

Since JS and TS framework ecosystem suffers from extreme churn, forcing 'a big rewrite' on app developers every 3-5 years, it's better and safer to build on top of stable and boring foundation.

We don't think it's reasonable to split apps prematurely across all axes — 1) vertically (microservices), 2) horizontally (BE / FE), and 3) across servers (e.g. DB running on a separate machine) and instread prefer building self-contained, monolith systems that run on a single server. Such systems can handle 10,000s of requests on a beefy VPS (which is enough for most apps) and can be split into multiple self-contained systems for scalability, if necessary.

Such simple architectures also diminish the benefit of running on PaaS or cloud hyperscalers that are opaque and expensive abstractions over servers. Thus, we're running our stuff on Hetzner (or any other VPC), provisioning servers with Terraform, and deploy using a simple, homegrown bash script. And yes, it supports zero downtime deployment.


As a guiding principes, we bet on stability, simplicity, and fewer abstractions. As a result, we made the following tech choices:
* javascript
* express
* sqlite
* livestream for DB replication to R2
* better-sqlite3 for DB access
* htmx for SPA experience
* edge.js for templating
* alpine.js for sprinkling JS here and there
* css for styling w/o build tools

# Provisioning infra
```
task terraform -- init
task terraform -- apply
```

# Deploying to production
```
task deploy
```

# Running an app locally
```
npm install
task migrate
task dev
```

# Troubleshooting on prod
```
npm run repl
```
