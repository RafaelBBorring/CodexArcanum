// ============================================================
// main.js
// Controlador principal da aplicação.
//
// Responsável por:
//   - Estado da interface (perfil, distribuição, avatar)
//   - Dropzone de upload de imagem (arrastar / clicar / colar)
//   - Seleção de perfil e distribuição de atributos
//   - Lógica de geração: interpolação, aplicação de NA, atributos
//   - Orquestração: chama api.js → sheet.js → exibe resultado
//   - resetForm(): volta para o formulário
//
// Funções de cálculo:
//   interpolate(profile, level) → estatísticas base interpoladas
//   applyNA(base, naStr)        → estatísticas com modificadores de NA
//   calcCA(ba)                  → CA = 10 + (BA - 3)
//   getAttrDist(level)          → array de 6 atributos para o nível
// ============================================================

// ── Estado global da aplicação ───────────────────────────────
// Estas variáveis são lidas por sheet.js (avatarDataUrl)
// e por generateSheet() abaixo.
window.selectedProfile = 'especialista'; // perfil padrão
window.selectedDist    = 'balanceada';   // distribuição padrão
window.avatarDataUrl         = '';  // base64 da imagem carregada (pode ser recortada)
window.avatarOriginalDataUrl = '';  // base64 da imagem ORIGINAL — nunca sobrescrita

// ── Dropzone: eventos de drag-and-drop ──────────────────────

function dzDragOver(e) {
  e.preventDefault();
  document.getElementById('avatarDropzone').classList.add('dragover');
}

function dzDragLeave() {
  document.getElementById('avatarDropzone').classList.remove('dragover');
}

function dzDrop(e) {
  e.preventDefault();
  document.getElementById('avatarDropzone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadAvatarFile(file);
}

// Clique na dropzone → abre seletor de arquivo
// (exceto se clicou no botão de limpar)
function dzClick(e) {
  if (e.target.id === 'dzClearBtn' || e.target.closest('#dzClearBtn')) return;
  document.getElementById('avatarFileInput').click();
}

// Quando o usuário seleciona um arquivo pelo input hidden
function dzFileChange(e) {
  if (e.target.files[0]) loadAvatarFile(e.target.files[0]);
}

// Escuta paste global para capturar imagem colada (Ctrl+V)
document.addEventListener('paste', function (e) {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      loadAvatarFile(item.getAsFile());
      break;
    }
  }
});

// Lê o arquivo de imagem como base64 e exibe o preview
function loadAvatarFile(file) {
  const reader = new FileReader();
  reader.onload = function (ev) {
    window.avatarDataUrl         = ev.target.result;
    window.avatarOriginalDataUrl = ev.target.result; // preserva o original para re-edições
    window.avatarTransform       = { x: 0, y: 0, scale: 1 }; // reseta transform ao trocar imagem
    document.getElementById('avatarPreviewImg').src = window.avatarDataUrl;
    document.getElementById('dzEmpty').style.display   = 'none';
    document.getElementById('dzPreview').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

// Botão de limpar avatar
document.getElementById('dzClearBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  window.avatarDataUrl         = '';
  window.avatarOriginalDataUrl = '';
  window.avatarTransform       = { x: 0, y: 0, scale: 1 };
  document.getElementById('avatarPreviewImg').src    = '';
  document.getElementById('avatarFileInput').value   = '';
  document.getElementById('dzEmpty').style.display   = 'flex';
  document.getElementById('dzPreview').style.display = 'none';
});

// ── Seleção de Perfil ────────────────────────────────────────
function setProfile(p) {
  window.selectedProfile = p;
  document.querySelectorAll('.profile-card').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + p).classList.add('active');
}

// ── Seleção de Distribuição de Atributos ─────────────────────
function setDist(d) {
  window.selectedDist = d;
  document.querySelectorAll('.dist-pill').forEach(b => b.classList.remove('active'));
  document.getElementById('dist-' + d).classList.add('active');
}

// ── Utilitários de cálculo ───────────────────────────────────

// Número inteiro aleatório no intervalo [a, b]
function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// CA = 10 + Bônus de Defesa, onde BD = BA - 3
function calcCA(ba) {
  return 10 + (ba - 3);
}

// Interpola estatísticas base para níveis entre os pontos-chave.
// Ex: nível 7 → interpola entre nível 5 e nível 10.
function interpolate(profile, level) {
  const keys = Object.keys(profile.levels).map(Number).sort((a, b) => a - b);

  // Se o nível for menor ou igual ao primeiro ponto, retorna o primeiro
  if (level <= keys[0]) return { ...profile.levels[keys[0]] };
  // Se maior ou igual ao último, retorna o último
  if (level >= keys[keys.length - 1]) return { ...profile.levels[keys[keys.length - 1]] };

  // Encontra os dois pontos entre os quais interpolar
  let lo = keys[0], hi = keys[1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= level && level <= keys[i + 1]) {
      lo = keys[i]; hi = keys[i + 1]; break;
    }
  }

  // Fator de interpolação linear (0 a 1)
  const t = (level - lo) / (hi - lo);
  const a = profile.levels[lo];
  const b = profile.levels[hi];

  return {
    vida: [Math.round(a.vida[0] + (b.vida[0] - a.vida[0]) * t),
           Math.round(a.vida[1] + (b.vida[1] - a.vida[1]) * t)],
    arm:  [Math.round(a.arm[0]  + (b.arm[0]  - a.arm[0])  * t),
           Math.round(a.arm[1]  + (b.arm[1]  - a.arm[1])  * t)],
    dano: a.dano,  // expressão de dado (string) não interpola
    ba:   Math.round(a.ba   + (b.ba   - a.ba)   * t),
    reac: Math.round(a.reac + (b.reac - a.reac) * t)
  };
}

// Aplica os modificadores de NA sobre as estatísticas base interpoladas.
// Retorna o objeto final de stats exibido na ficha.
function applyNA(base, naStr) {
  const m = NA_MODS[naStr];

  // Vida: aplica percentual sobre um valor aleatório no range
  const vidaBase = rand(base.vida[0], base.vida[1]);
  const vida     = Math.round(vidaBase * (1 + m.vida / 100));

  // Armadura: soma absoluta
  const arm = rand(base.arm[0], base.arm[1]) + m.arm;

  // Bônus de Ataque final
  const ba = base.ba + m.ba;

  // Bônus de Defesa = BA - 3  (regra do sistema)
  const bd = ba - 3;

  // CA = 10 + Bônus de Defesa  (fórmula simplificada)
  const ca = 10 + bd;

  // Reações: mínimo 0
  const reac = Math.max(0, base.reac + m.reac);

  return {
    vida,
    arm,
    ba,
    bd,        // ← novo campo: Bônus de Defesa
    ca,        // ← recalculado como 10 + bd
    reac,
    dano:      base.dano,
    danoExtra: m.danoBase,
    tag:       m.tag
  };
}

// Retorna o array de 6 atributos para o nível e distribuição selecionados.
// Usa fallback para 'balanceada' se a distribuição não cobrir o nível.
function getAttrDist(level) {
  const tbl = ATTR_DIST[window.selectedDist] || ATTR_DIST.balanceada;
  const fb  = ATTR_DIST.balanceada;

  // Seleciona a faixa de nível correta
  const pick = (t) => {
    if (level <= 7  && t['1-7'])   return t['1-7'];
    if (level <= 14 && t['8-14'])  return t['8-14'];
    if (level <= 22 && t['15-22']) return t['15-22'];
    if (t['23-30'])                return t['23-30'];
    return null;
  };

  return pick(tbl) || pick(fb);
}

// ── Geração principal da ficha ───────────────────────────────
// Orquestra todo o fluxo: validação → cálculos → API → renderização
async function generateSheet() {
  const nivel = parseInt(document.getElementById('nivel').value);
  const naStr = document.getElementById('na').value;
  const nome  = document.getElementById('nome').value.trim() || 'Sem Nome';
  const desc  = document.getElementById('habilDesc').value.trim();

  const errEl = document.getElementById('errorMsg');
  errEl.style.display = 'none';

  // ── Esconde o formulário e mostra o loading ──────────────
  document.getElementById('form-section').style.display    = 'none';
  document.getElementById('sheet-container').style.display = 'none';
  document.getElementById('loadingArea').style.display     = 'block';
  document.getElementById('genBtn').disabled               = true;

  try {
    // 1. Obtém o perfil selecionado
    const profile = PROFILES[window.selectedProfile];

    // 2. Interpola as estatísticas base para o nível escolhido
    const base = interpolate(profile, nivel);

    // 3. Aplica os modificadores de NA
    const stats = applyNA(base, naStr);

    // 4. Monta o array de atributos (ordenado decrescente + variação de ±1)
    const attrs = [...getAttrDist(nivel)]
      .sort((a, b) => b - a)
      .map(v => v + rand(-1, 1));

    // 5. Chama a IA para gerar as 5 habilidades (api.js)
    const aiData = await callAI(nivel, naStr, window.selectedProfile, stats, attrs, desc);

    // 6. Renderiza a ficha com todos os dados (sheet.js)
    renderSheet({
      nivel,
      na:         naStr,
      nome,
      profile:    window.selectedProfile,
      stats,
      attrs,
      abilities:  aiData.abilities
    });

  } catch (e) {
    // Em caso de erro: volta o formulário e exibe a mensagem
    document.getElementById('form-section').style.display = 'block';
    document.getElementById('genBtn').disabled            = false;
    errEl.textContent = `Erro ao gerar ficha: ${e.message || e}`;
    errEl.style.display = 'block';
    console.error('[generateSheet] Erro:', e);

  } finally {
    // Sempre esconde o loading, independente de sucesso ou erro
    document.getElementById('loadingArea').style.display = 'none';
  }
}

// ── Reset do formulário ──────────────────────────────────────
// Volta para o estado inicial (formulário visível, ficha oculta)
function resetForm() {
  document.getElementById('form-section').style.display    = 'block';
  document.getElementById('sheet-container').style.display = 'none';
  document.getElementById('genBtn').disabled               = false;
  document.getElementById('errorMsg').style.display        = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
