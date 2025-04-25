# What is this?

This is my starter template for full-stack web development with Node.js, designed for deployment to Hetzner. I currently run several production projects using it and couldn't be happier. Feel free to learn from it, modify it, and use it as you wish. 🙏

# Motivation

Web development ecosystem suffers from extreme churn, making migrations between major framework releases extremely challenging, often forcing 'a big rewrite' on developers every 3-5 years. What's trendy today stops compiling tomorrow. I literally can't build multiple Vue projects that I created several years ago. If you're planning long-term, it's wiser to build on top of a stable foundation that takes backward compatibility seriously, and is immune to hype waves. Moreover, the SPA ecosystem, and frameworks like Next and SvelteKit, are complex beasts with too much hidden "magic" under the hood. This magic works until it doesn't. For the problem of sending data over HTTP to and from the database, such complexity is hard to justify. By making certain architectural trade-offs, such as embracing [hypermedia systems](https://hypermedia.systems/) and ditching unnecessary abstractions, it's possible to eliminate all that accidental complexity.

I find it unreasonable to split apps prematurely across all axes — 1) vertically into microservices, 2) horizontally into BE and FE, and 3) across 'tiers' with DB running on a separate machine. Instead, start with [self-contained](https://scs-architecture.org), [monolithic](https://signalvnoise.com/svn3/the-majestic-monolith) systems that run on a [single server](https://specbranch.com/posts/one-big-server/). Such systems can handle [10,000s of requests on a beefy VPS](https://blog.wesleyac.com/posts/consider-sqlite) (which is enough for most apps), scale up to the moon, and, if necessary, can be split into multiple self-contained systems for scalability. Navigation between systems can be achieved with simple hyperlinks, and one system can include another using server-side includes or iframes.

Loosely coupled, distributed architectures are challenging to operate, making them better suited for the cloud. This is one reason cloud providers advocate for such architectures. In contrast, monolithic, self-contained architectures reduce the benefits of PaaS and serverless solutions, which are opaque and costly abstractions over servers.

To simplify ops and alleviate tooling fatigue, this project includes custom scripts for database migrations, zero-downtime deployments, and infrastructure provisioning (Terraform state management is a hassle and HCL syntax is too restrictive for my taste).

Since stability, simplicity, and fewer abstractions are the guiding principles, the following tech choices are made:
* JS
* Node (23+)
* Fastify web server
* Htmx for SPA experience
* Vanilla JS
* [Template literals for server-side templating](https://blog.jim-nielsen.com/2020/switching-from-react-to-js-for-templating)
* Tailwind for styling with great DX
* Playwright for E2E tests
* SQLite for DB access w/o ORMs and query builders
* Litestream for streaming DB replication
* Caddy for zero-downtime deployments and automatic TLS

**Simplicity is achieved when there is nothing left to remove**. The project is built and shipped straight from the local dev machine, eliminating the need for Docker, artifact repositories, and external CI servers. By following the #1 rule of distributing systems — don't distribute — and choosing SQLite, we achieve parity between development and production environments. By eliminating heavy tools and abstractions we can quickly spin up a local dev server, run all tests in parallel against the real database, and know within seconds if our app works.

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
HETZNER_API_TOKEN=<secret goes here> npm run devops create
```

#### Before deployment

If you have a custom domain, set it in the package.json, and point your DNS records to the IP address of your Hetzner VPS. If not set, the default domain will be `<server ip>.nip.io`

#### Deploying to production

```
HETZNER_API_TOKEN=<secret goes here> npm run devops deploy
```

🎉 Your app should be publicly available via HTTPS on your custom domain or via `<server ip>.nip.io`.

##### Running REPL
```
DB_LOCATION=<db location> npm run repl
```

#### Production configuration
Create a `.env.production` file in the project directory and the script will copy it to the server.

# Testing
A traditional front-end/back-end separation via APIs requires developing and maintaining two distinct test suites—one for testing the back-end through the API and another for testing the front-end against a mock API, which can easily fall out of sync with the actual back-end.  This is cumbersome and clunky. By forgoing JSON APIs and instead sending HTML over the wire, we streamline the process, allowing us to test-drive a single app at the user level using Playwright.

# SQLite
SQLite is blazing fast, takes backward compatibility seriously, and enables amazing DX. [Just use SQLite](https://blog.wesleyac.com/posts/consider-sqlite). This project comes with SQLite [preconfigured for production](https://kerkour.com/sqlite-for-servers).

# Cloudflare
It’s a good idea to place your server behind Cloudflare. This way, you get DDoS protection and CDN for free, but there is much more. For example, CF can take care of Brotli compression or TLS encryption, so our Caddy server doesn't have to.

One of Cloudflare's standout features is [Workers](https://workers.cloudflare.com/). Workers allow you to run code at the edge before requests reach your server. For example, using Workers, you can create a transparent "booster layer" in front of your app, that will batch and deduplicate requests before sending to the server; or cache certain data at the edge. This approach unloads your server and lowers latency without complicating your infrastructure.

# For inspiration

- [Building the Hundred-Year Web Service](https://unplannedobsolescence.com/blog/building-the-hundred-year-web-service/)
- [Choose Boring Technology](https://boringtechnology.club)
- [From React to htmx on a real-world SaaS product](https://dev.tube/video/3GObi93tjZI)
- [HTML First](https://html-first.com)
- [Radically Straightforward](https://github.com/radically-straightforward/radically-straightforward)
- [Reasonable System for JavaScript Structure](https://ricostacruz.com/rsjs)
- [Styling CSS without losing your sanity](https://ricostacruz.com/rscss)
- [The Grug Brained Developer](https://grugbrain.dev)
- [We're breaking up with JavaScript frontends](https://triskweline.de/unpoly-rugb)
- [Web Native Apps](https://webnative.tech)
- [You Might Not Need JS](https://youmightnotneedjs.com)

# TODOS
- Litestream should replicate to Cloudflare R2. This enables better and faster recovery.
