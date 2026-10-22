const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");
const brand = document.querySelector("a.brand");

/** Home logo uses #top; re-clicking the same hash does nothing — force scroll. */
brand?.addEventListener("click", (event) => {
  const href = brand.getAttribute("href") ?? "";
  if (href !== "#top" && href !== "#") return;
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (location.hash !== "#top") {
    history.pushState(null, "", `${location.pathname}${location.search}#top`);
  }
});

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    }
  });
}

const feeNote = document.querySelector(".fee-note");
const feeToggle = feeNote?.querySelector(".fee-note-toggle");

if (feeNote && feeToggle) {
  const setFeeOpen = (open) => {
    feeNote.classList.toggle("is-open", open);
    feeToggle.setAttribute("aria-expanded", String(open));
  };

  feeToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setFeeOpen(!feeNote.classList.contains("is-open"));
  });

  document.addEventListener("click", (event) => {
    if (!feeNote.contains(event.target)) setFeeOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setFeeOpen(false);
  });
}
