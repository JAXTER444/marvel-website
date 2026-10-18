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

function pointFromEvent(event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function trackHover(event) {
  const { x, y } = pointFromEvent(event);
  const rect = stage.getBoundingClientRect();
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
}

function endDrag(event) {
  if (event.pointerType === "mouse") return;
  if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  stage.classList.remove("is-active");
  park();
}

if (stage && glass && lens && lensView) {
  glass.style.setProperty("--lens", `${size}px`);
  lens.style.width = `${size}px`;
  lens.style.height = `${size}px`;
  park();

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    trackHover(event);
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    stage.setPointerCapture(event.pointerId);
    const { x, y } = pointFromEvent(event);
    stage.classList.add("is-active");
    place(x, y);
  });

  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" || !stage.hasPointerCapture?.(event.pointerId)) return;
    const { x, y } = pointFromEvent(event);
    place(x, y);
  });

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
}
