from __future__ import annotations

import argparse
import contextlib
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Serve the LoudnessVis built demos from a local HTTP server.",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Default: 127.0.0.1")
    parser.add_argument("--port", type=int, default=4318, help="Port to bind. Default: 4318")
    parser.add_argument(
        "--page",
        choices=("hub", "dist", "legacy"),
        default="hub",
        help="Page to open automatically. Default: hub",
    )
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser automatically.")
    args = parser.parse_args(argv)

    assets_dir = Path(__file__).resolve().parent / "assets"
    handler_cls = partial(QuietStaticHandler, directory=str(assets_dir))
    server = ThreadingHTTPServer((args.host, args.port), handler_cls)
    url = f"http://{args.host}:{args.port}{page_path(args.page)}"

    print(f"[uv] LoudnessVis demo server ready at http://{args.host}:{args.port}/")
    print(f"[uv] React build : http://{args.host}:{args.port}/dist/index.html")
    print(f"[uv] Legacy demo : http://{args.host}:{args.port}/legacy.html")

    if not args.no_open:
        webbrowser.open(url)

    with contextlib.suppress(KeyboardInterrupt):
        server.serve_forever()

    return 0


def page_path(page: str) -> str:
    if page == "dist":
        return "/dist/index.html"
    if page == "legacy":
        return "/legacy.html"
    return "/"


class QuietStaticHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A003
        message = format % args
        print(f"[uv] {self.address_string()} - {message}")
