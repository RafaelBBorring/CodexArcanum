# Codex Arcanum — Gerador de Fichas RPG

Sistema web para geração automática de fichas de personagem RPG com IA.

---

## Estrutura do Projeto

```
codex-arcanum/
├── index.html          ← Página principal (formulário + ficha)
├── proxy.py            ← Servidor proxy Flask (resolve CORS da API)
│
├── css/
│   ├── form.css        ← Estilos do formulário de entrada
│   └── sheet.css       ← Estilos da ficha gerada
│
└── js/
    ├── data.js         ← Tabelas de dados (perfis, NA_MODS, atributos)
    ├── api.js          ← Integração com a API de IA (OpenRouter)
    ├── sheet.js        ← Renderização e edição inline da ficha
    ├── export.js       ← Exportação para PNG e PDF
    └── main.js         ← Controlador principal (form, cálculos, geração)
```

---

## Configuração do Ambiente

### Pré-requisitos
- Python 3.8+
- pip

### Instalação

```bash
# 1. Clone ou extraia o projeto
cd codex-arcanum

# 2. Instale as dependências Python
pip install flask flask-cors requests

# 3. Inicie o servidor proxy
python proxy.py
```

O servidor estará disponível em: **http://localhost:5000**

---

## API de IA — Configuração

A integração está em `js/api.js`. Para trocar a chave ou o provider:

### Usando OpenRouter (atual — recomendado para testes gratuitos)

Edite as constantes no topo de `js/api.js`:

```javascript
const API_URL  = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY  = 'sua-chave-openrouter';
const AI_MODEL = 'meta-llama/llama-3-8b-instruct:free'; // gratuito
```

**Modelos gratuitos disponíveis no OpenRouter:**
| Modelo | Qualidade | Velocidade |
|--------|-----------|------------|
| `meta-llama/llama-3-8b-instruct:free` | ★★★★☆ | Rápido |
| `mistralai/mistral-7b-instruct:free` | ★★★☆☆ | Muito rápido |
| `openchat/openchat-3.5-0106:free` | ★★★☆☆ | Rápido |

Para criar uma conta gratuita: https://openrouter.ai

---

### Usando Anthropic diretamente

Troque em `js/api.js`:

```javascript
const API_URL  = 'https://api.anthropic.com/v1/messages';
const API_KEY  = 'sk-ant-...';
const AI_MODEL = 'claude-3-5-sonnet-20241022';
```

E altere o fetch para usar os headers corretos da Anthropic
(ver comentário no final de `js/api.js`).

> **Atenção:** Chamadas diretas à API da Anthropic são bloqueadas
> por CORS no browser. Use o `proxy.py` nesse caso.

---

### Usando o Proxy (proxy.py)

O `proxy.py` já está configurado para OpenRouter.
Para Anthropic, edite as constantes no topo do arquivo:

```python
API_URL = "https://api.anthropic.com/v1/messages"
API_KEY = "sk-ant-..."
AI_MODEL = "claude-3-5-sonnet-20241022"
```

---

## Onde encontrar cada função importante

| O que você quer mudar | Arquivo | Onde |
|----------------------|---------|------|
| Chave / URL da API | `js/api.js` | topo do arquivo |
| Modelo de IA | `js/api.js` | constante `AI_MODEL` |
| Prompt enviado à IA | `js/api.js` | constantes `systemPrompt` e `userPrompt` |
| Stats base por nível | `js/data.js` | objeto `PROFILES` |
| Modificadores de NA | `js/data.js` | objeto `NA_MODS` |
| Cálculo de CA | `js/main.js` | função `applyNA()` |
| Layout da ficha | `css/sheet.css` + `js/sheet.js` | renderSheet() |
| Edição inline | `js/sheet.js` | função `activateInlineEditing()` |
| Exportar PNG/PDF | `js/export.js` | exportImage() / exportPDF() |

---

## Funcionalidades

- Seleção de Nível (5, 10, 15, 20, 25, 30) e NA (0.25 a 10)
- 3 perfis: Guerreiro (d10), Especialista (d8), Místico (d6)
- 3 distribuições de atributos: Balanceada, Min-Max, Extrema
- Upload de avatar: arrastar, clicar ou colar (Ctrl+V)
- Geração de 5 habilidades por IA: 1 passiva, 3 ativas, 1 ultimate
- **Todos os campos da ficha são editáveis** com clique direto
- CA recalculada automaticamente ao editar o Bônus de Ataque
- Exportação em PNG e PDF
