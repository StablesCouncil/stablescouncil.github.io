import re

with open('qr_clean.svg', encoding='utf-8') as f:
    svg = f.read().strip()

# Make width/height responsive (CSS will control via container)
svg = re.sub(r'width="[^"]+"', 'width="100%"', svg, count=1)
svg = re.sub(r'height="[^"]+"', 'height="100%"', svg, count=1)

with open('qr_embed.txt', 'w', encoding='utf-8') as f:
    f.write(svg)

print('Done. Length:', len(svg))
print('First 200 chars:', svg[:200])
