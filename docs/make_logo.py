from PIL import Image, ImageDraw, ImageFont, ImageFilter

size = 512
img = Image.new('RGBA', (size, size))
draw = ImageDraw.Draw(img)

# Background gradient (dark purple)
for y in range(size):
    r = int(13 + (26-13) * y/size)
    g = int(2 + (10-2) * y/size)
    b = int(33 + (62-33) * y/size)
    draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

# Shield shape (slightly smaller, moved up to leave room for text)
shield_pts = [
    (256, 60),
    (400, 120),
    (400, 260),
    (395, 320),
    (370, 370),
    (310, 415),
    (256, 435),
    (202, 415),
    (142, 370),
    (117, 320),
    (112, 260),
    (112, 120),
]

# Shield gradient fill
shield_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
sd = ImageDraw.Draw(shield_layer)
sd.polygon(shield_pts, fill=(139, 92, 246, 245))
sd.polygon(shield_pts, outline=(167, 139, 250, 150), width=3)

# Inner shield border
inner_pts = [(256, 80), (385, 132), (385, 256), (380, 316),
             (356, 360), (304, 406), (256, 426), (208, 406),
             (156, 360), (132, 316), (127, 256), (127, 132)]
sd.polygon(inner_pts, outline=(167, 139, 250, 100), width=2)

img = Image.alpha_composite(img, shield_layer)

# Check mark (centered in shield, smaller)
draw = ImageDraw.Draw(img)
check_pts = [(200, 250), (245, 295), (320, 195)]
lw = 22  # line width

# Draw check mark with round caps
for i in range(len(check_pts)-1):
    x1, y1 = check_pts[i]
    x2, y2 = check_pts[i+1]
    for t in range(-lw//2, lw//2+1):
        draw.line([(x1+t, y1), (x2+t, y2)], fill=(255, 255, 255, 255), width=1)
    draw.ellipse([x1-lw//2, y1-lw//2, x1+lw//2, y1+lw//2], fill=(255, 255, 255, 255))
    draw.ellipse([x2-lw//2, y2-lw//2, x2+lw//2, y2+lw//2], fill=(255, 255, 255, 255))

# Glow effect
glow_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_layer)
for i in range(len(check_pts)-1):
    x1, y1 = check_pts[i]
    x2, y2 = check_pts[i+1]
    for t in range(-lw//2-4, lw//2+5):
        gd.line([(x1+t, y1), (x2+t, y2)], fill=(255, 255, 255, 50), width=1)
    gd.ellipse([x1-lw//2-4, y1-lw//2-4, x1+lw//2+4, y1+lw//2+4], fill=(255, 255, 255, 50))
    gd.ellipse([x2-lw//2-4, y2-lw//2-4, x2+lw//2+4, y2+lw//2+4], fill=(255, 255, 255, 50))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=8))
img = Image.alpha_composite(img, glow_layer)

# Lock icon (below check mark, inside shield)
draw = ImageDraw.Draw(img)
# Lock body
draw.rounded_rectangle([241, 340, 271, 375], radius=5, fill=(167, 139, 250, 230))
# Lock shackle
draw.arc([246, 325, 266, 348], start=180, end=0, fill=(167, 139, 250, 230), width=5)

# Blockchain dots (row below shield)
for i in range(6):
    x = 140 + i * 46
    opacity = 100 + i * 20 if i < 3 else 200 - (i-3) * 20
    opacity = min(255, max(80, opacity))
    r_val = int(139 * opacity / 255) + 60
    g_val = int(92 * opacity / 255) + 60
    b_val = int(246 * opacity / 255)
    draw.ellipse([x-4, 455-4, x+4, 455+4], fill=(min(255, r_val), min(255, g_val), min(255, b_val), opacity))

# "SENTINEL" text at bottom
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("arialbd.ttf", 42)
except:
    try:
        font = ImageFont.truetype("arial.ttf", 42)
    except:
        font = ImageFont.load_default()

text = "SENTINEL"
spacing = 10
# Measure total width
total_w = 0
for char in text:
    bbox_c = draw.textbbox((0, 0), char, font=font)
    total_w += (bbox_c[2] - bbox_c[0]) + spacing
total_w -= spacing

start_x = (size - total_w) // 2
x = start_x
for char in text:
    draw.text((x, 472), char, fill=(233, 213, 255, 255), font=font)
    bbox_c = draw.textbbox((0, 0), char, font=font)
    x += (bbox_c[2] - bbox_c[0]) + spacing

# Save as RGB (PNG doesn't need alpha for opaque image)
final = Image.new('RGB', (size, size), (13, 2, 33))
final.paste(img, mask=img.split()[3])
final.save('C:/Users/Sabiedu/.qwenpaw/workspaces/hack_1/sentinel/docs/logo.png', 'PNG')
print(f"Logo saved: {final.size}")
