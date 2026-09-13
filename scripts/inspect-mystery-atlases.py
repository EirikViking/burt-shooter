"""Inspect original RGBA atlases without changing a single image pixel."""
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = {}
invalid = []
for path in sorted((root / 'public/art/mysteries').glob('*.png')):
    image = Image.open(path)
    if image.mode != 'RGBA':
        invalid.append(dict(id=path.stem, reason='No genuine alpha channel'))
        continue
    pixels = np.asarray(image)
    alpha = pixels[:, :, 3]
    count, labels, stats, centroids = cv2.connectedComponentsWithStats((alpha > 16).astype('uint8'), 8)
    parts = {}
    assignments = {}
    for i in range(1, count):
        x, y, w, h, area = map(int, stats[i])
        if area < 1000:
            continue
        cx, cy = centroids[i]
        slot = ('top' if cy < image.height / 2 else 'bottom') + ('Left' if cx < image.width / 2 else 'Right')
        assignments[i] = slot
        px, py = max(0, x - 4), max(0, y - 4)
        right, bottom = min(image.width, x + w + 4), min(image.height, y + h + 4)
        if slot in parts:
            # Fractured creatures deliberately have detached slivers around a
            # component. Preserve them within the inspected quadrant's frame.
            ox, oy, ow, oh = parts[slot]
            px, py, right, bottom = min(px, ox), min(py, oy), max(right, ox + ow), max(bottom, oy + oh)
        parts[slot] = [px, py, right - px, bottom - py]
    if len(parts) != 4:
        invalid.append(dict(id=path.stem, reason='Expected four isolated functional components', frames=parts))
        continue
    edge = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
    if np.any(edge > 16):
        invalid.append(dict(id=path.stem, reason='Visible pixels touch the atlas edge'))
        continue
    contaminated = []
    for slot, (x, y, w, h) in parts.items():
        for label, other_slot in assignments.items():
            if slot != other_slot:
                foreign_pixels = int(np.count_nonzero(labels[y:y+h, x:x+w] == label))
                if foreign_pixels > 16:
                    contaminated.append(dict(frame=slot, foreign=other_slot, pixels=foreign_pixels))
    if contaminated:
        invalid.append(dict(id=path.stem, reason='Another component appears inside the rectangular runtime frame', regions=contaminated))
        continue
    manifest[path.stem] = dict(url=f'art/mysteries/{path.name}', width=image.width, height=image.height,
        bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), frames=parts)
target = root / 'src/config/MysteryAtlases.json'
target.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'atlases': len(manifest), 'bytes': sum(row['bytes'] for row in manifest.values()), 'manifest': str(target)}))
if invalid:
    print(json.dumps({'rejectedAtlases': invalid}))
    raise SystemExit(1)
