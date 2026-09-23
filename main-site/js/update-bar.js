// Service worker registration and the "new version ready" bar. The one place
// the site registers its worker; pages load this module instead of calling
// navigator.serviceWorker.register() themselves.
//
// A new worker never activates on its own. It installs, waits, and is only
// promoted when somebody presses Reload here.

const SW_URL = "/sw.js";

const STRINGS = {
  label: "Update",
  ready: "A new version of SG MRT Alerts is ready.",
  reload: "Reload",
  later: "Not now",
};

let registration = null;
let waitingWorker = null;
let reloading = false;
// This page view only. Never stored: a stored dismissal would mean a reader
// who says "not now" once never hears about an update again.
let dismissed = false;

function render() {
  const existing = document.querySelector(".update-notice");

  if (!waitingWorker || dismissed) {
    existing?.remove();
    return;
  }

  const bar = existing ?? document.createElement("div");
  bar.className = "update-notice";
  // status, not alert: nothing is wrong, so it should not interrupt a screen
  // reader mid-sentence.
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-label", STRINGS.label);
  bar.innerHTML = `
    <div class="update-notice-inner">
      <p>${STRINGS.ready}</p>
      <button type="button" class="update-notice-btn primary" data-sw-update>${STRINGS.reload}</button>
      <button type="button" class="update-notice-btn" data-sw-later>${STRINGS.later}</button>
    </div>
  `;

  bar.querySelector("[data-sw-update]").addEventListener("click", () => {
    // The only place anything asks for skipWaiting. The reload happens on
    // controllerchange, not here.
    waitingWorker?.postMessage("skip-waiting");
  });

  bar.querySelector("[data-sw-later]").addEventListener("click", () => {
    dismissed = true;
    render();
  });

  if (!existing) document.body.prepend(bar);
}

function watchForUpdate() {
  if (!registration) return;

  // A worker already waiting when the page opened. The ordinary case on the
  // second page view after a deploy.
  if (registration.waiting && navigator.serviceWorker.controller) {
    waitingWorker = registration.waiting;
    render();
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;

    installing.addEventListener("statechange", () => {
      // installed with no controller is a first install: there is no previous
      // version on screen, so nothing to prompt about.
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        waitingWorker = registration.waiting ?? installing;
        render();
      }
    });
  });
}

function registerWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register(SW_URL)
    .then((reg) => {
      registration = reg;
      watchForUpdate();
    })
    .catch((cause) => {
      // Private browsing in some browsers, and any http origin that is not
      // localhost, land here. Not a reason to break the page.
      console.warn("service worker registration failed:", cause);
    });

  // Reload once the new worker has taken over, so the reload is served by it
  // rather than the one being replaced. The flag guards against
  // controllerchange firing more than once and looping.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

// On load rather than immediately, so precaching does not compete with the
// page's own first fetches.
if (document.readyState === "complete") registerWorker();
else window.addEventListener("load", registerWorker, { once: true });
