const stage = document.querySelector(".mark-stage");
const glass = stage?.querySelector(".mark-glass");
const lens = stage?.querySelector(".mark-lens");
const lensView = stage?.querySelector(".mark-lens-view");

const zoom = 1.2;
const size = 78;
const reach = 36;

function restPoint() {
  const rect = stage.getBoundingClientRect();
  return {
    x: rect.width - size * 0.22,
    y: size * 0.08,
  };
}

function place(x, y) {
  const rect = stage.getBoundingClientRect();
  glass.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
  lensView.style.width = `${rect.width}px`;
  lensView.style.height = `${rect.height}px`;
  lensView.style.transform = `translate(${size / 2 - x * zoom}px, ${size / 2 - y * zoom}px) scale(${zoom})`;
}

function park() {
  const rest = restPoint();
  place(rest.x, rest.y);
}

if (stage && glass && lens && lensView) {
  glass.style.setProperty("--lens", `${size}px`);
  lens.style.width = `${size}px`;
  lens.style.height = `${size}px`;
  park();

  document.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const inside =
      x >= -reach && y >= -reach && x <= rect.width + reach && y <= rect.height + reach;

    if (!inside) {
      if (!stage.classList.contains("is-active")) return;
      stage.classList.remove("is-active");
      requestAnimationFrame(() => park());
      return;
    }

    if (!stage.classList.contains("is-active")) {
      stage.classList.add("is-active");
      requestAnimationFrame(() => place(x, y));
      return;
    }
    place(x, y);
  });
}
