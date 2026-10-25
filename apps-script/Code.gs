/**
 * Recebe as confirmações do site e grava na planilha "CONFIRMAÇÃO LESTE 1".
 *
 * Instalação: na planilha, Extensões > Apps Script, cole este código e
 * Implantar > Nova implantação > App da Web
 *   - Executar como: Eu
 *   - Quem pode acessar: Qualquer pessoa
 * Copie a URL /exec gerada para SCRIPT_URL em script.js.
 */
const HEADERS = ["Data/Hora", "Nome completo", "WhatsApp", "É de alguma igreja?", "Nome da igreja", "Regional"];
const TIMEZONE = "America/Sao_Paulo";
const RESPOSTAS_ID = 0; // aba "Página1" (gid=0) recebe as respostas, mesmo se for renomeada ou movida
const REGIONAIS = ["R01", "R05", "R06", "R07", "R16", "R17", "R34", "R35", "R37", "R38", "R51", "R56", "R57", "R64", "R65", "R85", "R97", "R103"];

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
      temIgreja ? clean_(p.regional) : "",
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets().find((s) => s.getSheetId() === RESPOSTAS_ID) || ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange("C:C").setNumberFormat("@");
  }
  // colunas novas entram no fim, sem mexer nas respostas já gravadas
  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  const current = header.getValues()[0];
  if (current.some((v) => v === "")) {
    header.setValues([HEADERS.map((h, i) => current[i] || h)]);
    header.setFontWeight("bold").setBackground("#003616").setFontColor("#ffffff");
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

/**
 * Cria (ou recria) a aba "Resumo" com fórmulas que se atualizam sozinhas.
 * Rode pelo editor: selecione criarResumo e clique em Executar.
 */
function criarResumo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = "'" + getSheet_().getName().replace(/'/g, "''") + "'!";
  // planilha em pt-BR usa ";" entre argumentos; em inglês, ","
  const sep = ss.getSpreadsheetLocale().startsWith("en") ? "," : ";";
  const f = (formula) => formula.replace(/§/g, sep);
  const GREEN = "#003616";
  const SOFT = "#e8efdc";

  let sh = ss.getSheetByName("Resumo");
  if (sh) sh.clear();
  else sh = ss.insertSheet("Resumo", 1);
  sh.setHiddenGridlines(true);

  sh.getRange("A1:I1").merge().setValue("Resumo · Conferência Pentecostal UMADESP Leste 1")
    .setFontSize(16).setFontWeight("bold").setFontColor("#ffffff").setBackground(GREEN);
  sh.getRange("A2:I2").merge().setValue("Atualiza sozinho a cada nova confirmação do site.")
    .setFontColor("#5f6b5a").setFontStyle("italic");
  sh.setRowHeight(1, 40);

  // Números gerais
  sh.getRange("A4:B4").setValues([["Números gerais", ""]]);
  sh.getRange("A5:A9").setValues([["Total de confirmações"], ["É de alguma igreja: Sim"], ["É de alguma igreja: Não"], ["Sim, mas sem regional informada"], ["Última confirmação"]]);
  sh.getRange("B5:B9").setFormulas([
    [f(`=COUNTA(${src}B2:B)`)],
    [f(`=COUNTIF(${src}D2:D§"Sim")`)],
    [f(`=COUNTIF(${src}D2:D§"Não")`)],
    [f(`=COUNTIFS(${src}D2:D§"Sim"§${src}F2:F§"")`)],
    [f(`=IFERROR(INDEX(${src}A2:A§COUNTA(${src}A2:A))§"—")`)],
  ]);
  sh.getRange("B5").setFontSize(18).setFontWeight("bold").setFontColor(GREEN);

  // Por regional (lista fixa, mostra também quem está com zero)
  const linhas = [...REGIONAIS, "Nenhuma", "Outras"];
  const first = 5;
  const last = first + linhas.length - 1;
  sh.getRange("D4:F4").setValues([["Regional", "Confirmados", ""]]);
  sh.getRange(first, 4, linhas.length, 1).setValues(linhas.map((r) => [r]));
  sh.getRange(first, 5, linhas.length, 1).setFormulas(linhas.map((r, i) => {
    const row = first + i;
    if (r === "Outras") return [f(`=COUNTIF(${src}F2:F§"?*")-SUM(E${first}:E${row - 1})`)];
    return [f(`=COUNTIF(${src}F2:F§D${row})`)];
  }));
  // barrinha proporcional ao maior número
  sh.getRange(first, 6, linhas.length, 1).setFormulas(linhas.map((_, i) => {
    const row = first + i;
    return [f(`=REPT("█"§ROUND(14*E${row}/MAX(1§MAX($E$${first}:$E$${last}))))`)];
  })).setFontColor("#9db369");
  sh.getRange(last + 1, 4, 1, 2).setValues([["Total", ""]]);
  sh.getRange(last + 1, 5).setFormula(`=SUM(E${first}:E${last})`);
  sh.getRange(last + 1, 4, 1, 3).setFontWeight("bold").setBorder(true, false, false, false, false, false);

  // Por dia
  sh.getRange("H4:I4").setValues([["Dia", "Confirmações"]]);
  sh.getRange("H5").setFormula(f(`=IFERROR(QUERY(ARRAYFORMULA(LEFT(TO_TEXT(${src}A2:A)§10))§"select Col1, count(Col1) where Col1 <> '' group by Col1 label Col1 '', count(Col1) ''"§0)§"—")`));

  // Visual
  [sh.getRange("A4:B4"), sh.getRange("D4:F4"), sh.getRange("H4:I4")].forEach((r) =>
    r.setFontWeight("bold").setBackground(SOFT).setFontColor(GREEN));
  sh.getRange("B5:B9").setHorizontalAlignment("right");
  sh.getRange(`E${first}:E${last + 1}`).setHorizontalAlignment("center");
  sh.getRange("I5:I60").setHorizontalAlignment("center");
  sh.setColumnWidth(1, 240);
  sh.setColumnWidth(2, 150);
  sh.setColumnWidth(3, 24);
  sh.setColumnWidth(4, 110);
  sh.setColumnWidth(5, 110);
  sh.setColumnWidth(6, 180);
  sh.setColumnWidth(7, 24);
  sh.setColumnWidth(8, 120);
  sh.setColumnWidth(9, 120);
  sh.setFrozenRows(2);
  ss.setActiveSheet(sh);
}
