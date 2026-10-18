const config = window.MARVEL_JOBS ?? {};
const board = document.querySelector(".jobs-board");
const listEl = document.querySelector("#job-list");
const detailEl = document.querySelector("#job-detail");
const statusEl = document.querySelector("#job-status");

let currentJobs = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function setStatus(html) {
  board?.classList.add("is-message");
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.innerHTML = html;
  if (listEl) listEl.innerHTML = "";
  if (detailEl) detailEl.innerHTML = "";
}

function renderDetail(job) {
  if (!detailEl) return;
  const bits = metaParts(job);
  const salary = payLine(job);
  const due = deadlineLine(job.deadline);
  const sections = (job.descriptionSections ?? [])
    .filter((section) => section.heading || section.description)
    .map(
      (section) => `
        <section>
          ${section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : ""}
          ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
        </section>
      `,
    )
    .join("");

  detailEl.innerHTML = `
    <p class="jobs-kicker">${escapeHtml(job.companyName || "Marvel Placement Consultants")}</p>
    <h2>${escapeHtml(job.title)}</h2>
    ${bits.length ? `<ul class="jobs-meta">${bits.map((bit) => `<li>${escapeHtml(bit)}</li>`).join("")}</ul>` : ""}
    ${salary ? `<p class="jobs-pay">${escapeHtml(salary)}</p>` : ""}
    ${due ? `<p class="jobs-deadline">Apply by ${escapeHtml(due)}</p>` : ""}
    <div class="jobs-copy">${sections || "<p>Write to us and we will send the brief for this role.</p>"}</div>
    <div class="actions">
      <a class="btn btn-green" href="${escapeHtml(job.applyUrl)}" target="_blank" rel="noopener noreferrer">Apply</a>
      <a class="btn btn-dark" href="contact.html">Ask about this role</a>
    </div>
  `;
}

function renderList(jobs, selectedId) {
  if (!listEl) return;
  listEl.innerHTML = jobs
    .map(
      (job) => `
        <button type="button" class="job-card${job.id === selectedId ? " is-selected" : ""}" data-job-id="${escapeHtml(job.id)}">
          <span class="job-card-title">${escapeHtml(job.title)}</span>
          <span class="job-card-meta">${escapeHtml(metaParts(job).slice(0, 3).join(" · "))}</span>
        </button>
      `,
    )
    .join("");
}

function selectJob(id) {
  const job = currentJobs.find((item) => item.id === id) ?? currentJobs[0];
  if (!job) return;
  const nextHash = `#${encodeURIComponent(job.id)}`;
  if (location.hash !== nextHash) {
    history.replaceState(null, "", nextHash);
  }
  renderList(currentJobs, job.id);
  renderDetail(job);
}

async function loadJobs() {
  if (!listEl || !detailEl || !statusEl) return;

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
    board?.classList.remove("is-message");
    statusEl.hidden = true;
    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    selectJob(hash);
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
  selectJob(button.dataset.jobId);
});

void loadJobs();
