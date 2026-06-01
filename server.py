from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import urllib.error
import urllib.request


API_BASE_URL = "https://apis.cccjin.cn/v1"
CHAT_COMPLETIONS_URL = f"{API_BASE_URL}/chat/completions"
MODELS_URL = f"{API_BASE_URL}/models"


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/config":
            self._json_response(
                200,
                {
                    "serverKeyConfigured": bool(os.environ.get("CCCJIN_API_KEY", "").strip()),
                    "defaultModel": os.environ.get("CCCJIN_MODEL", "gemini-2.5-flash"),
                },
            )
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/models":
            self.handle_models()
            return

        if self.path != "/api/analyze-image":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            api_key = self._resolve_api_key(data)
            model = data.get("model", "").strip() or os.environ.get("CCCJIN_MODEL", "gemini-2.5-flash")
            image = data["image"]
            prompt = data["prompt"]

            upstream_body = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image}},
                        ],
                    }
                ],
                "temperature": 0.2,
            }

            request = urllib.request.Request(
                CHAT_COMPLETIONS_URL,
                data=json.dumps(upstream_body).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )

            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.loads(response.read().decode("utf-8"))

            content = payload["choices"][0]["message"]["content"]
            self._json_response(200, {"content": content, "raw": payload})
        except urllib.error.HTTPError as error:
            self._json_response(error.code, {"error": self._read_http_error(error)})
        except Exception as error:
            self._json_response(500, {"error": str(error)})

    def handle_models(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            api_key = self._resolve_api_key(data)

            request = urllib.request.Request(
                MODELS_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                method="GET",
            )

            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))

            models = []
            for item in payload.get("data", []):
                model_id = item.get("id")
                if model_id:
                    models.append(model_id)
            self._json_response(200, {"models": sorted(set(models)), "raw": payload})
        except urllib.error.HTTPError as error:
            self._json_response(error.code, {"error": self._read_http_error(error)})
        except Exception as error:
            self._json_response(500, {"error": str(error)})

    def _resolve_api_key(self, data):
        api_key = os.environ.get("CCCJIN_API_KEY", "").strip() or data.get("apiKey", "").strip()
        if not api_key:
            raise ValueError("Missing API key. Set CCCJIN_API_KEY on the server or enter an API key in the page.")
        return api_key

    def _read_http_error(self, error):
        detail = error.read().decode("utf-8", errors="replace")
        if not detail:
            return str(error)
        try:
            payload = json.loads(detail)
            return payload.get("error", {}).get("message") or payload.get("message") or detail
        except Exception:
            return detail

    def _json_response(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8787"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port}/")
    server.serve_forever()
