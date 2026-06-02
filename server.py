from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import urllib.error
import urllib.request


API_BASE_URL = "https://www.lxc.lt/v1"
CHAT_COMPLETIONS_URL = f"{API_BASE_URL}/chat/completions"
MODELS_URL = f"{API_BASE_URL}/models"


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/config":
            prompt_api_key = self._server_prompt_api_key()
            image_api_key = self._server_image_api_key()
            self._json_response(
                200,
                {
                    "serverKeyConfigured": bool(prompt_api_key),
                    "imageKeyConfigured": bool(image_api_key),
                    "defaultModel": os.environ.get("LXC_MODEL", os.environ.get("CCCJIN_MODEL", "gpt-5.5")),
                },
            )
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/models":
            self.handle_models()
            return

        if self.path == "/api/generate-image":
            self.handle_generate_image()
            return

        if self.path != "/api/analyze-image":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            api_key = self._resolve_api_key(data)
            model = data.get("model", "").strip() or os.environ.get("LXC_MODEL", os.environ.get("CCCJIN_MODEL", "gpt-5.5"))
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
                payload = self._read_json_response(response)

            content = payload["choices"][0]["message"]["content"]
            self._json_response(200, {"content": content, "raw": payload})
        except urllib.error.HTTPError as error:
            self._json_response(error.code, {"error": self._read_http_error(error)})
        except Exception as error:
            self._json_response(500, {"error": str(error)})

    def handle_generate_image(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            api_key = self._resolve_image_api_key(data)
            model = data.get("model", "").strip() or "gpt-image-2"
            prompt = data["prompt"]
            image = data.get("image", "").strip()

            content = [{"type": "text", "text": prompt}]
            if image:
                content.append({"type": "image_url", "image_url": {"url": image}})

            upstream_body = {
                "model": model,
                "messages": [{"role": "user", "content": content}],
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

            with urllib.request.urlopen(request, timeout=180) as response:
                payload = self._read_json_response(response)

            message = payload.get("choices", [{}])[0].get("message", {})
            content = message.get("content", "")
            images = self._extract_images(payload)
            self._json_response(200, {"content": content, "images": images, "raw": payload})
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
                payload = self._read_json_response(response)

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
        api_key = (
            self._server_prompt_api_key()
            or data.get("apiKey", "").strip()
        )
        if not api_key:
            raise ValueError("Missing API key. Set LXC_API_KEY on the server or enter an API key in the page.")
        return api_key

    def _resolve_image_api_key(self, data):
        api_key = (
            self._server_image_api_key()
            or data.get("imageApiKey", "").strip()
            or data.get("apiKey", "").strip()
        )
        if not api_key:
            raise ValueError("Missing image API key. Set LXC_IMAGE_API_KEY on the server.")
        return api_key

    def _server_prompt_api_key(self):
        return (
            os.environ.get("LXC_API_KEY", "").strip()
            or os.environ.get("CCCJIN_API_KEY", "").strip()
        )

    def _server_image_api_key(self):
        return os.environ.get("LXC_IMAGE_API_KEY", "").strip()

    def _read_http_error(self, error):
        detail = error.read().decode("utf-8", errors="replace")
        if not detail:
            return str(error)
        try:
            payload = json.loads(detail)
            return payload.get("error", {}).get("message") or payload.get("message") or detail
        except Exception:
            return detail

    def _read_json_response(self, response):
        detail = response.read().decode("utf-8", errors="replace")
        return json.loads(detail)

    def _extract_images(self, payload):
        images = []

        def add_image(value):
            if not value or not isinstance(value, str):
                return
            if value.startswith(("http://", "https://", "data:image/")):
                if value not in images:
                    images.append(value)
                return
            if len(value) > 200 and not value.startswith("{") and not value.startswith("["):
                data_url = f"data:image/png;base64,{value}"
                if data_url not in images:
                    images.append(data_url)

        def scan(value):
            if isinstance(value, dict):
                for key in ("url", "b64_json", "base64", "image", "image_url"):
                    item = value.get(key)
                    if isinstance(item, dict):
                        add_image(item.get("url") or item.get("b64_json") or item.get("base64"))
                    else:
                        add_image(item)
                for item in value.values():
                    scan(item)
            elif isinstance(value, list):
                for item in value:
                    scan(item)
            elif isinstance(value, str):
                for marker in ("![", "http://", "https://", "data:image/"):
                    if marker in value:
                        self._extract_images_from_text(value, images)
                        break

        scan(payload)
        return images

    def _extract_images_from_text(self, text, images):
        for token in text.replace(")", " ").replace("]", " ").replace("\n", " ").split():
            cleaned = token.strip("(<>'\"")
            if cleaned.startswith(("http://", "https://", "data:image/")) and cleaned not in images:
                images.append(cleaned)

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
