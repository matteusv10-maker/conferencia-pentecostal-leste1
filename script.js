// URL do Web App do Google Apps Script vinculado à planilha "CONFIRMAÇÃO LESTE 1"
const SCRIPT_URL = "";

const form = document.getElementById("rsvp");
const btn = form.querySelector(".btn");
const statusEl = form.querySelector(".status");
const phone = document.getElementById("whatsapp");
const churchWrap = document.getElementById("igreja-wrap");
const churchInput = document.getElementById("nome_igreja");
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

// ---------- "Você é de alguma igreja?" ----------
form.querySelectorAll('input[name="igreja"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const yes = radio.value === "sim" && radio.checked;
    churchWrap.classList.toggle("open", yes);
    churchWrap.setAttribute("aria-hidden", String(!yes));
    churchInput.tabIndex = yes ? 0 : -1;
    churchInput.required = yes;
    if (yes) setTimeout(() => churchInput.focus(), 150);
    else clearError("nome_igreja");
    clearError("igreja");
  });
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
  else if (data.igreja === "sim" && data.nome_igreja.length < 2) fail("nome_igreja", "Qual é o nome da sua igreja?");

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
    nome_igreja: String(fd.get("nome_igreja") || "").trim(),
    website: String(fd.get("website") || ""),
  };
  if (data.igreja !== "sim") data.nome_igreja = "";

  if (!validate(data)) return;

  btn.disabled = true;
  btn.classList.add("loading");
  btn.querySelector(".btn-label").textContent = "Enviando…";

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams(data),
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
  churchWrap.classList.remove("open");
  churchWrap.setAttribute("aria-hidden", "true");
  churchInput.tabIndex = -1;
  churchInput.required = false;
  successView.hidden = true;
  formView.hidden = false;
  document.getElementById("nome").focus();
});
