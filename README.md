# Conferência Pentecostal · UMADESP Leste 1

Landing page de 1 dobra para confirmação de presença na Conferência Pentecostal da UMADESP Leste 1 (31/10).

- `index.html`, `styles.css`, `script.js` — site estático (GitHub Pages)
- `assets/` — logos, foto e texturas extraídas da ID visual
- `apps-script/Code.gs` — Web App do Google Apps Script que grava as respostas na planilha **CONFIRMAÇÃO LESTE 1**

## Integração com a planilha

1. Na planilha: **Extensões → Apps Script**, cole o conteúdo de `apps-script/Code.gs` e salve.
2. **Implantar → Nova implantação → App da Web** — Executar como: *Eu* · Quem pode acessar: *Qualquer pessoa*.
3. Copie a URL que termina em `/exec` para `SCRIPT_URL` em `script.js` e faça commit.

Campos gravados: Data/Hora · Nome completo · WhatsApp · É de alguma igreja? · Nome da igreja.
