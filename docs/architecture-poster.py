#!/usr/bin/env python3
# Generates a futuristic dark-theme architecture poster (4:5) as SVG/HTML.
import html

W, H = 1600, 2000
CX = W // 2

# palette
BG = "#05080f"
TXT = "#eaf2ff"
MUT = "#90a0c4"
CYAN = "#22d3ee"
BLUE = "#3b82f6"
PURP = "#b15cff"
ORNG = "#ff9d3c"
GREEN = "#34d399"

parts = []

def esc(s):
    return html.escape(str(s))

# ---------- defs ----------
accents = {"cyan": CYAN, "blue": BLUE, "purp": PURP, "orng": ORNG, "green": GREEN}
glow_filters = ""
for name, col in accents.items():
    glow_filters += f'''
  <filter id="glow-{name}" x="-60%" y="-60%" width="220%" height="220%">
    <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="{col}" flood-opacity="0.85"/>
  </filter>
  <filter id="glowbig-{name}" x="-80%" y="-80%" width="260%" height="260%">
    <feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="{col}" flood-opacity="0.9"/>
  </filter>'''

grads = ""
for name, col in accents.items():
    grads += f'''
  <linearGradient id="panel-{name}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{col}" stop-opacity="0.20"/>
    <stop offset="0.5" stop-color="{col}" stop-opacity="0.06"/>
    <stop offset="1" stop-color="#0b1220" stop-opacity="0.55"/>
  </linearGradient>'''

defs = f'''<defs>
  <radialGradient id="bgglow1" cx="0.2" cy="0.1" r="0.7">
    <stop offset="0" stop-color="#0e2a4d" stop-opacity="0.9"/>
    <stop offset="1" stop-color="{BG}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="bgglow2" cx="0.85" cy="0.85" r="0.7">
    <stop offset="0" stop-color="#2a124d" stop-opacity="0.85"/>
    <stop offset="1" stop-color="{BG}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
    <path d="M48 0H0V48" fill="none" stroke="#1de0ff" stroke-opacity="0.05" stroke-width="1"/>
  </pattern>
  <filter id="softblur" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="5"/>
  </filter>
  <filter id="cardshadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.55"/>
  </filter>
  {glow_filters}
  {grads}
  <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{CYAN}"/>
    <stop offset="0.5" stop-color="#7dd3fc"/>
    <stop offset="1" stop-color="{PURP}"/>
  </linearGradient>
</defs>'''

# ---------- background ----------
parts.append(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
parts.append(f'<rect width="{W}" height="{H}" fill="url(#grid)"/>')
parts.append(f'<rect width="{W}" height="{H}" fill="url(#bgglow1)"/>')
parts.append(f'<rect width="{W}" height="{H}" fill="url(#bgglow2)"/>')

FONT = "'Inter','Helvetica Neue',Arial,sans-serif"

def text(x, y, s, size, fill=TXT, weight=600, anchor="middle", spacing=0, opacity=1, mono=False):
    fam = "'SFMono-Regular','Menlo',monospace" if mono else FONT
    ls = f' letter-spacing="{spacing}"' if spacing else ""
    return (f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"'
            f'{ls} opacity="{opacity}">{esc(s)}</text>')

# ---------- connectors ----------
def connector(x1, y1, x2, y2, col, dashed=False, width=2.6, label=None, lx=None, ly=None):
    dash = ' stroke-dasharray="2 12"' if dashed else ""
    g = []
    # glow underlay
    g.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{col}" stroke-opacity="0.30" '
             f'stroke-width="{width*3.2}" fill="none" filter="url(#softblur)" stroke-linecap="round"/>')
    # bright core
    g.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{col}" stroke-opacity="0.95" '
             f'stroke-width="{width}" fill="none" stroke-linecap="round"{dash}/>')
    # endpoint node dot
    g.append(f'<circle cx="{x2}" cy="{y2}" r="5" fill="{col}" filter="url(#glow-{colname(col)})"/>')
    if label:
        g.append(text(lx, ly, label, 17, fill=col, weight=600, mono=True))
    return "".join(g)

def colname(col):
    for n, c in accents.items():
        if c == col:
            return n
    return "cyan"

# ---------- panel ----------
def panel(x, y, w, h, accent, lines, icon=None, big=False, rx=22, dim=False):
    """lines: list of (text, size, weight, fill)"""
    name = colname(accent)
    glow = f"glowbig-{name}" if big else f"glow-{name}"
    op = 0.55 if dim else 1.0
    g = [f'<g opacity="{op}">']
    g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
             f'fill="#0a0f1c" filter="url(#cardshadow)"/>')
    g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
             f'fill="url(#panel-{name})" stroke="{accent}" stroke-opacity="0.9" '
             f'stroke-width="{2.4 if big else 1.6}" filter="url(#{glow})"/>')
    # top highlight
    g.append(f'<rect x="{x+14}" y="{y+8}" width="{w-28}" height="2" rx="1" '
             f'fill="#ffffff" opacity="0.18"/>')
    # icon
    tx = x + w/2
    icon_h = 0
    if icon:
        g.append(icon(x + w/2, y + 40, accent))
        icon_h = 56
    # text lines
    cy = y + (icon_h + 30 if icon else h/2 - (len(lines)*11))
    for (s, size, weight, fill) in lines:
        g.append(text(tx, cy, s, size, fill=fill, weight=weight))
        cy += size + 8
    g.append('</g>')
    return "".join(g)

# ---------- minimal line icons ----------
def ic_user(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.4" fill="none" filter="url(#glow-{colname(c)})">'
            f'<circle cx="{cx}" cy="{cy-6}" r="9"/>'
            f'<path d="M{cx-16} {cy+18} q16 -22 32 0" stroke-linecap="round"/></g>')

def ic_code(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.6" fill="none" stroke-linecap="round" '
            f'stroke-linejoin="round" filter="url(#glow-{colname(c)})">'
            f'<path d="M{cx-16} {cy-9} L{cx-26} {cy} L{cx-16} {cy+9}"/>'
            f'<path d="M{cx+16} {cy-9} L{cx+26} {cy} L{cx+16} {cy+9}"/>'
            f'<path d="M{cx+4} {cy-12} L{cx-4} {cy+12}"/></g>')

def ic_api(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.4" fill="none" filter="url(#glow-{colname(c)})">'
            f'<rect x="{cx-20}" y="{cy-12}" width="40" height="24" rx="6"/>'
            f'<circle cx="{cx-9}" cy="{cy}" r="2.6" fill="{c}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="2.6" fill="{c}"/>'
            f'<circle cx="{cx+9}" cy="{cy}" r="2.6" fill="{c}"/></g>')

def ic_flow(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.4" fill="{BG}" filter="url(#glow-{colname(c)})">'
            f'<circle cx="{cx-18}" cy="{cy}" r="6"/>'
            f'<circle cx="{cx+18}" cy="{cy-12}" r="6"/>'
            f'<circle cx="{cx+18}" cy="{cy+12}" r="6"/>'
            f'<path d="M{cx-12} {cy} L{cx+12} {cy-12} M{cx-12} {cy} L{cx+12} {cy+12}" '
            f'fill="none"/></g>')

def ic_search(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.4" fill="none" stroke-linecap="round" '
            f'filter="url(#glow-{colname(c)})">'
            f'<circle cx="{cx-4}" cy="{cy-4}" r="11"/>'
            f'<path d="M{cx+5} {cy+5} L{cx+16} {cy+16}"/></g>')

def ic_chip(cx, cy, c):
    pins = ""
    for dx in (-9, 0, 9):
        pins += f'<path d="M{cx+dx} {cy-22} V{cy-16} M{cx+dx} {cy+16} V{cy+22} M{cx-22} {cy+dx} H{cx-16} M{cx+16} {cy+dx} H{cx+22}"/>'
    return (f'<g stroke="{c}" stroke-width="2.4" fill="none" filter="url(#glow-{colname(c)})">'
            f'<rect x="{cx-16}" y="{cy-16}" width="32" height="32" rx="5"/>'
            f'<rect x="{cx-7}" y="{cy-7}" width="14" height="14" rx="2"/>'
            f'{pins}</g>')

def ic_swap(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.6" fill="none" stroke-linecap="round" '
            f'stroke-linejoin="round" filter="url(#glow-{colname(c)})">'
            f'<path d="M{cx-22} {cy-8} H{cx+14} M{cx+14} {cy-8} l-9 -8 M{cx+14} {cy-8} l-9 8"/>'
            f'<path d="M{cx+22} {cy+8} H{cx-14} M{cx-14} {cy+8} l9 -8 M{cx-14} {cy+8} l9 8"/></g>')

def ic_layers(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.2" fill="none" stroke-linejoin="round" '
            f'filter="url(#glow-{colname(c)})">'
            f'<path d="M{cx} {cy-14} l20 11 l-20 11 l-20 -11 z"/>'
            f'<path d="M{cx-20} {cy+4} l20 11 l20 -11"/></g>')

def ic_db(cx, cy, c):
    return (f'<g stroke="{c}" stroke-width="2.2" fill="none" filter="url(#glow-{colname(c)})">'
            f'<ellipse cx="{cx}" cy="{cy-12}" rx="18" ry="6"/>'
            f'<path d="M{cx-18} {cy-12} V{cy+12} a18 6 0 0 0 36 0 V{cy-12}"/>'
            f'<path d="M{cx-18} {cy} a18 6 0 0 0 36 0"/></g>')

# ================= TITLE =================
parts.append(text(CX, 92, "ENTERPRISE AI PILOT RESCUE KIT", 46, fill="url(#title)", weight=800, spacing=2))
parts.append(text(CX, 132, "SYSTEM ARCHITECTURE", 22, fill=MUT, weight=600, spacing=8))
parts.append(f'<rect x="{CX-150}" y="152" width="300" height="3" rx="1.5" fill="{CYAN}" filter="url(#glow-cyan)"/>')

# ================= NODE GEOMETRY =================
# spine
USER   = (CX-180, 196, 360, 92)
FRONT  = (CX-300, 332, 600, 104)
EXPR   = (CX-320, 480, 640, 116)
# row: retriever | orchestrator | bedrock
RETR   = (96,  656, 360, 132)
ORCH   = (CX-200, 656, 400, 132)
BEDR   = (1144, 648, 372, 150)
SWAP   = (CX-300, 856, 600, 130)
MOCK   = (150, 1056, 600, 360)
ATLAS  = (850, 1056, 600, 360)

def cxw(b): return b[0]+b[2]/2
def cyh(b): return b[1]+b[3]/2

# ----- connectors (draw before panels so glow sits behind) -----
conns = []
conns.append(connector(cxw(USER), USER[1]+USER[3], cxw(FRONT), FRONT[1], CYAN, label="HTTP :3000", lx=CX+150, ly=320))
conns.append(connector(cxw(FRONT), FRONT[1]+FRONT[3], cxw(EXPR), EXPR[1], CYAN, label="fetch JSON", lx=CX+170, ly=470))
conns.append(connector(cxw(EXPR), EXPR[1]+EXPR[3], cxw(ORCH), ORCH[1], BLUE))
conns.append(connector(ORCH[0], cyh(ORCH), RETR[0]+RETR[2], cyh(RETR), BLUE, label="embed → top-k", lx=520, ly=632))
conns.append(connector(ORCH[0]+ORCH[2], cyh(ORCH), BEDR[0], cyh(BEDR), ORNG, width=3.2,
                       label="Converse API · real in BOTH modes", lx=CX+250, ly=636))
conns.append(connector(cxw(ORCH), ORCH[1]+ORCH[3], cxw(SWAP), SWAP[1], PURP))
conns.append(connector(cxw(SWAP)-120, SWAP[1]+SWAP[3], cxw(MOCK), MOCK[1], CYAN, dashed=True,
                       label="USE_REAL_ATLAS = false", lx=cxw(MOCK), ly=1040))
conns.append(connector(cxw(SWAP)+120, SWAP[1]+SWAP[3], cxw(ATLAS), ATLAS[1], GREEN, width=3.2,
                       label="USE_REAL_ATLAS = true", lx=cxw(ATLAS), ly=1040))
parts.extend(conns)

# ----- section labels -----
def seclabel(x, y, s, c):
    return (f'<g>{text(x, y, s, 16, fill=c, weight=700, anchor="start", spacing=4)}'
            f'<circle cx="{x-14}" cy="{y-5}" r="4" fill="{c}" filter="url(#glow-{colname(c)})"/></g>')

parts.append(seclabel(120, 188, "CLIENT", CYAN))
parts.append(seclabel(120, 628, "APPLICATION  ·  node index.js", BLUE))
parts.append(seclabel(120, 1018, "DATA LAYER", PURP))

# ----- panels -----
parts.append(panel(*USER, CYAN, [("User", 24, 700, TXT), ("browser", 16, 500, MUT)], icon=ic_user))
parts.append(panel(*FRONT, CYAN, [("Frontend", 25, 700, TXT),
              ("public/index.html  ·  single HTML, no build", 16, 500, MUT)], icon=ic_code))
parts.append(panel(*EXPR, BLUE, [("Express API", 25, 700, TXT),
              ("POST /api/diagnose   GET /history · /health", 16, 500, MUT)], icon=ic_api))
parts.append(panel(*RETR, BLUE, [("Retriever + Embeddings", 19, 700, TXT),
              ("services/retriever.js", 15, 500, MUT),
              ("utils/embeddings.js", 15, 500, MUT)], icon=ic_search))
parts.append(panel(*ORCH, PURP, [("Diagnosis Orchestrator", 19, 700, TXT),
              ("services/diagnosis.js", 15, 500, MUT)], icon=ic_flow))
parts.append(panel(*BEDR, ORNG, [("Amazon Bedrock", 21, 800, TXT),
              ("Nova Pro", 18, 700, ORNG),
              ("apac.amazon.nova-pro-v1:0", 14, 500, MUT)], icon=ic_chip, big=True))
parts.append(panel(*SWAP, PURP, [("store.js   —   SWAP POINT", 24, 800, TXT),
              ("one interface · one flag", 16, 500, MUT)], icon=ic_swap, big=True))

# ----- MOCK card -----
mx, my, mw, mh = MOCK
parts.append(panel(mx, my, mw, mh, CYAN, [], rx=24, dim=True))
parts.append(text(mx+mw/2, my+46, "MOCK", 26, fill=CYAN, weight=800, spacing=3))
parts.append(text(mx+mw/2, my+72, "USE_REAL_ATLAS = false", 15, fill=MUT, weight=600, mono=True))
parts.append(ic_layers(mx+mw/2, my+118, CYAN))
sub = [("mockStore.js  ·  in-memory", CYAN),
       ("store.local.json  ·  file persistence", BLUE),
       ("JS cosine vector search", MUT)]
yy = my+170
for s, c in sub:
    parts.append(f'<rect x="{mx+40}" y="{yy}" width="{mw-80}" height="44" rx="10" fill="#0c1424" stroke="{c}" stroke-opacity="0.5" stroke-width="1.2"/>')
    parts.append(text(mx+mw/2, yy+28, s, 16, fill=TXT, weight=600))
    yy += 56

# ----- ATLAS card -----
ax, ay, aw, ah = ATLAS
parts.append(panel(ax, ay, aw, ah, GREEN, [], rx=24))
parts.append(text(ax+aw/2, ay+46, "REAL  ·  MongoDB Atlas", 24, fill=GREEN, weight=800, spacing=1))
parts.append(text(ax+aw/2, ay+72, "USE_REAL_ATLAS = true", 15, fill=MUT, weight=600, mono=True))
parts.append(ic_db(ax+aw/2, ay+120, GREEN))
sub2 = [("pilotrescue database", GREEN),
        ("Atlas Vector Search  ·  $vectorSearch", CYAN),
        ("failurePatterns_vec index", MUT)]
yy = ay+170
for s, c in sub2:
    parts.append(f'<rect x="{ax+40}" y="{yy}" width="{aw-80}" height="44" rx="10" fill="#0c1424" stroke="{c}" stroke-opacity="0.5" stroke-width="1.2"/>')
    parts.append(text(ax+aw/2, yy+28, s, 16, fill=TXT, weight=600))
    yy += 56

# ----- collections strip -----
cy0 = 1470
parts.append(text(CX, cy0, "COLLECTIONS  (identical shape in both stores)", 15, fill=MUT, weight=600, spacing=3))
cols = ["pilotProfiles", "failurePatterns", "recommendations", "rescueLogs"]
cw, gap = 300, 24
total = len(cols)*cw + (len(cols)-1)*gap
startx = CX - total/2
for i, name in enumerate(cols):
    x = startx + i*(cw+gap)
    c = [CYAN, PURP, BLUE, GREEN][i]
    parts.append(f'<rect x="{x}" y="{cy0+20}" width="{cw}" height="54" rx="12" fill="url(#panel-{colname(c)})" stroke="{c}" stroke-opacity="0.8" stroke-width="1.4" filter="url(#glow-{colname(c)})"/>')
    parts.append(text(x+cw/2, cy0+53, name, 18, fill=TXT, weight=700, mono=True))

# ----- footer metric chips -----
fy = 1640
chips = [("⚡  node index.js", CYAN),
         ("◎  Bedrock Nova Pro · ~$0.002 / call", ORNG),
         ("⇄  one-line mock ↔ Atlas swap", PURP),
         ("◈  region ap-south-1", GREEN)]
cw2, gap2 = 360, 20
total2 = len(chips)*cw2 + (len(chips)-1)*gap2
sx = CX - total2/2
for i, (s, c) in enumerate(chips):
    x = sx + i*(cw2+gap2)
    parts.append(f'<rect x="{x}" y="{fy}" width="{cw2}" height="58" rx="29" fill="#0a1120" stroke="{c}" stroke-opacity="0.7" stroke-width="1.4" filter="url(#glow-{colname(c)})"/>')
    parts.append(text(x+cw2/2, fy+36, s, 17, fill=TXT, weight=600))

# ----- flow legend -----
ly0 = 1760
items = [("solid", CYAN, "request / data flow"),
         ("dash", CYAN, "mock path"),
         ("solid", GREEN, "real Atlas path"),
         ("solid", ORNG, "Bedrock (both modes)")]
lx = 150
parts.append(text(150, ly0-6, "LEGEND", 15, fill=MUT, weight=700, anchor="start", spacing=4))
ly = ly0 + 24
for kind, c, label in items:
    dash = ' stroke-dasharray="2 8"' if kind == "dash" else ""
    parts.append(f'<path d="M{lx} {ly} h54" stroke="{c}" stroke-width="3" stroke-linecap="round" filter="url(#glow-{colname(c)})"{dash}/>')
    parts.append(text(lx+68, ly+5, label, 16, fill=MUT, weight=500, anchor="start"))
    lx += 330

# ----- repo footer -----
parts.append(text(CX, 1920, "github.com/bhuvana-s/pilot-2-rescue", 18, fill=CYAN, weight=600, mono=True))

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
       f'viewBox="0 0 {W} {H}">{defs}{"".join(parts)}</svg>')

with open("poster.svg", "w") as f:
    f.write(svg)

with open("poster.html", "w") as f:
    f.write(f'<!doctype html><html><head><meta charset="utf-8">'
            f'<style>html,body{{margin:0;padding:0;background:{BG}}}'
            f'svg{{display:block;width:{W}px;height:{H}px}}</style></head>'
            f'<body>{svg}</body></html>')

print("wrote poster.svg and poster.html")
