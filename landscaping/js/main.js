/* ==========================================================================
   CLC OUTDOOR SERVICES — SITE BEHAVIOUR
   --------------------------------------------------------------------------
   1. Mobile navigation
   2. Header shadow on scroll
   3. Section reveal on scroll
   4. Reviews marquee (continuous scroll, eases to a stop on hover)
   5. Process accordion
   6. Lead form submission
   7. Today's opening hours highlight
   No dependencies. Everything is progressive — the page works without JS.
   ========================================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     1. MOBILE NAVIGATION
     --------------------------------------------------------------------- */
  (function nav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var menu = document.querySelector("[data-nav]");
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Close after tapping a link, and on Escape
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setOpen(false);
    });
  })();

  /* ---------------------------------------------------------------------
     2. HEADER SHADOW ONCE THE PAGE HAS MOVED
     --------------------------------------------------------------------- */
  (function header() {
    var el = document.querySelector("[data-header]");
    if (!el) return;
    var ticking = false;
    function update() {
      el.classList.toggle("is-stuck", window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ---------------------------------------------------------------------
     3. REVEAL ON SCROLL  (section headers only — not every element)
     --------------------------------------------------------------------- */
  (function reveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    // Nothing is hidden until this class is set, so a JS failure leaves the
    // page fully readable instead of blank.
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js-reveal");

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------------
     4. REVIEWS MARQUEE
     ---------------------------------------------------------------------
     The track holds two identical groups of cards. We translate the track
     leftwards and wrap by one group width, so the loop is seamless.

     Speed is multiplied by `rate`, which eases between 1 (running) and 0
     (paused) instead of snapping — that is what makes the hover pause feel
     smooth rather than abrupt. Pausing also happens on keyboard focus, when
     the section scrolls out of view, and when the browser tab is hidden.
     --------------------------------------------------------------------- */
  (function marquee() {
    var viewport = document.querySelector("[data-marquee]");
    if (!viewport) return;

    var track = viewport.querySelector("[data-marquee-track]");
    var group = viewport.querySelector("[data-marquee-group]");
    if (!track || !group) return;

    // Without motion, leave it as a plain horizontal scroller people can swipe.
    if (reduceMotion) {
      viewport.style.overflowX = "auto";
      return;
    }

    // Duplicate the group so there is always a second copy coming into frame.
    var clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("data-marquee-group");
    // Duplicated links must not be reachable by keyboard.
    clone.querySelectorAll("a, button").forEach(function (el) { el.setAttribute("tabindex", "-1"); });
    track.appendChild(clone);

    var SPEED = 42;        // pixels per second
    var EASE_IN = 3.4;     // how quickly it slows down (higher = quicker)
    var EASE_OUT = 1.6;    // how quickly it speeds back up

    var offset = 0;
    var rate = 1;          // current speed multiplier, 0..1
    var target = 1;        // where `rate` is heading
    var span = 0;          // width of one group, including the trailing gap
    var last = 0;
    var frame = null;

    // Four independent reasons to hold the track still. They are kept as
    // separate flags and combined in refresh(), so that (for example) the
    // section scrolling into view can't cancel a pause caused by hovering.
    var state = { hovered: false, focused: false, visible: true, tabActive: true };

    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      span = group.getBoundingClientRect().width + gap;
    }

    function tick(now) {
      if (!last) last = now;
      var dt = Math.min((now - last) / 1000, 0.05); // clamp after a tab switch
      last = now;

      // Ease the multiplier toward its target.
      var k = target > rate ? EASE_OUT : EASE_IN;
      rate += (target - rate) * Math.min(1, k * dt);
      if (Math.abs(target - rate) < 0.01) rate = target; // settle, and stop burning frames

      if (span > 0) {
        offset += SPEED * rate * dt;
        if (offset >= span) offset -= span;
        track.style.transform = "translate3d(" + (-offset).toFixed(2) + "px,0,0)";
      }

      // Stop burning frames once fully paused.
      if (rate === 0 && target === 0) { frame = null; return; }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (frame === null) { last = 0; frame = requestAnimationFrame(tick); }
    }

    // Recompute the target from every flag, then make sure frames are running
    // so the change is eased rather than applied instantly.
    function refresh() {
      target = (state.visible && state.tabActive && !state.hovered && !state.focused) ? 1 : 0;
      start();
    }

    function set(flag, value) { state[flag] = value; refresh(); }

    // Pointer and keyboard
    viewport.addEventListener("mouseenter", function () { set("hovered", true); });
    viewport.addEventListener("mouseleave", function () { set("hovered", false); });
    viewport.addEventListener("focusin",    function () { set("focused", true); });
    viewport.addEventListener("focusout",   function () { set("focused", false); });
    viewport.addEventListener("touchstart", function () { set("hovered", true); },  { passive: true });
    viewport.addEventListener("touchend",   function () { set("hovered", false); }, { passive: true });

    // Don't animate in a background tab.
    document.addEventListener("visibilitychange", function () {
      set("tabActive", !document.hidden);
    });

    // Don't animate while the section is off-screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { set("visible", e.isIntersecting); });
      }, { threshold: 0 }).observe(viewport);
    }

    // Re-measure when the layout or fonts change.
    window.addEventListener("resize", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    measure();
    start();
  })();

  /* ---------------------------------------------------------------------
     5. PROCESS ACCORDION
     ---------------------------------------------------------------------
     One panel open at a time. The panel animates via a grid-template-rows
     0fr -> 1fr transition, so it never needs a hard-coded height.
     --------------------------------------------------------------------- */
  (function accordion() {
    var group = document.querySelector("[data-accordion]");
    if (!group) return;

    var buttons = Array.prototype.slice.call(group.querySelectorAll(".step__btn"));

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var isOpen = btn.getAttribute("aria-expanded") === "true";
        buttons.forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
        btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
      });
    });
  })();

  /* ---------------------------------------------------------------------
     6. LEAD FORM
     ---------------------------------------------------------------------
     Posts to Web3Forms, which emails the submission straight to the address
     the access key belongs to. No server of our own involved.

     If the key hasn't been pasted in yet, we don't post at all — a request
     with a placeholder key would be rejected and the lead lost silently.
     Instead the visitor is told to call, which is worse than a working form
     but far better than a form that appears to work and doesn't.
     --------------------------------------------------------------------- */
  (function leadForm() {
    var form = document.querySelector("[data-lead-form]");
    if (!form) return;

    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[type=submit]");
    var keyField = form.querySelector("[name=access_key]");
    var PHONE = "(513) 580-6732";

    function say(message, kind) {
      status.textContent = message;
      status.className = "form__status" + (kind ? " is-" + kind : "");
      status.hidden = false;
    }

    function configured() {
      var k = keyField && keyField.value.trim();
      return !!k && k.indexOf("PASTE_YOUR") !== 0;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: only a bot fills this in. Bail silently.
      var trap = form.querySelector("[name=company_website]");
      if (trap && trap.value) return;

      if (!form.checkValidity()) { form.reportValidity(); return; }

      if (!configured()) {
        say("This form isn't connected yet. Please call or text " + PHONE +
            " and we'll get you on the schedule.", "error");
        return;
      }

      var data = new FormData(form);
      data.delete("company_website");   // keep the trap out of the email

      submit.disabled = true;
      say("Sending your request…");

      fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (out) {
          if (!out.success) throw new Error(out.message || "rejected");
          form.reset();
          say("Thanks — your request is in. Carson will get back to you, usually the same day.", "ok");
        })
        .catch(function () {
          say("That didn't go through. Please call or text " + PHONE +
              " and we'll get you on the schedule.", "error");
        })
        .then(function () { submit.disabled = false; });
    });
  })();

  /* ---------------------------------------------------------------------
     7. HIGHLIGHT TODAY IN THE OPENING HOURS
     --------------------------------------------------------------------- */
  (function today() {
    var row = document.querySelector('[data-day="' + new Date().getDay() + '"]');
    if (row) row.classList.add("is-today");
  })();

})();
