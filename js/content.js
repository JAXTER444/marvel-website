(function () {
  const CONTENT_URL = "content/site.json";

  function setText(el, value) {
    if (!el || value == null) return;
    el.textContent = String(value);
  }

  function grouped(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function applyStat(el, value, suffix, group) {
    if (!el) return;
    const num = Number(value);
    const display = group === "space" ? grouped(num) : String(num);
    const text = `${display}${suffix || ""}`;
    el.setAttribute("data-count", String(num));
    if (suffix != null) el.setAttribute("data-suffix", suffix);
    if (group) el.setAttribute("data-group", group);
    el.setAttribute("aria-label", text);
    el.textContent = text;
  }

  function applyDataEdit(content) {
    document.querySelectorAll("[data-edit]").forEach((el) => {
      const key = el.getAttribute("data-edit");
      if (!key) return;
      const parts = key.split(".");
      let cursor = content;
      for (const part of parts) {
        if (cursor == null) return;
        cursor = cursor[part];
      }
      if (cursor == null) return;

      if (el.matches("img") && typeof cursor === "object") {
        if (cursor.path) el.setAttribute("src", cursor.path);
        if (cursor.alt) el.setAttribute("alt", cursor.alt);
        return;
      }

      if (el.hasAttribute("data-edit-attr")) {
        const attr = el.getAttribute("data-edit-attr");
        if (attr) el.setAttribute(attr, String(cursor));
        return;
      }

      setText(el, cursor);
    });
  }

  function applyContact(content) {
    const contact = content.contact || {};
    const email = contact.email;
    const phone = contact.phone;
    const phoneHref = contact.phoneHref || String(phone || "").replace(/\s+/g, "");
    const address = contact.address;

    document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
      if (!email) return;
      el.setAttribute("href", `mailto:${email}`);
      if (el.closest(".site-footer-meta") || el.id === "contact-email" || el.hasAttribute("data-edit")) {
        el.textContent = email;
      }
    });

    document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
      if (!phoneHref) return;
      el.setAttribute("href", `tel:${phoneHref}`);
      if (el.closest(".site-footer-meta") || el.hasAttribute("data-edit")) {
        el.textContent = phone;
      }
    });

    document.querySelectorAll(".site-footer-meta a[href*='google.com/maps']").forEach((el) => {
      if (!address) return;
      el.textContent = address;
      el.setAttribute(
        "href",
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      );
    });

    document.querySelectorAll("figcaption").forEach((el) => {
      if (!address) return;
      if (/Via Salara|Irene, Pretoria/i.test(el.textContent || "") || el.hasAttribute("data-edit")) {
        el.textContent = address;
      }
    });
  }

  function applyHomeStats(content) {
    const stats = content.home && content.home.stats;
    if (!stats) return;

    const placements = document.querySelector(".stat-1 .stat-value");
    const years = document.querySelector(".stat-2 .stat-value");
    const vacancies = document.querySelector(".stat-3 .stat-value");
    const repeat = document.querySelector(".stat-4 .stat-value");
    const labels = {
      placements: document.querySelector(".stat-1 .stat-label"),
      years: document.querySelector(".stat-2 .stat-label"),
      vacancies: document.querySelector(".stat-3 .stat-label"),
      repeatRate: document.querySelector(".stat-4 .stat-label"),
    };

    const vacancyStat = stats.vacancies || stats.timeToFill;
    applyStat(placements, stats.placements.value, "", "space");
    applyStat(years, stats.years.value, stats.years.suffix || "+");
    if (vacancyStat) {
      applyStat(vacancies, vacancyStat.value, vacancyStat.suffix || "");
      if (vacancies) vacancies.removeAttribute("data-suffix");
    }
    applyStat(repeat, stats.repeatRate.value, stats.repeatRate.suffix || "%");

    setText(labels.placements, stats.placements.label);
    setText(labels.years, stats.years.label);
    setText(labels.vacancies, (vacancyStat && vacancyStat.label) || "Current vacancies");
    setText(labels.repeatRate, stats.repeatRate.label);
  }

  function refreshVacancyCount() {
    const config = window.MARVEL_JOBS || {};
    const apiUrl = typeof config.apiUrl === "string" ? config.apiUrl.trim() : "";
    const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
    const vacancies = document.querySelector(".stat-3 .stat-value");
    if (!vacancies || !apiUrl || !apiKey) return;

    fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("jobs missing");
        return response.json();
      })
      .then((data) => {
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        applyStat(vacancies, jobs.length, "");
        vacancies.removeAttribute("data-suffix");
      })
      .catch(() => {
        /* Keep static / content fallback. */
      });
  }

  function applyImageAlts(content) {
    const images = content.images || {};
    Object.keys(images).forEach((key) => {
      const meta = images[key];
      if (!meta || !meta.path) return;
      document.querySelectorAll(`img[src="${meta.path}"], img[src="./${meta.path}"]`).forEach((img) => {
        if (meta.alt) img.setAttribute("alt", meta.alt);
      });
    });
  }

  fetch(CONTENT_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("content missing");
      return response.json();
    })
    .then((content) => {
      applyDataEdit(content);
      applyContact(content);
      applyHomeStats(content);
      applyImageAlts(content);
      refreshVacancyCount();
    })
    .catch(() => {
      /* Keep static HTML fallback. */
      refreshVacancyCount();
    });
})();
