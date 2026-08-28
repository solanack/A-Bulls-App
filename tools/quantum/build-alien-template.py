import json
import math
import random
from pathlib import Path

SRC = Path("assets/quantum/source-alien/alien-baked-vertices.json")
OUT_JSON = Path("assets/quantum/generated/alien-head-template.json")
OUT_MJS = Path("js/quantum/alien-head-template.mjs")

random.seed(731991)

data = json.loads(SRC.read_text())
vertices = data["vertices"]

xmin, ymin, zmin = data["bounds"]["min"]
xmax, ymax, zmax = data["bounds"]["max"]

cx = (xmin + xmax) * 0.5
cy = (ymin + ymax) * 0.5
cz = (zmin + zmax) * 0.5

xr = xmax - xmin
yr = ymax - ymin
zr = zmax - zmin

def normalized(v):
    x, y, z = v

    # normalized model coordinates:
    # x: -1..1 left/right
    # y: -1..1 chin/top
    # z: -1..1 back/front
    nx = (x - cx) / (xr * 0.5)
    ny = (y - cy) / (yr * 0.5)
    # Alien.glb faces toward -Z after its baked node transform.
    # Flip Z here so normalized +Z means anatomical FRONT.
    nz = -(z - cz) / (zr * 0.5)

    return nx, ny, nz

def rotated_eye(nx, ny, side):
    """
    Large Grey-alien almond eye region.

    side:
      -1 left
      +1 right
    """
    ex = side * 0.39
    ey = 0.20

    dx = nx - ex
    dy = ny - ey

    # outer corners slightly higher than inner corners
    angle = side * 0.16
    ca = math.cos(angle)
    sa = math.sin(angle)

    rx = dx * ca - dy * sa
    ry = dx * sa + dy * ca

    return (rx / 0.34) ** 2 + (ry / 0.20) ** 2

def anatomy_role(nx, ny, nz):
    """
    1 surface
    3 eye rim
    4 nose
    5 mouth
    6 silhouette
    """

    left_eye = rotated_eye(nx, ny, -1)
    right_eye = rotated_eye(nx, ny, +1)
    eye = min(left_eye, right_eye)

    # Eye cavity interior:
    # deliberately rejected later.
    if nz > 0.08 and eye < 0.72:
        return 0

    # Eye rims get very high density.
    if nz > 0.02 and 0.72 <= eye <= 1.30:
        return 3

    # Narrow bridge / small nose.
    if (
        nz > 0.20
        and abs(nx) < 0.13
        and -0.18 < ny < 0.23
    ):
        return 4

    # Small tight mouth.
    if (
        nz > 0.18
        and abs(nx) < 0.25
        and -0.53 < ny < -0.30
    ):
        return 5

    # Strong silhouette density.
    if abs(nx) > 0.78:
        return 6

    return 1

def keep_probability(role, nx, ny, nz):
    """
    Anatomy-weighted sampling.
    """

    if role == 3:       # eye rim
        return 0.95

    if role == 4:       # nose
        return 0.82

    if role == 5:       # mouth
        return 0.90

    if role == 6:       # silhouette
        return 0.65

    # Front facial plane gets more detail.
    front = max(0.0, min(1.0, (nz + 0.05) / 0.95))

    # Cranium can be slightly less dense than features.
    upper = max(0.0, min(1.0, (ny - 0.25) / 0.75))

    return 0.075 + front * 0.13 - upper * 0.025

samples = []

for vertex in vertices:
    nx, ny, nz = normalized(vertex)

    role = anatomy_role(nx, ny, nz)

    # Deep empty almond eye sockets.
    if role == 0:
        continue

    probability = keep_probability(role, nx, ny, nz)

    if random.random() > probability:
        continue

    # Map model into Particle Field coordinates.
    #
    # Slightly exaggerate classic Grey proportions:
    # broad cranium, long face, substantial skull depth.
    x = nx * 39.0
    y = ny * 50.0
    z = nz * 38.0

    # Push upper cranium wider/deeper.
    upper = max(0.0, min(1.0, (ny - 0.18) / 0.82))
    x *= 1.0 + upper * 0.12
    z *= 1.0 + upper * 0.15

    # Narrow lower jaw gradually.
    if ny < -0.18:
        lower = max(0.0, min(1.0, (-ny - 0.18) / 0.82))
        x *= 1.0 - lower * 0.22

    samples.append((x, y, z, role))

print("INITIAL SAMPLES:", len(samples))

# Cap production template while preserving important anatomy.
TARGET = 18000

if len(samples) > TARGET:
    priority = {
        3: 5.0,  # eye
        5: 4.2,  # mouth
        4: 3.7,  # nose
        6: 2.8,  # silhouette
        1: 1.0,
    }

    weighted = []

    for sample in samples:
        role = sample[3]
        score = random.random() ** (1.0 / priority.get(role, 1.0))
        weighted.append((score, sample))

    weighted.sort(key=lambda item: item[0], reverse=True)
    samples = [item[1] for item in weighted[:TARGET]]

positions = []
roles = []

counts = {}

for x, y, z, role in samples:
    positions.extend([
        round(x, 4),
        round(y, 4),
        round(z, 4)
    ])
    roles.append(role)
    counts[role] = counts.get(role, 0) + 1

payload = {
    "version": 2,
    "source": "Grey Alien Head 3D mesh",
    "coordinateSystem": {
        "x": "left-right",
        "y": "vertical",
        "z": "front-back-positive-front"
    },
    "count": len(samples),
    "positions": positions,
    "roles": roles
}

OUT_JSON.write_text(
    json.dumps(payload, separators=(",", ":"))
)

mjs = f"""/*
  AUTO-GENERATED QUANTUM ALIEN HEAD TEMPLATE

  Source geometry is used only during development.
  Production loads only these sampled coordinates.

  Role map:
    1 surface
    3 eye rim
    4 nose
    5 mouth
    6 silhouette
*/

export const ALIEN_HEAD_TEMPLATE = Object.freeze({{
  version: 2,
  count: {len(samples)},

  positions: new Float32Array(
    {json.dumps(positions, separators=(",", ":"))}
  ),

  roles: new Uint8Array(
    {json.dumps(roles, separators=(",", ":"))}
  )
}});
"""

OUT_MJS.write_text(mjs)

print()
print("=== QUANTUM ALIEN TEMPLATE ===")
print("TOTAL POINTS:", len(samples))
print("SURFACE:", counts.get(1, 0))
print("EYE RIM:", counts.get(3, 0))
print("NOSE:", counts.get(4, 0))
print("MOUTH:", counts.get(5, 0))
print("SILHOUETTE:", counts.get(6, 0))

print()
print("JSON:", OUT_JSON)
print("MODULE:", OUT_MJS)

print()
print("SIZE JSON:", round(OUT_JSON.stat().st_size / 1024, 1), "KB")
print("SIZE MJS:", round(OUT_MJS.stat().st_size / 1024, 1), "KB")

print()
print("REAL MESH -> QUANTUM TEMPLATE COMPLETE")
