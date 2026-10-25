// URL do Web App do Google Apps Script vinculado à planilha "CONFIRMAÇÃO LESTE 1"
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyTGGQPztvnBm9mxe8NMgK6OeIFQEKN4e96lQgGf7pkCReM7JzVyIaza562JZEwcMQy7g/exec";

const form = document.getElementById("rsvp");
const btn = form.querySelector(".btn");
const statusEl = form.querySelector(".status");
const phone = document.getElementById("whatsapp");
const churchWrap = document.getElementById("igreja-wrap");
const churchInput = document.getElementById("nome_igreja");
const regionalInput = document.getElementById("regional");
const regionalList = document.getElementById("regional-list");
const formView = document.getElementById("form-view");
const successView = document.getElementById("success-view");

// ---------- WhatsApp mask: (11) 91234-5678 ----------
function formatPhone(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

phone.addEventListener("input", () => {
  phone.value = formatPhone(phone.value);
  clearError("whatsapp");
});

// ---------- Campos condicionais ----------
function setOpen(wrap, open, fields) {
  wrap.classList.toggle("open", open);
  wrap.setAttribute("aria-hidden", String(!open));
  // depois de abrir, libera o overflow para a lista de sugestões não ser cortada
  clearTimeout(wrap.settleTimer);
  if (open) wrap.settleTimer = setTimeout(() => wrap.classList.add("settled"), 320);
  else wrap.classList.remove("settled");
  fields.forEach((field) => {
    field.tabIndex = open ? 0 : -1;
    field.required = open;
    if (!open) clearError(field.name);
  });
}

// "Você é de alguma igreja?" → Regional + Nome da igreja
form.querySelectorAll('input[name="igreja"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const yes = radio.value === "sim" && radio.checked;
    setOpen(churchWrap, yes, [regionalInput, churchInput]);
    if (yes) setTimeout(() => regionalInput.focus(), 150);
    else closeRegionalList();
    clearError("igreja");
  });
});

// ---------- Regional: digita o número e aparecem as sugestões ----------
const REGIONAIS = ["R01", "R05", "R06", "R07", "R16", "R17", "R34", "R35", "R37", "R38", "R51", "R56", "R57", "R64", "R65", "R85", "R97", "R103"];
let suggestions = [];
let activeIndex = -1;

// "R05", "r 5", "regional 05" e "5" viram a mesma chave: "5"
function regionalKey(text) {
  return text.toUpperCase().replace(/REGIONAL|\s/g, "").replace(/^R/, "").replace(/^0+(?=\d)/, "");
}

function normalizeRegional(text) {
  const t = text.trim();
  if (!t) return "";
  const key = regionalKey(t);
  if (/^\d+$/.test(key)) return REGIONAIS.find((r) => regionalKey(r) === key) || `R${key.padStart(2, "0")}`;
  if (t.length >= 3 && "NENHUMA".startsWith(t.toUpperCase())) return "Nenhuma";
  return t;
}

function findSuggestions(query) {
  const q = query.trim();
  if (!q) return [...REGIONAIS, "Nenhuma"].map((value) => ({ value, label: value }));
  const key = regionalKey(q);
  const digits = q.toUpperCase().replace(/REGIONAL|\s/g, "").replace(/^R/, "");
  const list = /^\d+$/.test(digits)
    ? REGIONAIS.filter((r) => (digits.startsWith("0") ? r.slice(1).startsWith(digits) : regionalKey(r).startsWith(key)))
    : "NENHUMA".startsWith(q.toUpperCase()) ? ["Nenhuma"] : [];
  const items = list.map((value) => ({ value, label: value }));
  const typed = normalizeRegional(q);
  if (!list.includes(typed) && key !== "0") items.push({ value: typed, label: `Usar ${typed}`, other: true });
  return items;
}

function renderRegionalList() {
  suggestions = findSuggestions(regionalInput.value);
  activeIndex = regionalInput.value.trim() && suggestions.length ? 0 : -1;
  regionalList.replaceChildren(...suggestions.map((item, i) => {
    const li = document.createElement("li");
    li.id = `regional-opt-${i}`;
    li.setAttribute("role", "option");
    li.textContent = item.label;
    if (item.other || item.value === "Nenhuma") li.classList.add("wide");
    if (item.other) li.classList.add("other");
    li.addEventListener("pointerdown", (event) => event.preventDefault());
    li.addEventListener("click", () => chooseRegional(item.value));
    return li;
  }));
  regionalList.hidden = false;
  regionalInput.setAttribute("aria-expanded", "true");
  highlight();
}

function highlight() {
  [...regionalList.children].forEach((li, i) => {
    li.classList.toggle("active", i === activeIndex);
    li.setAttribute("aria-selected", String(i === activeIndex));
  });
  const active = regionalList.children[activeIndex];
  if (active) {
    regionalInput.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  } else regionalInput.removeAttribute("aria-activedescendant");
}

function closeRegionalList() {
  regionalList.hidden = true;
  regionalInput.setAttribute("aria-expanded", "false");
  regionalInput.removeAttribute("aria-activedescendant");
  activeIndex = -1;
}

function chooseRegional(value) {
  regionalInput.value = value;
  closeRegionalList();
  clearError("regional");
  churchInput.focus();
}

// sugestões aparecem ao digitar (ou ao tocar no campo)
regionalInput.addEventListener("input", renderRegionalList);
regionalInput.addEventListener("click", renderRegionalList);
regionalInput.addEventListener("focus", () => {
  if (matchMedia("(max-width: 480px)").matches) {
    setTimeout(() => regionalInput.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
  }
});
regionalInput.addEventListener("blur", () => {
  closeRegionalList();
  regionalInput.value = normalizeRegional(regionalInput.value);
});

regionalInput.addEventListener("keydown", (event) => {
  if (regionalList.hidden) {
    if (event.key === "ArrowDown") renderRegionalList();
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    activeIndex = (activeIndex + step + suggestions.length) % suggestions.length;
    highlight();
  } else if (event.key === "Enter" && activeIndex >= 0) {
    event.preventDefault();
    chooseRegional(suggestions[activeIndex].value);
  } else if (event.key === "Escape") {
    closeRegionalList();
  }
});

form.querySelectorAll('input[type="text"]').forEach((input) => {
  input.addEventListener("input", () => clearError(input.name));
});

// ---------- Validation ----------
function setError(name, message) {
  const el = form.querySelector(`.error[data-for="${name}"]`);
  el.textContent = message;
  el.closest(".field").classList.add("invalid");
}

function clearError(name) {
  const el = form.querySelector(`.error[data-for="${name}"]`);
  if (!el) return;
  el.textContent = "";
  el.closest(".field").classList.remove("invalid");
}

function validate(data) {
  let firstInvalid = null;
  const fail = (name, message) => {
    setError(name, message);
    firstInvalid ??= form.elements[name] instanceof RadioNodeList ? form.elements[name][0] : form.elements[name];
  };

  if (data.nome.length < 3 || !/\S+\s+\S+/.test(data.nome)) fail("nome", "Digite seu nome e sobrenome.");

  const digits = data.whatsapp.replace(/\D/g, "");
  if (!(digits.length === 11 && digits[2] === "9") && digits.length !== 10) {
    fail("whatsapp", "Digite um WhatsApp válido com DDD.");
  }

  if (!data.igreja) fail("igreja", "Escolha uma opção.");
  else if (data.igreja === "sim") {
    if (!data.regional) fail("regional", "Digite o número da sua regional.");
    if (data.nome_igreja.length < 2) fail("nome_igreja", "Qual é o nome da sua igreja?");
  }

  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

// ---------- Submit ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";

  const fd = new FormData(form);
  const data = {
    nome: String(fd.get("nome") || "").trim().replace(/\s+/g, " "),
    whatsapp: String(fd.get("whatsapp") || "").trim(),
    igreja: String(fd.get("igreja") || ""),
    regional: normalizeRegional(String(fd.get("regional") || "")),
    nome_igreja: String(fd.get("nome_igreja") || "").trim(),
    website: String(fd.get("website") || ""),
  };

  if (!validate(data)) return;

  const payload = {
    nome: data.nome,
    whatsapp: data.whatsapp,
    igreja: data.igreja,
    regional: data.igreja === "sim" ? data.regional : "",
    nome_igreja: data.igreja === "sim" ? data.nome_igreja : "",
    website: data.website,
  };

  btn.disabled = true;
  btn.classList.add("loading");
  btn.querySelector(".btn-label").textContent = "Enviando…";

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams(payload),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Falha ao salvar");
    showSuccess(data.nome);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Não foi possível enviar agora. Verifique sua conexão e tente novamente.";
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.querySelector(".btn-label").textContent = "Confirmar presença";
  }
});

function showSuccess(name) {
  document.getElementById("success-name").textContent = name.split(" ")[0];
  formView.hidden = true;
  successView.hidden = false;
  successView.focus();
}

document.getElementById("again").addEventListener("click", () => {
  form.reset();
  setOpen(churchWrap, false, [regionalInput, churchInput]);
  successView.hidden = true;
  formView.hidden = false;
  document.getElementById("nome").focus();
});
