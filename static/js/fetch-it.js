const DEFAULT_HEADERS = {
  "x-client-version": document.body.dataset.appversion,
  "fetch-it": "true",
  credentials: "same-origin",
};

export class FetchIt extends HTMLElement {
  static pop = false;

  constructor() {
    super();
    this.addEventListener("submit", this.onSubmit);
    this.addEventListener("click", this.onClick);

    if (!FetchIt.pop) {
      FetchIt.pop = true;
      window.addEventListener("popstate", () => this.restoreFromCache());
    }
  }

  async restoreFromCache() {
    const cached = localStorage.getItem(location.href);
    if (!cached) return location.reload();

    const { text } = JSON.parse(cached);
    const { html, title } = this.parse(text);
    this.inject(html, title);
  }

  async onSubmit(e) {
    const form = e.target;
    if (form.parentElement !== this) return;

    e.preventDefault();

    if (e.submitter) e.submitter.disabled = true;
    this.progress(true);
    try {
      const response = await fetch(form.action, {
        method: form.method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...DEFAULT_HEADERS,
        },
        body: new URLSearchParams(new FormData(form)),
      });

      if (!response.ok) return;
      this.clientSideSwap(form.action);
      const text = await response.text();
      const { html, title } = this.parse(text);
      this.inject(html, title);
    } finally {
      if (e.submitter) e.submitter.disabled = false;
      this.progress(false);
    }
  }

  async onClick(e) {
    const a = e.target.closest("a");
    if (!a || a.parentElement !== this) return;

    e.preventDefault();
    this.progress(true);
    try {
      const response = await fetch(a.href, { headers: { ...DEFAULT_HEADERS } });
      if (!response.ok) return;
      this.clientSideSwap(a.href);
      const text = await response.text();
      const { html, title } = this.parse(text);
      this.inject(html, title);

      if (!a.getAttribute("rel")?.includes("noindex")) {
        localStorage.setItem(a.href, JSON.stringify({ text }));
        history.pushState(null, "", a.href);
      }
    } finally {
      this.progress(false);
    }
  }

  // Uses the URL hash to find a pre-rendered <template> on the page and inject its content.
  // <form action="/like/42#like-42-liked">     → injects content of <template id="like-42-liked">
  // <form action="/unlike/42#like-42-unliked"> → injects content of <template id="like-42-unliked">
  //
  // <template id="like-42-liked">
  //   <form id="like-42" action="/unlike/42#like-42-unliked" method="post">...</form>
  //   <div id="like-count-header">43 likes</div>
  // </template>
  clientSideSwap(url) {
    const hash = new URL(url).hash;
    if (!hash) return;
    const tmpl = document.querySelector(hash);
    if (!tmpl) return;
    this.inject(tmpl.content);
  }

  inject(html, title) {
    queueMicrotask(() => {
      if (title) document.title = title;

      html.querySelectorAll("[id]").forEach((el) => {
        const target = document.getElementById(el.id);
        if (target) target.replaceWith(el);
      });

      this.rerunScripts();
    });
  }

  rerunScripts() {
    // To run scripts from dynamically injected HTML, we need to clone the script.
    document.body.querySelectorAll("script").forEach((script) => {
      const copy = document.createElement("script");
      if (!script.src) copy.textContent = script.textContent;
      for (const a of script.attributes) copy.setAttribute(a.name, a.value);
      script.replaceWith(copy);
    });
  }

  progress(show) {
    const progress = document.querySelector("progress");
    if (progress) progress.hidden = !show;
  }

  parse(text) {
    const tpl = document.createElement("div");
    tpl.innerHTML = text;
    const html = tpl;
    const title = html.querySelector("title")?.textContent;
    return { html, title };
  }
}

customElements.define("fetch-it", FetchIt);
