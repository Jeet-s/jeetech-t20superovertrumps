"""Bakes the art sheets in assets/art into single sprites in assets/ui (run: /usr/bin/python3 scripts/dev/bake-ui.py)."""
from PIL import Image, ImageDraw, ImageFilter
import math, os
A = "assets/art/"
O = "assets/ui/"
os.makedirs(O, exist_ok=True)

def crop(name, box, out, pad=4):
    im = Image.open(A + name).convert("RGBA").crop(box)
    w, h = im.size
    s = max(w, h) + pad * 2
    c = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    c.alpha_composite(im, ((s - w) // 2, (s - h) // 2))
    c.save(O + out, optimize=True)

# ball tracker pips: won (red ball), lost (blue shield), tie/pot (gold diamond), pending (hollow ring)
for box, n in [((0, 0, 120, 134), "pip_won"), ((134, 0, 252, 134), "pip_lost"), ((262, 0, 388, 134), "pip_tie"), ((394, 0, 512, 134), "pip_pending")]:
    crop("ball_pip_set.png", box, n + ".png")
# currency / reward icons
for box, n in [((2, 206, 112, 320), "icon_coin"), ((120, 206, 220, 314), "icon_gem"), ((219, 200, 304, 314), "icon_star"), ((306, 190, 396, 322), "icon_pack"), ((396, 194, 512, 322), "icon_trophy")]:
    crop("icon_rewards.png", box, n + ".png")
# the star's crop keeps a sliver of the gem: drop the green pixels at its left edge
st = Image.open(O + "icon_star.png").convert("RGBA")
sp = st.load()
for y in range(st.size[1]):
    for x in range(st.size[0] // 3):
        r, g, b, a = sp[x, y]
        if a and (g > r + 10 or (r < 90 and g < 90)):
            sp[x, y] = (0, 0, 0, 0)
st.save(O + "icon_star.png", optimize=True)

# power-card medallions: the Review medallion as drawn, plus an empty medallion (inner disk repainted)
pc = Image.open(A + "icon_power_cards.png").convert("RGBA")
rev = pc.crop((134, 0, 376, 248))
rev.save(O + "pw_review.png", optimize=True)
empty = rev.copy()
cx, cy, R = 255 - 134, 123, 99
px = empty.load()
for y in range(empty.size[1]):
    for x in range(empty.size[0]):
        d = math.hypot(x - cx, y - cy)
        if d < R:
            t = d / R
            px[x, y] = (int(30 - 20 * t), int(62 - 30 * t), int(104 - 40 * t), 255)
empty.save(O + "pw_empty.png", optimize=True)
# Free Hit: the lacquered red ball (from the foil art) set into the medallion
foil = Image.open(A + "rarity_foil_overlay.png").convert("RGBA")
fw, fh = foil.size
br = 158
ball = foil.crop((fw // 2 - br, fh // 2 - br, fw // 2 + br, fh // 2 + br))
mask = Image.new("L", ball.size, 0)
ImageDraw.Draw(mask).ellipse((6, 6, 2 * br - 6, 2 * br - 6), fill=255)
ball.putalpha(mask)
ball = ball.resize((150, 150), Image.LANCZOS)
fh_img = empty.copy()
fh_img.alpha_composite(ball, (cx - 75, cy - 75))
fh_img.save(O + "pw_freehit.png", optimize=True)
ball.save(O + "ball.png", optimize=True)
# Powerplay: the flame from the right medallion, re-centred
flame = pc.crop((436, 40, 512, 210))
fp = flame.load()
for y in range(flame.size[1]):
    for x in range(flame.size[0]):
        r, g, b, a = fp[x, y]
        if not (r > 140 and r > b + 60):  # keep only the orange flame, drop the rim and the navy disk
            fp[x, y] = (0, 0, 0, 0)
pp = empty.copy()
fl = flame.resize((int(flame.size[0] * 0.95), int(flame.size[1] * 0.95)), Image.LANCZOS)
pp.alpha_composite(fl, (cx - fl.size[0] // 2 + 6, cy - fl.size[1] // 2))
pp.save(O + "pw_powerplay.png", optimize=True)
print("baked", sorted(os.listdir(O)))
