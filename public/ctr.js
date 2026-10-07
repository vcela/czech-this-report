/*
 * Czech Th!s Report — visitor statistics.
 *
 * <script>window.ctr=window.ctr||function(){(ctr.q=ctr.q||[]).push(arguments)}</script>
 * <script defer src="https://…/ctr.js" data-site="SITE_ID"></script>
 *
 * Before consent nothing is stored in the browser; visits are counted
 * anonymously per day on the server. After ctr('consent', true) a random id is
 * kept in localStorage so returning visitors and multi-day conversions count.
 *
 * ctr('consent', true | false)   from your cookie banner
 * ctr('purchase', 1290)          on the order confirmation page (value in CZK)
 * ctr('event', 'name', value?)   any other conversion
 * ctr('search', 'query', count)  optional: report on-site search result count
 */
(function () {
  var script = document.currentScript;
  var site = script && script.getAttribute("data-site");
  if (!site || navigator.webdriver) return;
  var endpoint = new URL("/api/collect", script.src).href;
  var KEY = "ctr_vid";
  var SEARCH = /^(s|q|search|query|hledat|dotaz)$/i;

  var vid = null;
  try {
    vid = localStorage.getItem(KEY);
  } catch (e) {}
  var prevUrl = null;
  var lastPath = null;

  function send(type, extra) {
    var d = {
      s: site,
      t: type,
      u: location.href,
      r: prevUrl === null ? document.referrer : prevUrl,
      w: screen.width,
    };
    if (vid) d.v = vid;
    for (var k in extra) d[k] = extra[k];
    var body = JSON.stringify(d);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
    } catch (e) {}
    fetch(endpoint, { method: "POST", body: body, keepalive: true, mode: "no-cors" });
  }

  function pageview() {
    var path = location.pathname + location.search;
    if (path === lastPath) return;
    lastPath = path;
    send("pageview");
    prevUrl = location.href;
  }

  function consent(on) {
    try {
      if (on) {
        vid = vid || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
        localStorage.setItem(KEY, vid);
      } else {
        vid = null;
        localStorage.removeItem(KEY);
      }
    } catch (e) {}
  }

  function api(cmd, a, b) {
    if (cmd === "consent") consent(!!a);
    else if (cmd === "purchase") send("event", { n: "purchase", val: a });
    else if (cmd === "event") send("event", { n: String(a), val: b });
    else if (cmd === "search") send("search", { n: String(a), val: b });
  }

  // Run calls made before this script loaded (consent first matters: the
  // first pageview should already carry the id).
  var queued = (window.ctr && window.ctr.q) || [];
  window.ctr = api;
  for (var i = 0; i < queued.length; i++) api.apply(null, queued[i]);

  // Forms: every submit counts, except search forms (those show up as searches).
  document.addEventListener(
    "submit",
    function (e) {
      var f = e.target;
      if (!f || f.tagName !== "FORM") return;
      var els = f.elements;
      for (var j = 0; j < els.length; j++) {
        if (els[j].type === "search" || (SEARCH.test(els[j].name || "") && (f.method || "get").toLowerCase() === "get")) return;
      }
      send("form", { n: f.getAttribute("name") || f.id || f.getAttribute("action") || location.pathname });
    },
    true
  );

  // Single-page apps change the URL without reloading.
  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    pageview();
  };
  window.addEventListener("popstate", pageview);

  pageview();
})();
