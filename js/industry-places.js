const config = window.MARVEL_JOBS ?? {};
const FILTER_STORAGE_KEY = "marvelJobFilters";
const placesEl = document.querySelector(".about-places[data-departments]");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

function departmentMatchers(raw) {
  return String(raw ?? "")
    .split("|")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function jobMatchesDepartments(job, matchers) {
  const departments = String(job.department ?? "")
    .split(/[,/|]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (!departments.length) return false;
  return matchers.some((matcher) =>
    departments.some((department) => department === matcher || department.includes(matcher)),
  );
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function placeLabelsForJobs(jobs) {
  return uniqueSorted(
    jobs.map((job) => {
      const { province, city } = parseLocation(job.location);
      return province || city;
    }),
  );
}

function departmentsForJobs(jobs) {
  return uniqueSorted(
    jobs.flatMap((job) =>
      String(job.department ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}

function jobsBoardHref(province, departments) {
  const params = new URLSearchParams();
  params.set("province", province);
  for (const department of departments) {
    params.append("department", department);
  }
  return `jobs.html?${params.toString()}`;
}

function storeFilters(province, departments) {
  try {
    sessionStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        provinces: province ? [province] : [],
        departments: Array.isArray(departments) ? departments : [],
      }),
    );
  } catch {
    // Ignore storage failures; query params remain the primary signal.
  }
}

function renderPlaces(places, departments) {
  const departmentAttr = departments.join("|");
  placesEl.innerHTML = places
    .map((place) => {
      const href = jobsBoardHref(place, departments);
      return `<li><a href="${escapeHtml(href)}" data-province="${escapeHtml(place)}" data-departments="${escapeHtml(departmentAttr)}">${escapeHtml(place)}</a></li>`;
    })
    .join("");
  placesEl.hidden = false;
}

placesEl?.addEventListener("click", (event) => {
  const link = event.target instanceof Element ? event.target.closest("a[data-province]") : null;
  if (!(link instanceof HTMLAnchorElement)) return;
  const province = link.dataset.province ?? "";
  const departments = String(link.dataset.departments ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  storeFilters(province, departments);
});

async function loadIndustryPlaces() {
  if (!placesEl) return;

  const matchers = departmentMatchers(placesEl.dataset.departments);
  const fallbackPlaces = uniqueSorted(
    String(placesEl.dataset.fallbackPlaces ?? "")
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean),
  );

  if (!matchers.length || !config.apiUrl || !config.apiKey) {
    if (fallbackPlaces.length) {
      renderPlaces(fallbackPlaces, []);
      return;
    }
    placesEl.hidden = true;
    return;
  }

  try {
    const response = await fetch(config.apiUrl, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    const matched = jobs.filter((job) => jobMatchesDepartments(job, matchers));
    const places = placeLabelsForJobs(matched);
    const departments = departmentsForJobs(matched);

    if (places.length) {
      renderPlaces(places, departments);
      return;
    }

    if (fallbackPlaces.length) {
      renderPlaces(fallbackPlaces, []);
      return;
    }

    placesEl.innerHTML = "";
    placesEl.hidden = true;
  } catch {
    if (fallbackPlaces.length) {
      renderPlaces(fallbackPlaces, []);
      return;
    }
    // Keep any server-rendered fallback tags if the board is unreachable.
  }
}

void loadIndustryPlaces();
