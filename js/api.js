// ============================================================
// api.js
// Módulo de integração com IA — OpenRouter via proxy local.
//
// COMO FUNCIONA O ROTEAMENTO:
//   → Quando rodando em localhost (python proxy.py):
//        fetch → /generate  (proxy Flask, que repassa para a OpenRouter)
//   → Quando hospedado externamente (Vercel, Netlify etc.):
//        fetch → https://openrouter.ai diretamente
//
//   Isso resolve o problema de CORS do browser e permite
//   que o mesmo código funcione nos dois cenários.
//
// ONDE TROCAR O MODELO:
//   Edite AI_MODEL abaixo  E  o AI_MODEL no proxy.py.
//   Os dois precisam estar sincronizados quando usar o proxy.
//
// MODELOS GRATUITOS CONFIRMADOS NO OPENROUTER (março 2025):
//   'meta-llama/llama-3.1-8b-instruct:free'   ← RECOMENDADO
//   'mistralai/mistral-7b-instruct:free'
//   'qwen/qwen-2-7b-instruct:free'
//   'microsoft/phi-3-mini-128k-instruct:free'
//
// Para ver a lista atualizada:
//   https://openrouter.ai/models?max_price=0
// ============================================================

// ── Configuração ─────────────────────────────────────────────


// Modelo gratuito confirmado — deve coincidir com o AI_MODEL no proxy.py
const AI_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';

// Nome do app (aparece no painel do OpenRouter)
const APP_NAME = 'Character-Sheet';

// ── Detecção de ambiente ──────────────────────────────────────
// Se estiver em localhost, usa o proxy Flask para evitar CORS.
// Caso contrário, chama a OpenRouter diretamente.
function getApiEndpoint() {
  return 'https://codexarcanum-production.up.railway.app/generate';
}

// ── Função principal de chamada à IA ─────────────────────────
// Gera as 5 habilidades do personagem via IA.
//
// Parâmetros:
//   nivel   → nível (5, 10, 15...)
//   naStr   → string do NA ("1", "2"...)
//   profile → chave do perfil ("guerreiro", "especialista", "mistico")
//   stats   → { vida, arm, ba, bd, ca, reac, dano, danoExtra }
//   attrs   → array [FOR, DES, CON, INT, SAB, CAR]
//   desc    → descrição temática do personagem (string, pode ser vazia)
//
// Retorna: Promise<{ abilities: Array<{name, type, description, stats}> }>

async function callAI(nivel, naStr, profile, stats, attrs, desc) {
  const naInfo   = NA_MODS[naStr];
  const profInfo = PROFILES[profile];
  const attrStr  = ATTR_NAMES.map((n, i) => `${n}: ${attrs[i]}`).join(', ');

  // ── System prompt: define o papel e o formato obrigatório ──
  const systemPrompt = `Você é um mestre de RPG especialista em criação de fichas de personagem.
Sua tarefa é gerar habilidades únicas, criativas e bem escritas para um NPC/personagem de RPG.
Você DEVE retornar APENAS um JSON válido, sem texto antes ou depois, sem blocos de código markdown.
O JSON deve seguir exatamente o formato especificado pelo usuário.`;

  // ── Contexto numérico do personagem ────────────────────────
  const statsContext = [
    `Perfil: ${profInfo.name} (dado ${profInfo.dice})`,
    `Nível: ${nivel} | NA: ${naStr} (${naInfo.tag})`,
    `Pontos de Vida: ${stats.vida}`,
    `Armadura: ${stats.arm} | CA: ${stats.ca}`,
    `Bônus de Ataque: +${stats.ba} | Bônus de Defesa: +${stats.bd}`,
    `Reações por turno: ${stats.reac}`,
    `Dano Base: ${stats.dano}${stats.danoExtra || ''}`,
    `Atributos: ${attrStr}`
  ].join('\n');

  // ── User prompt: instrução criativa + formato de saída ─────
  const userPrompt = `Considere a descrição do Personagem de RPG: "${desc || 'Sem descrição fornecida — use o perfil e os stats como guia'}"

${statsContext}

Crie as habilidades deste personagem de forma separada, respeitando uma estrutura base.
Seja criativo na criação dos poderes e faça ótimas descrições ainda que não longas o bastante.
Crie novas mecânicas se desejar ou utilize o bom e velho feijão com arroz,
mas sempre respeitando a ideia geral do personagem descrito anteriormente.

Os números das habilidades devem ser coerentes com o nível ${nivel} e NA ${naStr}.
Para o perfil ${profInfo.name}, o dano base é ${stats.dano} — use essa escala como referência.

Gere EXATAMENTE 5 habilidades: 1 passiva, 3 ativas, 1 ultimate.

Retorne SOMENTE este JSON (sem markdown, sem explicação):
{
  "abilities": [
    {
      "name": "Nome da Habilidade",
      "type": "passiva",
      "description": "Descrição da habilidade com mecânica clara.",
      "stats": ["Dado: Xd6", "Alcance: Ym", "CD: Z"]
    },
    { "name": "...", "type": "ativa",    "description": "...", "stats": ["..."] },
    { "name": "...", "type": "ativa",    "description": "...", "stats": ["..."] },
    { "name": "...", "type": "ativa",    "description": "...", "stats": ["..."] },
    { "name": "...", "type": "ultimate", "description": "...", "stats": ["..."] }
  ]
}`;

  // ── Monta as mensagens (formato OpenAI-compatible) ──────────
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt   }
  ];

  // ── Decide endpoint e headers conforme o ambiente ──────────
  const endpoint = getApiEndpoint();
  const isProxy  = endpoint === '/generate';

  // Headers:
  //   Proxy → sem Authorization (o proxy.py adiciona com a chave)
  //   Direto → Authorization Bearer necessário
  const headers = { 'Content-Type': 'application/json' };

  // Body:
  //   Proxy → envia apenas { messages } — o proxy.py monta o resto
  //   Direto → body completo com model e max_tokens
  const body = isProxy
    ? { messages }
    : { model: AI_MODEL, max_tokens: 1200, messages };

  console.log(`[api.js] Usando endpoint: ${endpoint} (${isProxy ? 'proxy local' : 'direto'})`);

  // ── Chamada HTTP ────────────────────────────────────────────
  const response = await fetch(endpoint, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API retornou ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Extrai o texto — OpenRouter e proxy retornam o mesmo formato
  const rawText = data?.choices?.[0]?.message?.content || '';

  if (!rawText) {
    throw new Error('IA retornou resposta vazia. Tente novamente.');
  }

  // Remove eventuais blocos de código markdown
  const cleanText = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // ── Parse do JSON ───────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (e) {
    // Fallback: tenta extrair o bloco JSON mesmo com texto ao redor
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error('IA retornou JSON malformado. Tente novamente.');
      }
    } else {
      console.error('[api.js] Resposta bruta da IA:', rawText);
      throw new Error('IA não retornou JSON válido. Tente novamente ou troque o modelo.');
    }
  }

  // Valida que o objeto tem o array de habilidades esperado
  if (!parsed.abilities || !Array.isArray(parsed.abilities)) {
    throw new Error('Resposta da IA não contém o campo "abilities". Tente novamente.');
  }

  return parsed; // { abilities: [...] }
}
