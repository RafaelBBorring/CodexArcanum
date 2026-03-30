// ============================================================
// export.js
// Funções de exportação da ficha para PNG e PDF.
//
// Dependências externas (carregadas no index.html):
//   html2canvas v1.4.1  → captura o DOM como canvas
//   jsPDF v2.5.1        → gera o arquivo PDF
//
// Para ajustar a qualidade das exportações:
//   scale: 2 → resolução 2x (padrão, boa qualidade)
//   scale: 3 → resolução 3x (mais pesado, ideal para impressão)
// ============================================================

// ── Exportar como imagem PNG ─────────────────────────────────
// Captura o elemento #the-sheet e faz download como .png
async function exportImage() {
  const el = document.getElementById('the-sheet');
  if (!el) return;

  // Temporariamente desativa bordas de foco dos editáveis
  toggleEditableOutlines(false);

  const canvas = await html2canvas(el, {
    backgroundColor: '#10141e',  // cor de fundo da ficha
    scale: 2,                    // 2x para nitidez
    useCORS: true,               // necessário para imagens externas
    logging: false
  });

  // Reativa bordas de foco
  toggleEditableOutlines(true);

  // Cria link de download e clica automaticamente
  const link      = document.createElement('a');
  link.download   = 'ficha-rpg.png';
  link.href       = canvas.toDataURL('image/png');
  link.click();
}

// ── Exportar como PDF (A4 portrait) ─────────────────────────
// Captura o elemento #the-sheet e gera um PDF com a imagem.
// A imagem é redimensionada para caber na largura do A4.
async function exportPDF() {
  const el = document.getElementById('the-sheet');
  if (!el) return;

  toggleEditableOutlines(false);

  const canvas = await html2canvas(el, {
    backgroundColor: '#10141e',
    scale: 2,
    useCORS: true,
    logging: false
  });

  toggleEditableOutlines(true);

  const imgData = canvas.toDataURL('image/png');

  // jsPDF está disponível via window.jspdf (UMD global)
  const { jsPDF } = window.jspdf;

  const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfW   = pdf.internal.pageSize.getWidth();    // largura da página em mm
  const pdfH   = (canvas.height * pdfW) / canvas.width; // altura proporcional

  // Se a ficha for mais alta que uma página A4, jsPDF cortará automaticamente.
  // Para fichas longas, poderia-se usar múltiplas páginas (não implementado aqui).
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  pdf.save('ficha-rpg.pdf');
}

// ── Helper: oculta/mostra a borda dashed dos campos editáveis ──
// Necessário para que as bordas de edição não apareçam na exportação.
function toggleEditableOutlines(visible) {
  const editables = document.querySelectorAll('.editable');
  editables.forEach(el => {
    el.style.borderBottom = visible ? '' : 'none';
  });
}
