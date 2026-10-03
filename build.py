"""Build the downloadable product: one self-contained HTML tracker + guide + license, zipped.

Usage: python3 build.py   ->   dist/Manager-Performance-Tracker.zip
"""
import base64
import pathlib
import re
import zipfile

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"
FOLDER = "Manager Performance Tracker"

html = (ROOT / "index.html").read_text(encoding="utf-8")
app = (ROOT / "app.js").read_text(encoding="utf-8")
html, count = re.subn(r'<script src="\./app\.js[^"]*" defer></script>', lambda _: "<script>\n" + app + "\n</script>", html)
assert count == 1, "app.js script tag not found in index.html"
# The download is a single file, so the Home Screen icon travels inside it.
icon = base64.b64encode((ROOT / "apple-touch-icon.png").read_bytes()).decode()
html = html.replace('href="apple-touch-icon.png"', 'href="data:image/png;base64,' + icon + '"')

DIST.mkdir(exist_ok=True)
files = {
    FOLDER + "/Manager Performance Tracker.html": html,
    FOLDER + "/START HERE - Quick Start Guide.html": (ROOT / "product" / "quick-start-guide.html").read_text(encoding="utf-8"),
    FOLDER + "/License.txt": (ROOT / "product" / "LICENSE.txt").read_text(encoding="utf-8"),
}
out = DIST / "Manager-Performance-Tracker.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for name, content in files.items():
        z.writestr(name, content)
print("Built", out, "(%d KB)" % (out.stat().st_size // 1024))
