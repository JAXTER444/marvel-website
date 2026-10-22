const config = window.MARVEL_JOBS ?? {};
const board = document.querySelector(".jobs-board");
const listEl = document.querySelector("#job-list");
const detailStage = document.querySelector("#jobs-detail-stage");
const detailEl = document.querySelector("#job-detail");
const applyAsideEl = document.querySelector("#job-apply-aside");
const statusEl = document.querySelector("#job-status");
const searchEl = document.querySelector("#job-search");
const toolbarEl = document.querySelector(".jobs-toolbar");
const filterBtn = document.querySelector("#job-filter-btn");
const filterBadge = document.querySelector("#job-filter-badge");
const filterPanel = document.querySelector("#job-filter-panel");
const filterBody = document.querySelector("#job-filter-body");
const filterClear = document.querySelector("#job-filter-clear");

let currentJobs = [];
let selectedId = null;
let searchQuery = "";
let filterOpen = false;
/** @type {{ employmentTypes: string[], departments: string[], provinces: string[], citiesByProvince: Record<string, string[]> }} */
let activeFilters = {
  employmentTypes: [],
  departments: [],
  provinces: [],
  citiesByProvince: {},
};
/** @type {Set<string>} */
let expandedProvinces = new Set();

function emptyFilters() {
  return {
    employmentTypes: [],
    departments: [],
    provinces: [],
    citiesByProvince: {},
  };
}

/** Split "Province, City" location strings from the API. */
function parseLocation(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return { province: "", city: "" };
  const idx = raw.indexOf(",");
  if (idx === -1) return { province: raw, city: "" };
  return {
    province: raw.slice(0, idx).trim(),
    city: raw.slice(idx + 1).trim(),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const BULLET_RE = /^\s*[*•-]\s+(.*)$/;

function isBulletLine(line) {
  return BULLET_RE.test(line);
}

function stripBullet(line) {
  return line.replace(BULLET_RE, "$1").trim();
}

/** Render description text; lines starting with `* ` become bullets. */
function renderDescriptionHtml(description) {
  const lines = String(description ?? "")
    .replaceAll("\r\n", "\n")
    .split("\n");
  const parts = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    if (isBulletLine(lines[index])) {
      const items = [];
      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          index += 1;
          let look = index;
          while (look < lines.length && !lines[look].trim()) look += 1;
          if (look >= lines.length || !isBulletLine(lines[look])) break;
          continue;
        }
        if (!isBulletLine(line)) break;
        items.push(`<li>${escapeHtml(stripBullet(line))}</li>`);
        index += 1;
      }
      parts.push(`<ul class="jobs-bullets">${items.join("")}</ul>`);
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBulletLine(lines[index])
    ) {
      paragraphLines.push(lines[index].trimEnd());
      index += 1;
    }
    parts.push(`<p>${escapeHtml(paragraphLines.join("\n"))}</p>`);
  }

  return parts.join("");
}

function metaParts(job) {
  return [job.location, job.locationType, job.employmentType, job.department, job.experience]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
}

function payLine(job) {
  const pay = job.compensation;
  if (!pay) return "";
  const range = [pay.minSalary, pay.maxSalary].filter(Boolean).join(" – ");
  return [pay.currency, range, pay.payPeriod].filter(Boolean).join(" ");
}

function deadlineLine(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function postedLine(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatLocationLabel(job) {
  const type = typeof job.locationType === "string" ? job.locationType.trim() : "";
  const place = typeof job.location === "string" ? job.location.trim() : "";
  if (type && place) return `${type} (${place})`;
  return place || type;
}

function salaryLabel(job) {
  const period = job.compensation?.payPeriod;
  switch (period) {
    case "month":
      return "Monthly Salary";
    case "hour":
      return "Hourly Rate";
    case "week":
      return "Weekly Salary";
    default:
      return "Salary";
  }
}

const overviewIcons = {
  calendar: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M12 1.5V4.5M6 1.5V4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2.625 6.75H15.375" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.25 3H3.75C3.33579 3 3 3.33579 3 3.75V14.25C3 14.6642 3.33579 15 3.75 15H14.25C14.6642 15 15 14.6642 15 14.25V3.75C15 3.33579 14.6642 3 14.25 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  award: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 11.25C11.4853 11.25 13.5 9.23528 13.5 6.75C13.5 4.26472 11.4853 2.25 9 2.25C6.51472 2.25 4.5 4.26472 4.5 6.75C4.5 9.23528 6.51472 11.25 9 11.25Z" stroke="currentColor" stroke-width="1.5"/><path d="M6.12891 10.5L5.25 15.75L9 13.5L12.75 15.75L11.8711 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  card: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2.25 6.75H15.75M2.25 9H15.75M3.75 3.75H14.25C15.0784 3.75 15.75 4.42157 15.75 5.25V12.75C15.75 13.5784 15.0784 14.25 14.25 14.25H3.75C2.92157 14.25 2.25 13.5784 2.25 12.75V5.25C2.25 4.42157 2.92157 3.75 3.75 3.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pin: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 9.75C10.2426 9.75 11.25 8.74264 11.25 7.5C11.25 6.25736 10.2426 5.25 9 5.25C7.75736 5.25 6.75 6.25736 6.75 7.5C6.75 8.74264 7.75736 9.75 9 9.75Z" stroke="currentColor" stroke-width="1.5"/><path d="M9 15.75C9 15.75 14.25 11.25 14.25 7.5C14.25 4.6005 11.8995 2.25 9 2.25C6.1005 2.25 3.75 4.6005 3.75 7.5C3.75 11.25 9 15.75 9 15.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clock: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 4.5V9L11.25 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 15.75C12.7279 15.75 15.75 12.7279 15.75 9C15.75 5.27208 12.7279 2.25 9 2.25C5.27208 2.25 2.25 5.27208 2.25 9C2.25 12.7279 5.27208 15.75 9 15.75Z" stroke="currentColor" stroke-width="1.5"/></svg>`,
};

function overviewItem(icon, label, value) {
  if (!value) return "";
  return `
    <div class="jobs-overview-item">
      <span class="jobs-overview-icon" aria-hidden="true">${icon}</span>
      <div class="jobs-overview-text">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    </div>
  `;
}

function renderOverview(job) {
  const posted = postedLine(job.createdAt);
  const experience = typeof job.experience === "string" ? job.experience.trim() : "";
  const salary = payLine(job);
  const location = formatLocationLabel(job);
  const employmentType =
    typeof job.employmentType === "string" ? job.employmentType.trim() : "";
  const due = deadlineLine(job.deadline);
  const items = [
    overviewItem(overviewIcons.calendar, "Date Posted", posted),
    overviewItem(overviewIcons.award, "Required Experience", experience),
    salary ? overviewItem(overviewIcons.card, salaryLabel(job), salary) : "",
    overviewItem(overviewIcons.pin, "Location", location),
    overviewItem(overviewIcons.clock, "Job Type", employmentType),
    overviewItem(overviewIcons.calendar, "Apply by", due),
  ].filter(Boolean);

  if (!items.length) return "";

  return `
    <section class="jobs-overview-card" aria-label="Overview">
      <h3 class="jobs-overview-title">Overview</h3>
      <dl class="jobs-overview-list">${items.join("")}</dl>
    </section>
  `;
}

function applyOrigin(job) {
  try {
    return new URL(job.applyUrl).origin;
  } catch {
    return "https://cooptatio.vercel.app";
  }
}

function applySlug(job) {
  if (job.id) return String(job.id);
  try {
    const path = new URL(job.applyUrl).pathname;
    const match = /\/apply\/([^/]+)/.exec(path);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

/** Cooptatio application form step 1 (same as Apply Now on cooptatio). */
function applyFormUrl(job) {
  const origin = applyOrigin(job);
  const slug = applySlug(job);
  if (!slug) return job.applyUrl;
  return `${origin}/apply/${encodeURIComponent(slug)}/form/1`;
}

/** Cooptatio Easy Apply → candidate login, then form with easyApply=1. */
function easyApplyUrl(job) {
  const formUrl = `${applyFormUrl(job)}?easyApply=1`;
  const origin = applyOrigin(job);
  return `${origin}/candidate/login?return=${encodeURIComponent(formUrl)}`;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function filterOptions() {
  /** @type {Map<string, Set<string>>} */
  const citiesByProvince = new Map();
  for (const job of currentJobs) {
    const { province, city } = parseLocation(job.location);
    if (!province) continue;
    if (!citiesByProvince.has(province)) citiesByProvince.set(province, new Set());
    if (city) citiesByProvince.get(province)?.add(city);
  }

  const provinces = [...citiesByProvince.keys()].sort((a, b) => a.localeCompare(b));
  /** @type {Record<string, string[]>} */
  const cities = {};
  for (const province of provinces) {
    cities[province] = [...(citiesByProvince.get(province) ?? [])].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  return {
    provinces,
    cities,
    employmentTypes: uniqueSorted(currentJobs.map((job) => job.employmentType)),
    departments: uniqueSorted(
      currentJobs.flatMap((job) =>
        String(job.department ?? "")
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ),
  };
}

function locationFilterCount() {
  return activeFilters.provinces.reduce((total, province) => {
    const cities = activeFilters.citiesByProvince[province] ?? [];
    return total + (cities.length > 0 ? cities.length : 1);
  }, 0);
}

function activeFilterCount() {
  return (
    locationFilterCount() +
    activeFilters.employmentTypes.length +
    activeFilters.departments.length
  );
}

function jobMatchesLocation(job) {
  if (!activeFilters.provinces.length) return true;
  const { province, city } = parseLocation(job.location);
  if (!activeFilters.provinces.includes(province)) return false;
  const cities = activeFilters.citiesByProvince[province] ?? [];
  if (!cities.length) return true;
  return Boolean(city) && cities.includes(city);
}

function jobMatchesFilters(job) {
  if (!jobMatchesLocation(job)) return false;
  if (
    activeFilters.employmentTypes.length &&
    !activeFilters.employmentTypes.includes(String(job.employmentType ?? "").trim())
  ) {
    return false;
  }
  if (activeFilters.departments.length) {
    const departments = String(job.department ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!activeFilters.departments.some((value) => departments.includes(value))) {
      return false;
    }
  }
  return true;
}

function filteredJobs() {
  const q = searchQuery.trim().toLowerCase();
  return currentJobs.filter((job) => {
    if (!jobMatchesFilters(job)) return false;
    if (!q) return true;
    const haystack = [
      job.title,
      job.companyName,
      job.location,
      job.locationType,
      job.employmentType,
      job.department,
      job.experience,
      ...(job.descriptionSections ?? []).flatMap((section) => [
        section.heading,
        section.description,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function updateFilterChrome() {
  const count = activeFilterCount();
  filterBtn?.classList.toggle("is-active", count > 0);
  if (filterBadge) {
    if (count > 0) {
      filterBadge.hidden = false;
      filterBadge.textContent = String(count);
    } else {
      filterBadge.hidden = true;
    }
  }
  if (filterClear) filterClear.hidden = count === 0;
  if (filterBtn) {
    filterBtn.setAttribute(
      "aria-label",
      count > 0 ? `Filter, ${count} active` : "Filter",
    );
    filterBtn.setAttribute("aria-expanded", filterOpen ? "true" : "false");
  }
}

function renderFilterPanel() {
  if (!filterBody) return;
  const options = filterOptions();

  const section = (label, key, values) => {
    if (!values.length) return "";
    const selected = activeFilters[key];
    return `
      <section class="jobs-filter-section">
        <p class="jobs-filter-section-label">${escapeHtml(label)}</p>
        <div class="jobs-filter-options">
          ${values
            .map(
              (value) => `
            <label class="jobs-filter-option">
              <input type="checkbox" data-filter-key="${escapeHtml(key)}" data-filter-value="${escapeHtml(value)}" ${selected.includes(value) ? "checked" : ""} />
              <span>${escapeHtml(value)}</span>
            </label>
          `,
            )
            .join("")}
        </div>
      </section>
    `;
  };

  const locationSection = () => {
    if (!options.provinces.length) return "";
    return `
      <section class="jobs-filter-section">
        <p class="jobs-filter-section-label">Location</p>
        <div class="jobs-filter-options">
          ${options.provinces
            .map((province) => {
              const cities = options.cities[province] ?? [];
              const provinceOn = activeFilters.provinces.includes(province);
              const selectedCities = activeFilters.citiesByProvince[province] ?? [];
              const allCitiesMode = provinceOn && selectedCities.length === 0;
              const expanded = expandedProvinces.has(province);
              const cityList =
                cities.length === 0
                  ? ""
                  : `
                <div class="jobs-filter-cities" ${expanded ? "" : "hidden"}>
                  ${cities
                    .map((city) => {
                      const cityOn =
                        provinceOn &&
                        (allCitiesMode || selectedCities.includes(city));
                      return `
                    <label class="jobs-filter-option jobs-filter-option-city${allCitiesMode ? " is-all-selected" : ""}">
                      <input
                        type="checkbox"
                        data-filter-city-province="${escapeHtml(province)}"
                        data-filter-city="${escapeHtml(city)}"
                        ${cityOn ? "checked" : ""}
                        ${provinceOn ? "" : "disabled"}
                      />
                      <span>${escapeHtml(city)}</span>
                    </label>
                  `;
                    })
                    .join("")}
                </div>
              `;
              return `
                <div class="jobs-filter-province${expanded ? " is-expanded" : ""}">
                  <div class="jobs-filter-province-row">
                    <label class="jobs-filter-option">
                      <input
                        type="checkbox"
                        data-filter-province="${escapeHtml(province)}"
                        ${provinceOn ? "checked" : ""}
                      />
                      <span>${escapeHtml(province)}</span>
                    </label>
                    ${
                      cities.length
                        ? `<button
                            type="button"
                            class="jobs-filter-province-toggle"
                            data-province-toggle="${escapeHtml(province)}"
                            aria-expanded="${expanded ? "true" : "false"}"
                            aria-label="${expanded ? "Hide" : "Show"} cities in ${escapeHtml(province)}"
                          ></button>`
                        : ""
                    }
                  </div>
                  ${cityList}
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  };

  const html = [
    locationSection(),
    section("Job type", "employmentTypes", options.employmentTypes),
    section("Sector", "departments", options.departments),
  ]
    .filter(Boolean)
    .join("");

  filterBody.innerHTML =
    html || `<p class="jobs-filter-empty">No filters available yet.</p>`;
  updateFilterChrome();
}

function setFilterOpen(open) {
  filterOpen = open;
  if (filterPanel) filterPanel.hidden = !open;
  updateFilterChrome();
  if (open) renderFilterPanel();
}

function applyFiltersAndRefresh() {
  updateFilterChrome();
  const visible = filteredJobs();
  if (selectedId && !visible.some((job) => job.id === selectedId)) {
    clearSelection();
    return;
  }
  renderList(visible, selectedId);
}

function setFilterValue(key, value, enabled) {
  const list = activeFilters[key] ?? [];
  const next = enabled
    ? list.includes(value)
      ? list
      : [...list, value]
    : list.filter((entry) => entry !== value);
  activeFilters = { ...activeFilters, [key]: next };
  applyFiltersAndRefresh();
  updateFilterChrome();
}

function setProvinceFilter(province, enabled) {
  const provinces = enabled
    ? activeFilters.provinces.includes(province)
      ? activeFilters.provinces
      : [...activeFilters.provinces, province]
    : activeFilters.provinces.filter((entry) => entry !== province);
  const citiesByProvince = { ...activeFilters.citiesByProvince };
  if (!enabled) {
    delete citiesByProvince[province];
  } else {
    expandedProvinces.add(province);
  }
  activeFilters = { ...activeFilters, provinces, citiesByProvince };
  applyFiltersAndRefresh();
  renderFilterPanel();
}

function setCityFilter(province, city, enabled) {
  if (!activeFilters.provinces.includes(province)) return;
  const current = activeFilters.citiesByProvince[province] ?? [];

  // Province-only (= all cities): first city click narrows to just that city.
  let nextCities;
  if (current.length === 0) {
    nextCities = [city];
  } else {
    nextCities = enabled
      ? current.includes(city)
        ? current
        : [...current, city]
      : current.filter((entry) => entry !== city);
  }

  activeFilters = {
    ...activeFilters,
    citiesByProvince: {
      ...activeFilters.citiesByProvince,
      [province]: nextCities,
    },
  };
  applyFiltersAndRefresh();
  renderFilterPanel();
}

function toggleProvinceExpanded(province) {
  if (expandedProvinces.has(province)) expandedProvinces.delete(province);
  else expandedProvinces.add(province);
  renderFilterPanel();
}

function clearFilters() {
  activeFilters = emptyFilters();
  expandedProvinces = new Set();
  applyFiltersAndRefresh();
  renderFilterPanel();
}

function setStatus(html) {
  board?.classList.add("is-message");
  board?.classList.remove("has-selection");
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.innerHTML = html;
  if (listEl) listEl.innerHTML = "";
  if (detailStage) detailStage.hidden = true;
  if (detailEl) detailEl.innerHTML = "";
  if (applyAsideEl) applyAsideEl.innerHTML = "";
  if (searchEl) searchEl.disabled = true;
  if (filterBtn) filterBtn.disabled = true;
  setFilterOpen(false);
}

function setListSelection(activeId) {
  listEl?.querySelectorAll(".job-card").forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    card.classList.toggle("is-selected", card.dataset.jobId === activeId);
  });
}

function clearSelection() {
  const openCard = listEl?.querySelector(".job-card.is-selected");
  const cardTopBefore =
    openCard instanceof HTMLElement ? openCard.getBoundingClientRect().top : null;
  selectedId = null;
  if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  setListSelection(null);
  window.setTimeout(() => {
    if (selectedId) return;
    board?.classList.remove("has-selection");
    if (detailStage) detailStage.hidden = true;
    if (detailEl) detailEl.innerHTML = "";
    if (applyAsideEl) applyAsideEl.innerHTML = "";
    if (listEl) listEl.scrollTop = 0;
    if (openCard instanceof HTMLElement && cardTopBefore != null) {
      const cardTopAfter = openCard.getBoundingClientRect().top;
      window.scrollBy(0, cardTopAfter - cardTopBefore);
    }
  }, 200);
}

function renderDetail(job) {
  if (!detailEl || !applyAsideEl || !detailStage) return;
  detailStage.hidden = false;
  const formUrl = applyFormUrl(job);
  const easyUrl = easyApplyUrl(job);
  const sections = (job.descriptionSections ?? [])
    .filter((section) => section.heading || section.description)
    .map(
      (section) => `
        <section class="jobs-section">
          ${section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : ""}
          ${section.description ? renderDescriptionHtml(section.description) : ""}
        </section>
      `,
    )
    .join("");

  detailEl.innerHTML = `
    <header class="job-detail-heading">
      <button type="button" class="jobs-back" id="jobs-back">
        <span aria-hidden="true">←</span> All roles
      </button>
      <p class="jobs-kicker">${escapeHtml(job.companyName || "Marvel Placement Consultants")}</p>
      <h2>${escapeHtml(job.title)}</h2>
    </header>
    <div class="jobs-copy">${sections || "<p>Write to us and we will send the brief for this role.</p>"}</div>
    <div class="job-detail-footer-actions">
      <a class="btn btn-dark" href="contact.html">Ask about this role</a>
    </div>
  `;

  applyAsideEl.innerHTML = `
    ${renderOverview(job)}
    <div class="job-detail-aside-actions">
      <a class="btn btn-green btn-apply-now" href="${escapeHtml(formUrl)}" target="_blank" rel="noopener noreferrer">Apply Now</a>
    </div>
    <section class="easy-apply-card" aria-label="Easy Apply">
      <div class="easy-apply-brand">
        <img class="easy-apply-mark" src="assets/cooptatio/logo-mark.svg" alt="" width="18" height="18" />
        <img class="easy-apply-wordmark" src="assets/cooptatio/logo-wordmark.svg" alt="cooptatio" width="72" height="16" />
      </div>
      <p class="easy-apply-prompt">Already have an account?</p>
      <a class="easy-apply-button" href="${escapeHtml(easyUrl)}" target="_blank" rel="noopener noreferrer">Easy Apply</a>
    </section>
  `;

  document.querySelector("#jobs-back")?.addEventListener("click", () => {
    clearSelection();
  });
}

function renderList(jobs, activeId) {
  if (!listEl) return;
  if (!jobs.length) {
    listEl.innerHTML = `<p class="jobs-empty">No roles match those filters.</p>`;
    return;
  }

  listEl.innerHTML = jobs
    .map(
      (job) => `
        <button type="button" class="job-card${job.id === activeId ? " is-selected" : ""}" data-job-id="${escapeHtml(job.id)}">
          <span class="job-card-body">
            <span class="job-card-title">${escapeHtml(job.title)}</span>
            <span class="job-card-meta">${escapeHtml(metaParts(job).slice(0, 3).join(" · "))}</span>
          </span>
          <span class="job-card-chevron" aria-hidden="true"></span>
        </button>
      `,
    )
    .join("");
}

function selectJob(id, { pushHash = true } = {}) {
  const visible = filteredJobs();
  const job =
    visible.find((item) => item.id === id) ??
    currentJobs.find((item) => item.id === id);
  if (!job) return;

  const switching = Boolean(selectedId);
  selectedId = job.id;
  board?.classList.add("has-selection");
  if (pushHash) {
    const nextHash = `#${encodeURIComponent(job.id)}`;
    if (location.hash !== nextHash) {
      history.replaceState(null, "", nextHash);
    }
  }
  if (switching) {
    setListSelection(job.id);
  } else {
    renderList(visible, null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setListSelection(job.id);
      });
    });
  }
  renderDetail(job);
  requestAnimationFrame(() => {
    const selectedCard = listEl?.querySelector(
      `.job-card[data-job-id="${CSS.escape(job.id)}"]`,
    );
    if (selectedCard instanceof HTMLElement && listEl) {
      const listTop = listEl.getBoundingClientRect().top;
      const cardTop = selectedCard.getBoundingClientRect().top;
      listEl.scrollTo({
        top: listEl.scrollTop + (cardTop - listTop),
        behavior: "smooth",
      });
    }
    detailStage?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function showBrowse() {
  selectedId = null;
  board?.classList.remove("is-message", "has-selection");
  statusEl.hidden = true;
  statusEl.innerHTML = "";
  if (searchEl) searchEl.disabled = false;
  if (filterBtn) filterBtn.disabled = false;
  updateFilterChrome();
  const visible = filteredJobs();
  if (detailStage) detailStage.hidden = true;
  if (detailEl) detailEl.innerHTML = "";
  if (applyAsideEl) applyAsideEl.innerHTML = "";
  renderList(visible, null);
}

async function loadJobs() {
  if (!listEl || !detailEl || !detailStage || !statusEl) return;

  if (!config.apiUrl || !config.apiKey) {
    setStatus(
      `<p>Open roles will appear here once the job board is connected.</p><a class="btn btn-dark" href="contact.html">Contact us</a>`,
    );
    return;
  }

  setStatus(`<p class="jobs-loading">Loading open roles…</p>`);

  try {
    const response = await fetch(config.apiUrl, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();
    currentJobs = Array.isArray(data.jobs) ? data.jobs : [];
    if (!currentJobs.length) {
      setStatus(
        `<p>No open roles right now.</p><a class="btn btn-dark" href="contact.html">Tell us what you’re looking for</a>`,
      );
      return;
    }

    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (searchEl) searchEl.disabled = false;
    if (filterBtn) filterBtn.disabled = false;
    renderFilterPanel();

    if (hash && currentJobs.some((job) => job.id === hash)) {
      board?.classList.remove("is-message");
      statusEl.hidden = true;
      statusEl.innerHTML = "";
      selectJob(hash, { pushHash: false });
    } else {
      showBrowse();
    }
  } catch {
    currentJobs = [];
    setStatus(
      `<p>We couldn’t load open roles.</p><button type="button" class="btn btn-green" id="jobs-retry">Try again</button>`,
    );
    document.querySelector("#jobs-retry")?.addEventListener("click", () => {
      void loadJobs();
    });
  }
}

listEl?.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-job-id]") : null;
  if (!(button instanceof HTMLElement) || !button.dataset.jobId) return;
  if (selectedId && button.dataset.jobId === selectedId) {
    clearSelection();
    return;
  }
  selectJob(button.dataset.jobId);
});

searchEl?.addEventListener("input", () => {
  searchQuery = searchEl.value ?? "";
  applyFiltersAndRefresh();
});

filterBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  setFilterOpen(!filterOpen);
});

filterClear?.addEventListener("click", (event) => {
  event.stopPropagation();
  clearFilters();
});

filterBody?.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;

  const province = input.dataset.filterProvince;
  if (province) {
    setProvinceFilter(province, input.checked);
    return;
  }

  const cityProvince = input.dataset.filterCityProvince;
  const city = input.dataset.filterCity;
  if (cityProvince && city) {
    setCityFilter(cityProvince, city, input.checked);
    return;
  }

  const key = input.dataset.filterKey;
  const value = input.dataset.filterValue;
  if (!key || !value) return;
  setFilterValue(key, value, input.checked);
});

filterBody?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const toggle = target.closest("[data-province-toggle]");
  if (!(toggle instanceof HTMLElement)) return;
  event.preventDefault();
  event.stopPropagation();
  const province = toggle.dataset.provinceToggle;
  if (!province) return;
  toggleProvinceExpanded(province);
});

document.addEventListener("click", (event) => {
  if (!filterOpen) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (filterPanel?.contains(target) || filterBtn?.contains(target)) return;
  setFilterOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && filterOpen) setFilterOpen(false);
});

window.addEventListener("hashchange", () => {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!hash) {
    clearSelection();
    return;
  }
  if (currentJobs.some((job) => job.id === hash)) {
    selectJob(hash, { pushHash: false });
  }
});

const TOOLBAR_TOP_THRESHOLD = 24;
let lastToolbarScrollY = window.scrollY;
let toolbarTicking = false;

function updateToolbarScroll() {
  toolbarTicking = false;
  if (!toolbarEl || board?.classList.contains("is-message")) return;

  const y = window.scrollY;
  const delta = y - lastToolbarScrollY;

  if (y <= TOOLBAR_TOP_THRESHOLD) {
    toolbarEl.classList.add("is-at-top");
    toolbarEl.classList.remove("is-collapsed");
  } else {
    toolbarEl.classList.remove("is-at-top");
    if (delta > 6) {
      if (!toolbarEl.classList.contains("is-collapsed")) {
        setFilterOpen(false);
      }
      toolbarEl.classList.add("is-collapsed");
    } else if (delta < -4) {
      toolbarEl.classList.remove("is-collapsed");
    }
  }

  lastToolbarScrollY = y;
}

window.addEventListener(
  "scroll",
  () => {
    if (toolbarTicking) return;
    toolbarTicking = true;
    requestAnimationFrame(updateToolbarScroll);
  },
  { passive: true },
);

updateToolbarScroll();

void loadJobs();
