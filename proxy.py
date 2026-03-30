"""
proxy.py
========
Servidor Flask que atua como proxy entre o frontend (browser)
e a API do OpenRouter, resolvendo o problema de CORS.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os

# ── App Flask ────────────────────────────────────────────────
app = Flask(__name__, static_folder='.')

# CORS aberto para GitHub Pages e qualquer origem
CORS(app, origins="*")

# ── Configuração da API ──────────────────────────────────────
API_URL = "https://openrouter.ai/api/v1/chat/completions"

AI_MODEL = "meta-llama/Llama-3.3-70B-Instruct"


def get_api_key():
    """Lê a chave em runtime para garantir que pega o valor atual do ambiente."""
    return os.environ.get("OPENROUTE_API_KEY") or os.getenv("OPENROUTE_API_KEY")


def get_railway_domain():
    return os.environ.get("RAILWAY_PUBLIC_DOMAIN", "https://codexarcanum-production.up.railway.app").rstrip("/")


# ── Rota de diagnóstico ───────────────────────────────────────
@app.route('/debug')
def debug():
    key = get_api_key() or ""
    return jsonify({
        "api_key_set":    bool(key),
        "api_key_prefix": key[:12] + "..." if key else "VAZIO — variavel nao encontrada",
        "railway_domain": get_railway_domain(),
        "port":           os.environ.get("PORT", "nao definida"),
        "all_env_keys":   [k for k in os.environ.keys() if "RAIL" in k or "OPEN" in k or "PORT" in k],
    })


# ── Rota raiz: serve o index.html ────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


# ── Rota de arquivos estáticos ────────────────────────────────
@app.route('/<path:path>')
def static_files(path):
    if path == 'generate':
        return "Use POST /generate", 405
    if path == 'debug':
        return debug()
    return send_from_directory('.', path)


# ── Rota proxy ────────────────────────────────────────────────
@app.route('/generate', methods=['POST'])
def generate():
    api_key = get_api_key()

    if not api_key:
        print("[proxy] ERRO CRÍTICO: OPENROUTE_API_KEY não está definida!")
        return jsonify({"error": "Chave da API não configurada no servidor. Verifique as variáveis de ambiente no Railway."}), 500

    data = request.json
    if not data or 'messages' not in data:
        return jsonify({"error": "Body inválido: esperado { messages: [...] }"}), 400

    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {api_key}",
        "X-Title":       "Codex-Arcanum",
        "HTTP-Referer":  get_railway_domain(),
    }

    body = {
        "model":      AI_MODEL,
        "max_tokens": 1200,
        "messages":   data['messages'],
    }

    print(f"[proxy] Enviando para: {API_URL}")
    print(f"[proxy] Modelo: {AI_MODEL}")
    print(f"[proxy] Referer: {get_railway_domain()}")
    print(f"[proxy] Chave (prefix): {api_key[:10]}...")

    try:
        response = requests.post(API_URL, headers=headers, json=body, timeout=60)
        print(f"[proxy] Resposta da API: {response.status_code}")

        if response.status_code == 200:
            return jsonify(response.json())
        else:
            print(f"[proxy] ERRO: {response.text}")
            return jsonify({
                "error":  f"API retornou {response.status_code}",
                "detail": response.text,
            }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({"error": "Timeout: API não respondeu. Tente novamente."}), 504

    except requests.exceptions.ConnectionError as e:
        return jsonify({"error": "Sem conexão com a API."}), 503

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 52)
    print("  Codex Arcanum — Proxy Server")
    print(f"  Modelo:  {AI_MODEL}")
    print(f"  Referer: {get_railway_domain()}")
    print("=" * 52)

    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
