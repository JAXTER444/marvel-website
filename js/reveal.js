const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function formatCount(value, grouped) {
  if (!grouped) return String(value);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function countUp(element, delay) {
  const target = Number(element.dataset.count);
  const suffix = element.dataset.suffix || "";
  const grouped = element.dataset.group === "space";
  const duration = 1500;
  const startAt = performance.now() + delay;

  element.textContent = formatCount(0, grouped) + suffix;

  const tick = (now) => {
    if (now < startAt) {
      requestAnimationFrame(tick);
      return;
    }

    const progress = Math.min(1, (now - startAt) / duration);
    const eased = 1 - (1 - progress) ** 3;
    const value = Math.round(target * eased);
    element.textContent = formatCount(value, grouped) + suffix;

    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function startCounts(stats) {
  const values = stats.querySelectorAll(".stat-value[data-count]");
  values.forEach((element, index) => {
    countUp(element, 320 + index * 260);
  });
}

const reveals = document.querySelectorAll(".reveal, .reveal-fade");

if (motionQuery.matches) {
  reveals.forEach((element) => element.classList.add("is-in"));
} else {
  const stats = document.querySelector(".stats");
  if (stats) {
    stats.querySelectorAll(".stat-value[data-count]").forEach((element) => {
      const grouped = element.dataset.group === "space";
      element.textContent = formatCount(0, grouped) + (element.dataset.suffix || "");
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
        if (entry.target.classList.contains("stat-1")) startCounts(entry.target.parentElement);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -32px 0px" }
  );

  reveals.forEach((element) => observer.observe(element));
}

const processList = document.querySelector(".about-process");

if (processList) {
  const processItems = [...processList.children];
  let processWidth = -1;

  const equalizeProcess = () => {
    processItems.forEach((item) => {
      item.style.minHeight = "";
    });
    const max = Math.ceil(Math.max(...processItems.map((item) => item.getBoundingClientRect().height)));
    processItems.forEach((item) => {
      item.style.minHeight = `${max}px`;
    });
  };

  const onProcessResize = (entries) => {
    const next = Math.round(entries[0].contentRect.width);
    if (next === processWidth) return;
    processWidth = next;
    equalizeProcess();
  };

  equalizeProcess();
  if (document.fonts?.ready) document.fonts.ready.then(equalizeProcess);
  new ResizeObserver(onProcessResize).observe(processList);
}
