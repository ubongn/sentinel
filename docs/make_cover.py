from PIL import Image, ImageDraw, ImageFont

W, H = 1000, 420
img = Image.new('RGBA', (W, H))
draw = ImageDraw.Draw(img)

# Background gradient (dark purple, same as thumbnail)
for y in range(H):
    r = int(13 + (26-13) * y/H)
    g = int(2 + (10-2) * y/H)
    b = int(33 + (62-33) * y/H)
    draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

# Shield (left side, scaled for 1000x420)
cx, cy = 175, 210
shield_pts = [
    (cx, cy-140), (cx+95, cy-105), (cx+95, cy-15), (cx+92, cy+40),
    (cx+72, cy+85), (cx+35, cy+120), (cx, cy+135),
    (cx-35, cy+120), (cx-72, cy+85), (cx-92, cy+40),
    (cx-95, cy-15), (cx-95, cy-105),
]
shield_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shield_layer)
sd.polygon(shield_pts, fill=(139, 92, 246, 245))
sd.polygon(shield_pts, outline=(167, 139, 250, 150), width=3)
img = Image.alpha_composite(img, shield_layer)

# Check mark
draw = ImageDraw.Draw(img)
check_pts = [(cx-50, cy), (cx-15, cy+35), (cx+55, cy-45)]
lw = 14
for i in range(len(check_pts)-1):
    x1, y1 = check_pts[i]
    x2, y2 = check_pts[i+1]
    for t in range(-lw//2, lw//2+1):
        draw.line([(x1+t, y1), (x2+t, y2)], fill=(255, 255, 255, 255), width=1)
    draw.ellipse([x1-lw//2, y1-lw//2, x1+lw//2, y1+lw//2], fill=(255, 255, 255, 255))
    draw.ellipse([x2-lw//2, y2-lw//2, x2+lw//2, y2+lw//2], fill=(255, 255, 255, 255))

# Lock icon
draw.rounded_rectangle([cx-13, cy+65, cx+13, cy+95], radius=4, fill=(167, 139, 250, 230))
draw.arc([cx-9, cy+52, cx+9, cy+72], start=180, end=0, fill=(167, 139, 250, 230), width=4)

# Fonts
def load(name, size):
    try:
        return ImageFont.truetype(name, size)
    except Exception:
        return ImageFont.load_default()

font_big = load("arialbd.ttf", 62)
font_sub = load("arial.ttf", 28)
font_tag = load("arialbd.ttf", 22)
font_tagline = load("arialbd.ttf", 34)

X = 320
# SENTINEL
draw.text((X, 70), "SENTINEL", fill=(233, 213, 255, 255), font=font_big)
# Subtitle
draw.text((X, 150), "On-Chain Guardrails for AI Agents", fill=(196, 181, 253, 255), font=font_sub)
# Monad badge
draw.rounded_rectangle([X, 200, X+175, 240], radius=8, fill=(139, 92, 246, 200))
draw.text((X+14, 207), "Monad Testnet", fill=(255, 255, 255, 255), font=font_tag)
# EIP-7702 badge
draw.rounded_rectangle([X+190, 200, X+415, 240], radius=8, fill=(167, 139, 250, 180))
draw.text((X+204, 207), "EIP-7702 No-Bypass", fill=(255, 255, 255, 255), font=font_tag)
# Tagline
draw.text((X, 275), "Agents that can't go rogue.", fill=(167, 139, 250, 255), font=font_tagline)

final = Image.new('RGB', (W, H), (13, 2, 33))
final.paste(img, mask=img.split()[3])
final.save('C:/Users/Sabiedu/.qwenpaw/workspaces/hack_1/sentinel/docs/cover.png', 'PNG')
print(f"Cover saved: {final.size}")
