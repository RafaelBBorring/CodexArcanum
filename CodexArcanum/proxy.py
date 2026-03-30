"""
proxy.py
========
Servidor Flask que atua como proxy entre o frontend (browser)
e a API do OpenRouter, resolvendo o problema de CORS.

POR QUE É NECESSÁRIO?
  Navegadores bloqueiam requisições de páginas locais (file://)
  ou de origens diferentes para APIs externas (CORS).
  Este proxy roda em localhost e repassa as chamadas com autenticação.

COMO USAR:
  1. Instale as dependências (apenas uma vez):
       pip install flask flask-cors requests

  2. Inicie o servidor:
       python proxy.py

  3. Abra o frontend acessando:
       http://localhost:5000
     (NÃO abra o index.html direto como arquivo — use a URL acima)

ONDE TROCAR O MODELO:
  Edite AI_MODEL abaixo. Use o mesmo valor que está em js/api.js.
  Lista de modelos gratuitos: https://openrouter.ai/models?max_price=0

ONDE TROCAR A CHAVE:
  Edite API_KEY abaixo.

PARA USAR ANTHROPIC AO INVÉS DO OPENROUTER:
  1. Troque API_URL e API_KEY
  2. Troque os headers (x-api-key ao invés de Authorization)
  3. Ajuste o body (ver comentário no final)
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests

# ── App Flask ────────────────────────────────────────────────
app = Flask(__name__, static_folder='.')
CORS(app)

# ── Configuração da API ──────────────────────────────────────
# ATENÇÃO: AI_MODEL deve ser igual ao AI_MODEL em js/api.js
API_URL  = "https://openrouter.ai/api/v1/chat/completions"
API_KEY  = "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"
AI_MODEL = "meta-llama/Llama-3.3-70B-Instruct"   # ← modelo confirmado como gratuito

# ── Rota raiz: serve o index.html ────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# ── Rota de arquivos estáticos (css/, js/, assets/) ──────────
@app.route('/<path:path>')
def static_files(path):
    # Bloqueia a rota /generate para não conflitar
    if path == 'generate':
        return "Use POST /generate", 405
    return send_from_directory('.', path)

# ── Rota proxy: recebe do frontend e repassa à API ───────────
# O api.js envia: POST /generate  com body { messages: [...] }
# O proxy monta o body completo e adiciona os headers de autenticação.
@app.route('/generate', methods=['POST'])
def generate():
    data = request.json

    # Valida o body recebido
    if not data or 'messages' not in data:
        return jsonify({"error": "Body inválido: esperado { messages: [...] }"}), 400

    # Headers enviados para o OpenRouter
    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {API_KEY}",   # autenticação Bearer (OpenRouter)
        "X-Title":       "Character-Sheet",     # identificação no painel do OR
        "HTTP-Referer":  "http://localhost:5000" # origem (requerido pelo OR em alguns casos)
    }

    # Body completo para o OpenRouter
    # O frontend envia apenas { messages } — o proxy adiciona model e max_tokens
    body = {
        "model":      AI_MODEL,
        "max_tokens": 1200,
        "messages":   data['messages']
    }

    print(f"[proxy] Enviando para: {API_URL}")
    print(f"[proxy] Modelo: {AI_MODEL}")
    print(f"[proxy] Mensagens: {len(data['messages'])} mensagem(ns)")

    try:
        response = requests.post(API_URL, headers=headers, json=body, timeout=60)

        print(f"[proxy] Resposta da API: {response.status_code}")

        if response.status_code == 200:
            return jsonify(response.json())
        else:
            # Log do erro para diagnóstico no terminal
            print(f"[proxy] ERRO: {response.text}")
            return jsonify({
                "error":  f"API retornou {response.status_code}",
                "detail": response.text
            }), response.status_code

    except requests.exceptions.Timeout:
        print("[proxy] TIMEOUT: API não respondeu em 60 segundos")
        return jsonify({"error": "Timeout: API não respondeu. Tente novamente."}), 504

    except requests.exceptions.ConnectionError as e:
        print(f"[proxy] ERRO DE CONEXÃO: {e}")
        return jsonify({"error": "Sem conexão com a internet ou API indisponível."}), 503

    except Exception as e:
        print(f"[proxy] EXCEÇÃO: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 52)
    print("  Codex Arcanum — Proxy Server")
    print("  Acesse: http://localhost:5000")
    print(f"  Modelo: {AI_MODEL}")
    print("=" * 52)
    app.run(host='0.0.0.0', port=5000, debug=True)


# ============================================================
# PARA USAR ANTHROPIC AO INVÉS DO OPENROUTER:
#
# API_URL  = "https://api.anthropic.com/v1/messages"
# API_KEY  = "sk-ant-..."
# AI_MODEL = "claude-3-5-sonnet-20241022"
#
# Headers:
#   headers = {
#     "Content-Type":      "application/json",
#     "x-api-key":          API_KEY,          # Anthropic usa x-api-key
#     "anthropic-version": "2023-06-01"
#   }
#
# Body:
#   body = {
#     "model":      AI_MODEL,
#     "max_tokens": 1200,
#     "messages":   data['messages']
#   }
#
# Extração do texto na resposta (em api.js, troque a linha de extração):
#   data.content[0].text   (ao invés de data.choices[0].message.content)
# ============================================================
