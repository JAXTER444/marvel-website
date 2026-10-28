const form = document.querySelector("#contact-form");
const success = document.querySelector("#contact-success");
const emailLink = document.querySelector("#contact-email");

if (form && success && emailLink) {
  const inbox = emailLink.textContent.trim();

  const fields = {
    name: form.elements.namedItem("name"),
    email: form.elements.namedItem("email"),
    phone: form.elements.namedItem("phone"),
    topic: form.elements.namedItem("topic"),
    organisation: form.elements.namedItem("organisation"),
    message: form.elements.namedItem("message"),
    consent: form.elements.namedItem("consent"),
  };

  const consentWrap = form.querySelector("#consent-field");
  const consentError = form.querySelector("#consent-error");

  function controls(field) {
    return field instanceof RadioNodeList ? [...field] : [field];
  }

  function setConsentError(message) {
    if (!consentWrap || !(fields.consent instanceof HTMLInputElement)) return;
    consentWrap.classList.toggle("is-invalid", Boolean(message));
    if (message) {
      fields.consent.setAttribute("aria-invalid", "true");
      if (consentError) fields.consent.setAttribute("aria-describedby", consentError.id);
    } else {
      fields.consent.removeAttribute("aria-invalid");
      fields.consent.removeAttribute("aria-describedby");
    }
    if (consentError) consentError.textContent = message;
  }

  function setError(field, message) {
    if (field === fields.consent) {
      setConsentError(message);
      return;
    }
    const nodes = controls(field);
    const wrap = nodes[0].closest(".field");
    const error = wrap.querySelector(".field-error");
    wrap.classList.toggle("is-invalid", Boolean(message));
    nodes.forEach((node) => {
      if (message) node.setAttribute("aria-invalid", "true");
      else node.removeAttribute("aria-invalid");
      if (!error) return;
      if (message) node.setAttribute("aria-describedby", error.id);
      else node.removeAttribute("aria-describedby");
    });
    const trigger = wrap.querySelector(".select-trigger");
    if (trigger) {
      if (message) {
        trigger.setAttribute("aria-invalid", "true");
        if (error) trigger.setAttribute("aria-describedby", error.id);
      } else {
        trigger.removeAttribute("aria-invalid");
        trigger.removeAttribute("aria-describedby");
      }
    }
    if (error) error.textContent = message;
  }

  function value(field) {
    return String(field.value || "").trim();
  }

  function enhanceSelect(select) {
    const menu = document.createElement("div");
    menu.className = "select-menu";
    select.before(menu);
    menu.append(select);
    select.classList.add("select-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "select-trigger";
    trigger.id = `${select.id}-trigger`;
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    if (select.required) trigger.setAttribute("aria-required", "true");

    const label = select.labels?.[0];
    if (label) label.htmlFor = trigger.id;

    const valueText = document.createElement("span");
    const chevron = document.createElement("span");
    chevron.className = "select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    trigger.append(valueText, chevron);

    const list = document.createElement("ul");
    list.id = `${select.id}-list`;
    list.className = "select-list";
    list.hidden = true;
    list.setAttribute("role", "listbox");
    trigger.setAttribute("aria-controls", list.id);
    if (label?.id) list.setAttribute("aria-labelledby", label.id);

    const choices = [...select.options].filter((option) => option.value);
    choices.forEach((option, index) => {
      const item = document.createElement("li");
      item.id = `${list.id}-opt-${index}`;
      item.setAttribute("role", "option");
      item.dataset.value = option.value;
      item.textContent = option.text;
      item.setAttribute("aria-selected", "false");
      list.append(item);
    });

    menu.append(trigger, list);

    let active = -1;

    function items() {
      return [...list.children];
    }

    function sync() {
      const chosen = choices.find((option) => option.value === select.value);
      valueText.textContent = chosen ? chosen.text : select.options[0]?.text || "";
      trigger.classList.toggle("is-placeholder", !select.value);
      items().forEach((item) => {
        item.setAttribute("aria-selected", item.dataset.value === select.value ? "true" : "false");
      });
    }

    function setActive(index) {
      const nodes = items();
      if (!nodes.length) return;
      active = (index + nodes.length) % nodes.length;
      nodes.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === active));
      trigger.setAttribute("aria-activedescendant", nodes[active].id);
    }

    function open() {
      menu.classList.add("is-open");
      list.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      const selected = items().findIndex((item) => item.getAttribute("aria-selected") === "true");
      setActive(selected >= 0 ? selected : 0);
    }

    function close() {
      menu.classList.remove("is-open");
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      active = -1;
      items().forEach((item) => item.classList.remove("is-active"));
    }

    function choose(item) {
      select.value = item.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
      close();
      trigger.focus();
    }

    trigger.addEventListener("click", () => {
      if (list.hidden) open();
      else close();
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (list.hidden) open();
        else setActive(active + (event.key === "ArrowDown" ? 1 : -1));
        return;
      }
      if (event.key === "Home" && !list.hidden) {
        event.preventDefault();
        setActive(0);
        return;
      }
      if (event.key === "End" && !list.hidden) {
        event.preventDefault();
        setActive(items().length - 1);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (list.hidden) open();
        else if (items()[active]) choose(items()[active]);
        return;
      }
      if (event.key === "Escape" && !list.hidden) {
        event.preventDefault();
        close();
      }
    });

    list.addEventListener("pointermove", (event) => {
      const item = event.target.closest("[role='option']");
      if (!item || !list.contains(item)) return;
      setActive(items().indexOf(item));
    });

    list.addEventListener("click", (event) => {
      const item = event.target.closest("[role='option']");
      if (item) choose(item);
    });

    document.addEventListener("pointerdown", (event) => {
      if (!menu.contains(event.target)) close();
    });

    form.addEventListener("reset", () => {
      requestAnimationFrame(sync);
    });

    sync();
  }

  if (fields.topic instanceof HTMLSelectElement) enhanceSelect(fields.topic);

  form.addEventListener("input", clearFieldError);
  form.addEventListener("change", clearFieldError);

  function clearFieldError(event) {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target === fields.consent || event.target.closest("#consent-field")) {
      setConsentError("");
      return;
    }
    if (event.target.closest(".is-invalid")) {
      setError(event.target, "");
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = value(fields.name);
    const email = value(fields.email);
    const phone = value(fields.phone);
    const topic = value(fields.topic);
    const organisation = value(fields.organisation);
    const message = value(fields.message);
    let valid = true;

    if (!name) {
      setError(fields.name, "Enter your name.");
      valid = false;
    } else {
      setError(fields.name, "");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(fields.email, "Enter a valid email address.");
      valid = false;
    } else {
      setError(fields.email, "");
    }

    if (phone && !/^[0-9+().\-\s]{7,20}$/.test(phone)) {
      setError(fields.phone, "Enter a phone number we can call.");
      valid = false;
    } else {
      setError(fields.phone, "");
    }

    if (!topic) {
      setError(fields.topic, "Choose a subject.");
      valid = false;
    } else {
      setError(fields.topic, "");
    }

    if (message.length < 10) {
      setError(fields.message, "Add a short message so we know how to help.");
      valid = false;
    } else {
      setError(fields.message, "");
    }

    if (!(fields.consent instanceof HTMLInputElement) || !fields.consent.checked) {
      setConsentError("Please agree to the Privacy Policy to continue.");
      valid = false;
    } else {
      setConsentError("");
    }

    if (!valid) {
      const firstInvalid = form.querySelector(
        ".is-invalid .select-trigger, .is-invalid input, .is-invalid textarea, .is-invalid select"
      );
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const lines = [`Name: ${name}`, `Email: ${email}`];
    if (phone) lines.push(`Phone: ${phone}`);
    lines.push(`Enquiry: ${topic}`);
    if (organisation) lines.push(`Organisation: ${organisation}`);
    lines.push("", message);

    const mailto = `mailto:${inbox}?subject=${encodeURIComponent(`Website enquiry — ${topic}`)}&body=${encodeURIComponent(lines.join("\n"))}`;

    form.hidden = true;
    success.hidden = false;
    success.querySelector("[data-lead]").textContent =
      `Thanks, ${name}. Your email app should open with this note ready to send. If it doesn't, write to us at ${inbox}.`;
    success.querySelector("h2").focus();
    window.location.href = mailto;
  });

  success.querySelector("[data-reset]").addEventListener("click", () => {
    form.reset();
    form.hidden = false;
    success.hidden = true;
    fields.name.focus();
  });
}
