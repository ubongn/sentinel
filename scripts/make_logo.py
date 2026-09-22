from PIL import Image, ImageDraw, ImageFont

size = 512
img = Image.new('RGBA', (size, size), (124, 58, 237, 255))
draw = ImageDraw.Draw(img)

# Rounded corners mask
mask = Image.new('L', (size, size), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle([0, 0, size-1, size-1], radius=96, fill=255)

# Shield (same shape as logo.svg — scaled to 512px)
cx, cy = 256, 200
scale = 4.5

# Outer shield path: M24 4L6 12v12c0 10 8 18.5 18 20 10-1.5 18-10 18-20V12L24 4z
# Scaled from 48x48 viewBox
def sx(x): return int(cx + (x - 24) * scale)
def sy(y): return int(cy + (y - 24) * scale)

outer = [
    (sx(24), sy(4)),   # top
    (sx(6), sy(12)),   # left top
    (sx(6), sy(24)),   # left mid (v12 → 12+12=24)
    (sx(24), sy(44)),  # bottom (24+20=44)
    (sx(42), sy(24)),  # right mid
    (sx(42), sy(12)),  # right top
]
draw.polygon(outer, fill=(109, 40, 217, 255))

# Inner shield: M24 10L12 15v7c0 7 5.3 12.5 12 13.5 6.7-1 12-6.5 12-13.5v-7L24 10z
inner = [
    (sx(24), sy(10)),
    (sx(12), sy(15)),
    (sx(12), sy(22)),
    (sx(24), sy(35.5)),
    (sx(36), sy(22)),
    (sx(36), sy(15)),
]
draw.polygon(inner, fill=(139, 92, 246, 255))

# Checkmark: M18 24l4 4 8-8
draw.line([(sx(18), sy(24)), (sx(22), sy(28))], fill='white', width=int(2.5*scale))
draw.line([(sx(22), sy(28)), (sx(30), sy(20))], fill='white', width=int(2.5*scale))

# Text
try:
    font_large = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 52)
    font_small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
except:
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()

draw.text((256, 420), 'Sentinel', fill='white', font=font_large, anchor='mm')
draw.text((256, 455), 'AI AGENT GUARDRAILS', fill=(255, 255, 255, 180), font=font_small, anchor='mm')

# Apply mask
img.putalpha(mask)
img.save(r'C:\Users\Sabiedu\.qwenpaw\workspaces\hack_1\sentinel\sentinel-icon.png', 'PNG')
print('DONE: sentinel-icon.png (unified logo)')
