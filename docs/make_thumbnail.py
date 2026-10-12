from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1280, 720
img = Image.new('RGBA', (W, H))
draw = ImageDraw.Draw(img)

# Background gradient (dark purple)
for y in range(H):
    r = int(13 + (26-13) * y/H)
    g = int(2 + (10-2) * y/H)
    b = int(33 + (62-33) * y/H)
    draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

# Shield shape (left side)
shield_pts = [
    (220, 80),
    (340, 130),
    (340, 270),
    (336, 330),
    (315, 380),
    (265, 425),
    (220, 445),
    (175, 425),
    (125, 380),
    (104, 330),
    (100, 270),
    (100, 130),
]

shield_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shield_layer)
sd.polygon(shield_pts, fill=(139, 92, 246, 245))
sd.polygon(shield_pts, outline=(167, 139, 250, 150), width=3)
inner_pts = [(220, 100), (328, 144), (328, 264), (324, 324),
             (306, 370), (262, 412), (220, 430), (178, 412),
             (134, 370), (116, 324), (112, 264), (112, 144)]
sd.polygon(inner_pts, outline=(167, 139, 250, 100), width=2)
img = Image.alpha_composite(img, shield_layer)

# Check mark on shield
draw = ImageDraw.Draw(img)
check_pts = [(160, 255), (200, 295), (275, 195)]
lw = 18
for i in range(len(check_pts)-1):
    x1, y1 = check_pts[i]
    x2, y2 = check_pts[i+1]
    for t in range(-lw//2, lw//2+1):
        draw.line([(x1+t, y1), (x2+t, y2)], fill=(255, 255, 255, 255), width=1)
    draw.ellipse([x1-lw//2, y1-lw//2, x1+lw//2, y1+lw//2], fill=(255, 255, 255, 255))
    draw.ellipse([x2-lw//2, y2-lw//2, x2+lw//2, y2+lw//2], fill=(255, 255, 255, 255))

# Lock icon on shield
draw.rounded_rectangle([207, 345, 233, 375], radius=4, fill=(167, 139, 250, 230))
draw.arc([211, 332, 229, 352], start=180, end=0, fill=(167, 139, 250, 230), width=4)

# Text on right side
draw = ImageDraw.Draw(img)

# Title: "SENTINEL"
try:
    font_big = ImageFont.truetype("arialbd.ttf", 80)
except:
    font_big = ImageFont.truetype("arial.ttf", 80)

try:
    font_sub = ImageFont.truetype("arial.ttf", 36)
except:
    font_sub = ImageFont.load_default()

try:
    font_tag = ImageFont.truetype("arialbd.ttf", 28)
except:
    font_tag = ImageFont.load_default()

# "SENTINEL" title
draw.text((420, 160), "SENTINEL", fill=(233, 213, 255, 255), font=font_big)

# Subtitle
draw.text((420, 270), "On-Chain Guardrails for AI Agents", fill=(196, 181, 253, 255), font=font_sub)

# Monad badge
badge_w, badge_h = 220, 50
draw.rounded_rectangle([420, 340, 420+badge_w, 340+badge_h], radius=8, fill=(139, 92, 246, 200))
draw.text((435, 348), "Monad Testnet", fill=(255, 255, 255, 255), font=font_tag)

# Tagline
try:
    font_tagline = ImageFont.truetype("arialbd.ttf", 44)
except:
    font_tagline = ImageFont.load_default()
draw.text((420, 440), "Agents that can't go rogue.", fill=(167, 139, 250, 255), font=font_tagline)

# EIP-7702 badge
draw.rounded_rectangle([420, 520, 660, 570], radius=8, fill=(167, 139, 250, 180))
try:
    font_small = ImageFont.truetype("arialbd.ttf", 24)
except:
    font_small = ImageFont.load_default()
draw.text((435, 532), "EIP-7702 No-Bypass", fill=(255, 255, 255, 255), font=font_small)

# Save
final = Image.new('RGB', (W, H), (13, 2, 33))
final.paste(img, mask=img.split()[3])
final.save('C:/Users/Sabiedu/.qwenpaw/workspaces/hack_1/sentinel/docs/thumbnail.png', 'PNG')
print(f"Thumbnail saved: {final.size}")
