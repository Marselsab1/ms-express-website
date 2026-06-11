(function () {
  const heroVideo = document.querySelector(".hero-video");
  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.play().catch(() => {
      // If autoplay is blocked, the poster image remains visible.
    });
  }

  const yearEls = document.querySelectorAll("[data-year]");
  const year = new Date().getFullYear();
  yearEls.forEach((el) => (el.textContent = year));

  // Mobile nav toggle
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector(".site-header .nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    // Close nav when a link inside it is tapped on mobile
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Generic AJAX submitter for forms backed by /api/* endpoints.
  // Reads form data, POSTs JSON, shows success or fallback message.
  function wireAjaxForm(selector, options) {
    const forms = document.querySelectorAll(selector);
    forms.forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitBtn = form.querySelector("button[type='submit']");
        const defaultLabel = submitBtn ? submitBtn.textContent : "";
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = options.submittingLabel || "Submitting...";
        }
        const fd = new FormData(form);
        const payload = {};
        for (const [k, v] of fd.entries()) {
          if (payload.hasOwnProperty(k)) {
            if (!Array.isArray(payload[k])) payload[k] = [payload[k]];
            payload[k].push(v);
          } else {
            payload[k] = v;
          }
        }
        try {
          const res = await fetch(form.action || options.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
          alert(options.successMessage);
          form.reset();
        } catch (err) {
          console.error(`${selector} submit error:`, err);
          alert(options.errorMessage ||
            "We couldn't process your submission. Please call (937) 999-4081.");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = defaultLabel;
          }
        }
      });
    });
  }

  wireAjaxForm("form[data-quote-form]", {
    endpoint: "/api/quote",
    submittingLabel: "Submitting...",
    successMessage:
      "Thank you. Your quote request has been received. Our dispatch team will contact you shortly.",
    errorMessage:
      "We couldn't submit your quote request. Please call dispatch: (937) 999-4081",
  });

  wireAjaxForm("form[data-contact-form]", {
    endpoint: "/api/contact",
    submittingLabel: "Sending...",
    successMessage:
      "Thank you. Your message has been received. For urgent needs, call (937) 999-4081.",
    errorMessage:
      "We couldn't send your message. Please call dispatch: (937) 999-4081",
  });

  const jobForms = document.querySelectorAll("form[data-job-application-form]");
  jobForms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector("button[type='submit']");
      const defaultLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
      }

      // Collect form data, including multi-value checkboxes (endorsements)
      const fd = new FormData(form);
      const payload = {};
      const multiKeys = new Set();
      for (const [k, v] of fd.entries()) {
        if (payload.hasOwnProperty(k)) {
          if (!Array.isArray(payload[k])) payload[k] = [payload[k]];
          payload[k].push(v);
          multiKeys.add(k);
        } else {
          payload[k] = v;
        }
      }
      // Capture all values for known checkbox-group fields explicitly
      const endorsements = fd.getAll("endorsements");
      if (endorsements.length) payload.endorsements = endorsements;

      try {
        const res = await fetch(form.action || "/api/driver-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

        alert(
          "Thank you. Your application has been received. Recruiting will contact you shortly."
        );
        form.reset();
      } catch (err) {
        console.error("Application submit error:", err);
        alert(
          "We couldn't submit your application. Please call dispatch directly: (937) 999-4081"
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = defaultLabel || "Submit Driver Application";
        }
      }
    });
  });

  // Gallery progressive reveal: "Show all" toggles the .expanded class
  // on the grid, which CSS uses to reveal the .hidden-extra tiles.
  const galleryGrid   = document.querySelector("[data-gallery]");
  const galleryToggle = document.querySelector("[data-gallery-toggle]");
  if (galleryGrid && galleryToggle) {
    const showText = galleryToggle.querySelector("[data-show-text]");
    const hideText = galleryToggle.querySelector("[data-hide-text]");
    galleryToggle.addEventListener("click", () => {
      const expanded = galleryGrid.classList.toggle("expanded");
      galleryToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (showText) showText.style.display = expanded ? "none" : "";
      if (hideText) hideText.style.display = expanded ? "" : "none";
    });
  }

})();
