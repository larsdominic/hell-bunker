#!/bin/bash
# Rebuilds the embedded Freedoom art in index.html (between the ART-BEGIN / ART-END markers).
# Usage: tools/build-art.sh [freedoom-checkout]   (clones github.com/freedoom/freedoom if none given)
# Needs: git, python3, Google Chrome.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
game="$here/../index.html"
work="$(mktemp -d)"
trap 'kill ${server:-} 2>/dev/null || true; rm -rf "$work"' EXIT

fd="${1:-}"
if [ -z "$fd" ]; then
  fd="$work/freedoom"
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/freedoom/freedoom.git "$fd"
  git -C "$fd" sparse-checkout set patches flats sprites lumps/textures  # buildcfg.txt comes with the root
fi

# textures.cfg -> tex.json: { NAME: [width, height, [[patch, x, y], ...]] }
python3 -I - "$fd/lumps/textures/textures.cfg" > "$work/tex.json" <<'PY'
import sys, re, json
tex, cur = {}, None
for line in open(sys.argv[1]):
    line = line.split(";")[0].rstrip()
    if not line.strip() or line.startswith("#"): continue
    m = re.match(r"^\s*\*\s+(\w+)\s+(-?\d+)\s+(-?\d+)", line)
    if m and cur: tex[cur][2].append([m.group(1).lower(), int(m.group(2)), int(m.group(3))]); continue
    m = re.match(r"^(\w+)\s+(\d+)\s+(\d+)", line)
    if m: cur = m.group(1); tex[cur] = [int(m.group(2)), int(m.group(3)), []]
print(json.dumps(tex))
PY

# buildcfg.txt [sprites] -> offs.json: { name: [left, top] }
python3 -I - "$fd/buildcfg.txt" > "$work/offs.json" <<'PY'
import sys, re, json
offs, on = {}, False
for line in open(sys.argv[1]):
    if line.startswith("["): on = line.startswith("[sprites]"); continue
    m = on and re.match(r"^(\w+)\s+(-?\d+)\s+(-?\d+)", line)
    if m: offs[m.group(1).lower()] = [int(m.group(2)), int(m.group(3))]
print(json.dumps(offs))
PY

# Serve the checkout (canvas export needs http, not file://)
mkdir -p "$work/site"
for d in patches flats sprites; do ln -s "$(cd "$fd" && pwd)/$d" "$work/site/$d"; done
cp "$work/tex.json" "$work/offs.json" "$here/build-art.html" "$work/site/"
port=$((20000 + RANDOM % 20000))
python3 -m http.server "$port" --bind 127.0.0.1 --directory "$work/site" >/dev/null 2>&1 &
server=$!; disown
sleep 1

chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$chrome" --headless=new --disable-gpu --virtual-time-budget=20000 --dump-dom \
  "http://127.0.0.1:$port/build-art.html" 2>/dev/null > "$work/dom.html"

python3 -I - "$work/dom.html" "$game" <<'PY'
import sys, re, html, json
dom = open(sys.argv[1]).read()
m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
data = html.unescape(m.group(1)) if m else ""
if not data.startswith("{"): sys.exit("art build failed: " + data[:200])
json.loads(data)
game = open(sys.argv[2]).read()
new, n = re.subn(r"(/\* ART-BEGIN \*/).*?(/\* ART-END \*/)", lambda m: m.group(1) + "\nconst ART = " + data + ";\n" + m.group(2), game, flags=re.S)
if n != 1: sys.exit("ART markers not found in index.html")
open(sys.argv[2], "w").write(new)
print(f"art: {len(data) // 1024} KB embedded")
PY
