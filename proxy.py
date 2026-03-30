"""
proxy.py — Codex Arcanum
Proxy Flask entre o GitHub Pages e a API do OpenRouter.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os

app = Flask(__name__, static_folder='.')
CORS(app, origins="*")

API_URL  = "https://openrouter.ai/api/v1/chat/completions"
AI_MODEL = "meta-llama/Llama-3.3-70B-Instruct"


def get_api_key():
    return os.environ.get("OPENROUTE_API_KEY", "")


def get_referer():
    """Garante que o referer sempre tenha https:// na frente."""
    domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "codexarcanum-production.up.railway.app")
    domain = domain.rstrip("/")
    if not domain.startswith("http"):
        domain = "https://" + domain
    return domain


# ── Debug ─────────────────────────────────────────────────────
@app.route('/debug')
def debug():
    key = get_api_key()
    return jsonify({
        "api_key_set":    bool(key),
        "api_key_prefix": key[:12] + "..." if key else "VAZIO",
        "referer":        get_referer(),
        "port":           os.environ.get("PORT", "?"),
    })


# ── Estáticos ────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if path in ('generate', 'debug'):
        return "Use o método correto", 405
    return send_from_directory('.', path)


# ── Proxy principal ───────────────────────────────────────────
@app.route('/generate', methods=['POST'])
def generate():
    api_key = get_api_key()

    if not api_key:
        return jsonify({"error": "OPENROUTE_API_KEY não definida no Railway."}), 500

    data = request.json
    if not data or 'messages' not in data:
        return jsonify({"error": "Body inválido: esperado { messages: [...] }"}), 400

    referer = get_referer()

    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {api_key}",
        "X-Title":       "Codex-Arcanum",
        "HTTP-Referer":  referer,
    }

    body = {
        "model":      AI_MODEL,
        "max_tokens": 1200,
        "messages":   data['messages'],
    }

    # Log completo para diagnóstico nos logs do Railway
    print(f"[proxy] Referer: {referer}")
    print(f"[proxy] Auth header: Bearer {api_key[:10]}...")
    print(f"[proxy] Modelo: {AI_MODEL}")

    try:
        response = requests.post(API_URL, headers=headers, json=body, timeout=60)
        print(f"[proxy] Status OpenRouter: {response.status_code}")

        if response.status_code != 200:
            print(f"[proxy] Resposta de erro: {response.text}")

        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({
                "error":  f"API retornou {response.status_code}",
                "detail": response.text,
            }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({"error": "Timeout."}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"  Referer: {get_referer()}")
    print(f"  Chave: {get_api_key()[:10]}...")
    app.run(host='0.0.0.0', port=port)
