/**
 * Recebe as confirmações do site e grava na planilha "CONFIRMAÇÃO LESTE 1".
 *
 * Instalação: na planilha, Extensões > Apps Script, cole este código e
 * Implantar > Nova implantação > App da Web
 *   - Executar como: Eu
 *   - Quem pode acessar: Qualquer pessoa
 * Copie a URL /exec gerada para SCRIPT_URL em script.js.
 */
const HEADERS = ["Data/Hora", "Nome completo", "WhatsApp", "É de alguma igreja?", "Nome da igreja"];
const TIMEZONE = "America/Sao_Paulo";

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const p = (e && e.parameter) || {};

    // honeypot: bots preenchem o campo escondido
    if (p.website) return json_({ ok: true });

    const nome = clean_(p.nome);
    const whatsapp = clean_(p.whatsapp);
    const temIgreja = p.igreja === "sim";
    if (!nome || !whatsapp || !p.igreja) return json_({ ok: false, error: "Campos obrigatórios ausentes" });

    getSheet_().appendRow([
      Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm:ss"),
      nome,
      whatsapp,
      temIgreja ? "Sim" : "Não",
      temIgreja ? clean_(p.nome_igreja) : "",
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: "Conferência Pentecostal · UMADESP Leste 1" });
}

function getSheet_() {
  // primeira aba da planilha (Página1)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#003616").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.getRange("C:C").setNumberFormat("@");
  }
  return sheet;
}

// Texto puro, sem fórmulas (evita injeção tipo =IMPORTXML(...))
function clean_(value) {
  const s = String(value || "").trim().slice(0, 120);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Rode uma vez pelo editor para autorizar e criar o cabeçalho
function setup() {
  getSheet_();
}
