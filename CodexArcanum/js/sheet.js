// ============================================================
// sheet.js
// Responsável por:
//   - Renderizar a ficha gerada no DOM (renderSheet)
//   - Ativar edição inline de todos os campos da ficha
//   - Recalcular CA ao editar Bônus de Ataque
//   - Helpers de classificação de habilidades (badge, classe CSS)
// ============================================================

// ── Helpers de tipo de habilidade ───────────────────────────

// Retorna a classe CSS da faixa colorida lateral do card
function getAbCls(type) {
  if (type === 'passiva')  return 'ab-passive';
  if (type === 'ultimate') return 'ab-ultimate';
  return 'ab-active';
}

// Retorna o prefixo de texto exibido antes do nome da habilidade
function getTypePrefix(type) {
  const map = { passiva: 'PASSIVA:', ativa: 'ATIVA:', ultimate: 'ULTIMATE:' };
  return map[type] || type.toUpperCase() + ':';
}

// ── Renderização da ficha completa ──────────────────────────
// Injeta o HTML da ficha no elemento #sheet-output
// e ativa os campos editáveis.
//
// Parâmetro sheetData:
//   { nivel, na, nome, profile, stats, attrs, abilities }
//   stats: { vida, arm, ba, bd, ca, reac, dano, danoExtra, tag }

function renderSheet(sheetData) {
  const { nivel, na, nome, profile, stats, attrs, abilities } = sheetData;
  const naInfo   = NA_MODS[na];
  const profInfo = PROFILES[profile];

  // ── HTML do avatar (imagem ou ícone padrão) ──────────────
  // A imagem é exibida via CSS background-image na div .sh-avatar-img,
  // usando as posições/escala salvas em window.avatarTransform.
  // Sempre usa avatarOriginalDataUrl como fonte para não perder qualidade.
  // Ao clicar no avatar, abre o editor de máscara (openAvatarEditor).
  const savedT   = window.avatarTransform || { x: 0, y: 0, scale: 1 };
  const imgSrc   = window.avatarOriginalDataUrl || window.avatarDataUrl;
  const avatarHtml = imgSrc
    ? `<div class="sh-avatar-img" id="sh-avatar-img"
            style="background-image:url('${imgSrc}');
                   background-size:${savedT.scale * 100}%;
                   background-position:${savedT.x}px ${savedT.y}px;
                   background-repeat:no-repeat;"
            onclick="openAvatarEditor()"
            title="Clique para ajustar a imagem">
         <div class="sh-avatar-edit-hint"><i class="bi bi-crop"></i></div>
       </div>`
    : `<span class="sh-avatar-ph"><i class="bi bi-person-fill"></i></span>`;

  // ── HTML dos atributos (FOR/DES/CON/INT/APA/AM) ──────────
  // Hierarquia visual: bônus (modificador) em destaque grande,
  // valor bruto menor e secundário abaixo.
  const attrHtml = ATTR_NAMES.map((name, i) => `
    <div class="attr-c">
      <div class="attr-n">${name}</div>
      <div class="attr-m attr-mod-big" id="attr-mod-${i}">${attrMod(attrs[i])}</div>
      <div class="attr-v editable" contenteditable="true"
           data-field="attr-${i}"
           title="Clique para editar o valor base">${attrs[i]}</div>
    </div>
  `).join('');

  // ── HTML das habilidades ─────────────────────────────────
  // Cada habilidade tem nome, descrição e stats editáveis inline
  const abilitiesHtml = abilities.map((ab, idx) => `
    <div class="ab-card ${getAbCls(ab.type)}" id="ab-card-${idx}">
      <div class="ab-header">
        <span class="ab-type-prefix">${getTypePrefix(ab.type)}</span>
        <span class="ab-name editable" contenteditable="true"
              data-field="ab-name-${idx}"
              title="Clique para editar o nome">${ab.name}</span>
      </div>
      <div class="ab-desc editable" contenteditable="true"
           data-field="ab-desc-${idx}"
           title="Clique para editar a descrição">${ab.description}</div>
      ${ab.stats && ab.stats.length
        ? `<div class="ab-stats">${ab.stats.map((s, si) => `
            <span class="ab-stat editable" contenteditable="true"
                  data-field="ab-stat-${idx}-${si}"
                  title="Clique para editar">${s}</span>
          `).join('')}</div>`
        : ''}
    </div>
  `).join('');

  // ── HTML da ficha completa ───────────────────────────────
  document.getElementById('sheet-output').innerHTML = `
  <div class="sheet" id="the-sheet">

    <!-- ── Cabeçalho: Avatar / Nome / Level Badge ── -->
    <div class="sh-header">
      <div class="sh-avatar">${avatarHtml}</div>

      <div class="sh-info">
        <div class="sh-name editable" contenteditable="true"
             data-field="nome" title="Clique para editar o nome">${nome}</div>
        <div class="sh-tags" style="margin-top:0.5rem">
          <span class="sh-tag sh-tag-profile">${profInfo.name}</span>
        </div>
      </div>

      <div class="sh-level-badge">
        <div class="sh-level-label">Nível</div>
        <div class="sh-level-num">${nivel}</div>
        <div class="sh-level-na">NA ${na}</div>
      </div>
    </div>

    <!-- ── Bloco de stats principais (PV + Círculos + Pills) ── -->
    <div class="sh-stats-main">

      <!-- PV: somente label + valor editável, sem barra -->
      <div class="pv-block">
        <div class="pv-label">Pontos de Vida</div>
        <div class="pv-value editable" contenteditable="true"
             id="pv-display"
             data-field="vida" title="Clique para editar">${stats.vida}</div>
      </div>

      <!-- CA | Reações | Armadura — linha compacta horizontal -->
      <div class="combat-stats-row">
        <div class="combat-stat-item">
          <div class="csi-val editable" contenteditable="true"
               id="ca-display" data-field="ca" title="Clique para editar">${stats.ca}</div>
          <div class="csi-label">CA</div>
        </div>
        <div class="combat-stat-divider"></div>
        <div class="combat-stat-item">
          <div class="csi-val editable" contenteditable="true"
               data-field="reac" title="Clique para editar">${stats.reac}</div>
          <div class="csi-label">Reações</div>
        </div>
        <div class="combat-stat-divider"></div>
        <div class="combat-stat-item">
          <div class="csi-val editable" contenteditable="true"
               data-field="arm" title="Clique para editar">${stats.arm}</div>
          <div class="csi-label">Armadura</div>
        </div>
      </div>

      <!-- Pills: Ataque | Defesa | Dano Base -->
      <div class="combat-row">
        <div class="combat-pill">
          <div class="combat-pill-val">
            d20+<span class="editable" contenteditable="true"
                      id="ba-display"
                      data-field="ba" title="Clique para editar">${stats.ba}</span>
          </div>
          <div class="combat-pill-label">Ataque</div>
        </div>
        <div class="combat-pill">
          <div class="combat-pill-val">
            d20+<span class="editable" contenteditable="true"
                      id="bd-display"
                      data-field="bd" title="Clique para editar">${stats.bd}</span>
          </div>
          <div class="combat-pill-label">Defesa</div>
        </div>
        <div class="combat-pill dano">
          <div class="combat-pill-val editable" contenteditable="true"
               data-field="dano" title="Clique para editar">
            ${stats.dano}${stats.danoExtra || ''}
          </div>
          <div class="combat-pill-label">Dano Base</div>
        </div>
      </div>

    </div><!-- /sh-stats-main -->

    <!-- ── Corpo da ficha: Atributos em largura total ── -->
    <div class="sh-body sh-body-full">
      <div class="sh-col">
        <div class="sh-group-title">Atributos</div>
        <div class="attr-grid-wide">${attrHtml}</div>
      </div>
    </div>

    <!-- ── Habilidades ── -->
    <div class="sh-abilities">
      <div class="sh-group-title mb-3">
        Habilidades · 1 Passiva · 3 Ativas · 1 Ultimate
      </div>
      <div class="abilities-list">
        ${abilitiesHtml}
      </div>
    </div>

  </div><!-- /sheet -->`;

  // Ativa comportamentos de edição inline após inserir o HTML
  activateInlineEditing();

  // Exibe o container da ficha
  document.getElementById('sheet-container').style.display = 'block';
  document.getElementById('sheet-container').scrollIntoView({ behavior: 'smooth' });
}

// ── Edição Inline ────────────────────────────────────────────
// Adiciona eventos a todos os elementos com classe .editable
// para que o usuário possa clicar e editar diretamente na ficha.

function activateInlineEditing() {
  const editables = document.querySelectorAll('.editable');

  editables.forEach(el => {
    // Seleciona todo o texto ao focar no campo
    el.addEventListener('focus', () => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // Ao pressionar Enter: confirma e perde o foco (não quebra linha)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
    });

    // Ao perder o foco: valida e aplica efeitos colaterais
    el.addEventListener('blur', () => {
      const field = el.dataset.field;
      const val   = el.textContent.trim();

      // Recalculos automáticos por campo
      if (field === 'ba') {
        // Bônus de Defesa = BA - 3
        const ba  = parseInt(val) || 0;
        const bd  = ba - 3;
        const ca  = 10 + bd;
        const bdEl = document.getElementById('bd-display');
        const caEl = document.getElementById('ca-display');
        if (bdEl) bdEl.textContent = bd;
        if (caEl) caEl.textContent = ca;
      }

      // Atualiza modificador do atributo ao editar um atributo
      if (field && field.startsWith('attr-')) {
        const idx  = parseInt(field.replace('attr-', ''));
        const v    = parseInt(val) || 10;
        const modEl = document.getElementById(`attr-mod-${idx}`);
        if (modEl) modEl.textContent = attrMod(v);
      }

      // Atualiza fração de PV se o usuário editar o valor de vida
      if (field === 'vida') {
        const v = parseInt(val) || 0;
        const fracEl = document.getElementById('pv-fraction');
        if (fracEl) fracEl.textContent = `${v} / ${v}`;
      }
    });
  });
}

// ── Utilitário: modificador de atributo ─────────────────────
// Fórmula padrão D&D: floor((valor - 10) / 2)
function attrMod(v) {
  const m = Math.floor((v - 10) / 2);
  return (m >= 0 ? '+' : '') + m;
}

// ════════════════════════════════════════════════════════════
// EDITOR DE MÁSCARA DO AVATAR
// ────────────────────────────────────────────────────────────
// Funciona como o editor de imagem do Miro:
//   - Arraste para reposicionar a imagem dentro do quadro
//   - Scroll do mouse para aplicar zoom (sem distorção)
//   - Botão "Confirmar" aplica o recorte e atualiza o avatar na ficha
//   - Os valores de posição/escala ficam salvos em window.avatarTransform
//     para que a ficha preserve o ajuste entre re-renders
// ════════════════════════════════════════════════════════════

// Abre o modal do editor de máscara
function openAvatarEditor() {
  // Evita abrir se não há imagem carregada
  if (!window.avatarDataUrl) return;

  // Remove modal anterior se existir
  const old = document.getElementById('avatar-editor-modal');
  if (old) old.remove();

  // Estado atual do transform (persiste entre aberturas)
  const t = window.avatarTransform || { x: 0, y: 0, scale: 1 };

  // ── Monta o HTML do modal ───────────────────────────────
  const modal = document.createElement('div');
  modal.id = 'avatar-editor-modal';
  modal.innerHTML = `
    <div class="aem-backdrop" onclick="closeAvatarEditor()"></div>
    <div class="aem-panel">
      <div class="aem-header">
        <span class="aem-title"><i class="bi bi-crop me-2"></i>Ajustar Imagem</span>
        <span class="aem-hint">Arraste para mover · Scroll para zoom</span>
      </div>

      <!-- Quadro de preview com máscara quadrada -->
      <div class="aem-stage-wrap">
        <!-- Overlay de máscara: escurece fora do quadro de recorte -->
        <div class="aem-mask-overlay">
          <div class="aem-mask-top"></div>
          <div class="aem-mask-middle">
            <div class="aem-mask-side"></div>
            <!-- Janela de recorte — o que aparecerá no avatar final -->
            <div class="aem-crop-window" id="aem-crop-window">
              <!-- Imagem arrastável dentro da janela -->
              <div class="aem-img-layer" id="aem-img-layer"
                   style="background-image:url('${window.avatarOriginalDataUrl || window.avatarDataUrl}');
                          background-repeat:no-repeat;">
              </div>
              <!-- Guias de grade (estilo Miro) -->
              <div class="aem-grid-guide"></div>
            </div>
            <div class="aem-mask-side"></div>
          </div>
          <div class="aem-mask-bottom"></div>
        </div>
      </div>

      <!-- Controles de zoom -->
      <div class="aem-controls">
        <button class="aem-btn-icon" onclick="aemZoom(-0.1)" title="Diminuir zoom">
          <i class="bi bi-dash-lg"></i>
        </button>
        <input type="range" id="aem-zoom-slider"
               min="0.1" max="5" step="0.01" value="${t.scale}"
               oninput="aemSetZoom(parseFloat(this.value))"
               class="aem-slider" />
        <button class="aem-btn-icon" onclick="aemZoom(0.1)" title="Aumentar zoom">
          <i class="bi bi-plus-lg"></i>
        </button>
        <button class="aem-btn-reset" onclick="aemReset()">
          <i class="bi bi-arrow-counterclockwise me-1"></i>Resetar
        </button>
      </div>

      <!-- Ações finais -->
      <div class="aem-footer">
        <button class="aem-btn-cancel" onclick="closeAvatarEditor()">Cancelar</button>
        <button class="aem-btn-confirm" onclick="aemConfirm()">
          <i class="bi bi-check-lg me-1"></i>Confirmar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Referências aos elementos do editor
  const imgLayer  = document.getElementById('aem-img-layer');
  const cropWin   = document.getElementById('aem-crop-window');
  const slider    = document.getElementById('aem-zoom-slider');

  // Tamanho da janela de recorte (em px, igual ao avatar na ficha)
  const CROP_SIZE = 280;

  // Estado interno do editor
  const state = {
    x:       t.x,        // posição X do background
    y:       t.y,        // posição Y do background
    scale:   t.scale,    // escala atual
    dragging: false,
    startX:  0,
    startY:  0,
    startBgX: 0,
    startBgY: 0
  };

  // Aplica o transform atual à camada de imagem
  function applyTransform() {
    imgLayer.style.backgroundSize     = `${state.scale * 100}%`;
    imgLayer.style.backgroundPosition = `${state.x}px ${state.y}px`;
    if (slider) slider.value = state.scale;
  }
  applyTransform();

  // ── Drag ────────────────────────────────────────────────
  function onDown(e) {
    e.preventDefault();
    state.dragging = true;
    const pt = e.touches ? e.touches[0] : e;
    state.startX   = pt.clientX;
    state.startY   = pt.clientY;
    state.startBgX = state.x;
    state.startBgY = state.y;
    imgLayer.style.cursor = 'grabbing';
  }

  function onMove(e) {
    if (!state.dragging) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    state.x = state.startBgX + (pt.clientX - state.startX);
    state.y = state.startBgY + (pt.clientY - state.startY);
    applyTransform();
  }

  function onUp() {
    state.dragging = false;
    imgLayer.style.cursor = 'grab';
  }

  // ── Zoom via scroll ──────────────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    state.scale = Math.min(5, Math.max(0.1, state.scale + delta));
    applyTransform();
  }

  // Registra eventos na crop window
  cropWin.addEventListener('mousedown',  onDown,   { passive: false });
  cropWin.addEventListener('touchstart', onDown,   { passive: false });
  cropWin.addEventListener('wheel',      onWheel,  { passive: false });
  window.addEventListener('mousemove',   onMove);
  window.addEventListener('touchmove',   onMove,   { passive: false });
  window.addEventListener('mouseup',     onUp);
  window.addEventListener('touchend',    onUp);

  // ── Funções expostas ao HTML do modal ───────────────────

  // Ajuste de zoom pelo slider ou botões +/-
  window.aemSetZoom = function(val) {
    state.scale = Math.min(5, Math.max(0.1, val));
    applyTransform();
  };

  window.aemZoom = function(delta) {
    window.aemSetZoom(state.scale + delta);
  };

  window.aemReset = function() {
    state.x = 0; state.y = 0; state.scale = 1;
    applyTransform();
  };

  // Confirmar: salva o transform e aplica o visual na ficha via CSS
  // (não destrói a imagem original — usa sempre avatarOriginalDataUrl como fonte)
  window.aemConfirm = function() {
    // Persiste o transform para que a ficha e re-edições partam do mesmo estado
    window.avatarTransform = { x: state.x, y: state.y, scale: state.scale };

    // Renderiza o recorte em um canvas usando SEMPRE a imagem original como fonte.
    // Isso garante que abrir o editor várias vezes nunca degrada a qualidade.
    const srcUrl = window.avatarOriginalDataUrl || window.avatarDataUrl;

    const canvas = document.createElement('canvas');
    canvas.width  = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = function() {
      // Dimensões da imagem renderizada com a escala atual
      // background-size:N% em CSS significa N% da largura do container.
      // O container tem CROP_SIZE px, então:
      const renderedW = CROP_SIZE * state.scale;
      const renderedH = img.naturalHeight * (renderedW / img.naturalWidth);

      // state.x / state.y são os offsets CSS do background (posição do topo-esquerdo
      // da imagem escalada dentro do container). Para desenhar no canvas basta
      // usar esses valores diretamente como posição de destino em drawImage.
      ctx.drawImage(img,
        0, 0, img.naturalWidth, img.naturalHeight,  // fonte: imagem inteira
        state.x, state.y, renderedW, renderedH       // destino: offset + escala
      );

      const croppedUrl = canvas.toDataURL('image/png');

      // Atualiza o avatar na ficha via CSS (não sobrescreve avatarDataUrl nem original)
      const liveAvatar = document.getElementById('sh-avatar-img');
      if (liveAvatar) {
        liveAvatar.style.backgroundImage    = `url('${srcUrl}')`;
        liveAvatar.style.backgroundSize     = `${state.scale * 100}%`;
        liveAvatar.style.backgroundPosition = `${state.x}px ${state.y}px`;
      }

      closeAvatarEditor();
    };
    img.src = srcUrl;
  };

  // Fecha o modal e limpa os listeners globais
  window.closeAvatarEditor = function() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('mouseup',   onUp);
    window.removeEventListener('touchend',  onUp);
    const m = document.getElementById('avatar-editor-modal');
    if (m) m.remove();
  };
}

