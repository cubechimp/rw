#!/usr/bin/env python3
"""Build world.json for Ryukyu World from MLIT N03 municipality polygons.
usage: process.py <geojson_dir> <out_json>"""
import sys, json, glob, base64, math
import numpy as np
import shapely
from shapely.geometry import shape, Point, Polygon, MultiPolygon
from shapely.ops import nearest_points
from PIL import Image, ImageDraw
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
R = 6364600.0            # mean radius of curvature at 26N (sqrt(M*N))
LON0, LAT0 = 127.75, 26.25

def tm(lon, lat):
    lam = np.radians(lon - LON0); phi = np.radians(lat)
    B = np.cos(phi) * np.sin(lam)
    x = R * np.arctanh(B)
    y = R * (np.arctan2(np.tan(phi), np.cos(lam)) - math.radians(LAT0))
    return x, -y          # game coords: x east, z south

def tm_inv(x, z):
    D = -z / R + math.radians(LAT0)
    phi = np.arcsin(np.sin(D) / np.cosh(x / R))
    lam = np.arctan2(np.sinh(x / R), np.cos(D))
    return np.degrees(lam) + LON0, np.degrees(phi)

def proj(geom):
    def f(c):
        x, z = tm(c[:, 0], c[:, 1]); return np.column_stack([x, z])
    return shapely.transform(geom, f)

# ---------- load ----------
munis = {}
for fn in sorted(glob.glob(SRC + '/*.json')):
    d = json.load(open(fn))
    for ft in d['features']:
        code = ft['properties']['N03_007']
        g = shapely.make_valid(proj(shape(ft['geometry'])))
        munis.setdefault(code, []).append(g)
munis = {k: shapely.union_all(v) for k, v in munis.items()}
print('municipalities', len(munis))

land = shapely.union_all(list(munis.values())).buffer(1.5).buffer(-1.5)
def polys(g):
    if g.geom_type == 'Polygon': return [g]
    return [p for p in g.geoms if p.geom_type == 'Polygon']
def clean(g, min_area, min_hole):
    out = []
    for p in polys(g):
        if p.area < min_area: continue
        holes = [h for h in p.interiors if Polygon(h).area >= min_hole]
        out.append(Polygon(p.exterior, holes))
    return MultiPolygon(out)
land = clean(land, 600, 250000)
print('land km2', land.area / 1e6, 'islands', len(land.geoms), 'verts', shapely.get_num_coordinates(land))

fine = clean(land.simplify(5.0, preserve_topology=True), 600, 250000)
coarse = clean(land.simplify(90.0, preserve_topology=True), 40000, 1e9)
print('fine verts', shapely.get_num_coordinates(fine), 'islands', len(fine.geoms))
print('coarse verts', shapely.get_num_coordinates(coarse), 'islands', len(coarse.geoms))

def ring_area(c):
    x, z = c[:, 0], c[:, 1]
    return 0.5 * np.sum(x * np.roll(z, -1) - np.roll(x, -1) * z)
def enc_ring(ring, positive):
    c = np.round(np.asarray(ring.coords)[:-1]).astype(np.int64)
    keep = np.ones(len(c), bool); keep[1:] = np.any(c[1:] != c[:-1], axis=1)
    c = c[keep]
    if len(c) < 3: return None
    if (ring_area(c.astype(float)) > 0) != positive: c = c[::-1]
    d = np.diff(c, axis=0)
    return [int(c[0, 0]), int(c[0, 1])] + d.flatten().tolist()
def enc(g):
    rings = []
    for p in polys(g):
        r = enc_ring(p.exterior, True)
        if r: rings.append(r)
        for h in p.interiors:
            r = enc_ring(h, False)
            if r: rings.append(r)
    return rings

# ---------- raster ----------
PX = 128.0; TILE = 32; SS = 2
minx, minz, maxx, maxz = land.bounds
T = PX * TILE
X0 = math.floor((minx - 3000) / T) * T; Z0 = math.floor((minz - 3000) / T) * T
W = int(math.ceil((maxx + 3000 - X0) / T)) * TILE; H = int(math.ceil((maxz + 3000 - Z0) / T)) * TILE
print('raster', W, H, 'origin', X0, Z0)
img = Image.new('L', (W * SS, H * SS), 0); dr = ImageDraw.Draw(img)
s = SS / PX
for p in polys(land):
    c = np.asarray(p.exterior.coords)
    dr.polygon(list(zip((c[:, 0] - X0) * s, (c[:, 1] - Z0) * s)), fill=255)
    for h in p.interiors:
        c = np.asarray(h.coords)
        dr.polygon(list(zip((c[:, 0] - X0) * s, (c[:, 1] - Z0) * s)), fill=0)
frac = np.asarray(img, np.float32).reshape(H, SS, W, SS).mean(axis=(1, 3)) / 255.0
del img
mask = frac >= 0.4
din = ndimage.distance_transform_edt(mask).astype(np.float32) * PX
dout = ndimage.distance_transform_edt(~mask).astype(np.float32) * PX

jj, ii = np.mgrid[0:H, 0:W].astype(np.float32)
wx = X0 + (ii + 0.5) * PX; wz = Z0 + (jj + 0.5) * PX
del ii, jj
lon, lat = tm_inv(wx.astype(np.float64), wz.astype(np.float64))
lon = lon.astype(np.float32); lat = lat.astype(np.float32)

def waves(wl, seed):
    rng = np.random.default_rng(seed); out = np.zeros_like(wx)
    for k in range(5):
        a = rng.uniform(0, math.pi); l = wl * rng.uniform(0.7, 1.4)
        u = (wx * math.cos(a) + wz * math.sin(a)) * (2 * math.pi / l) + rng.uniform(0, 6.28)
        v = (-wx * math.sin(a) + wz * math.cos(a)) * (2 * math.pi / (l * 1.3)) + rng.uniform(0, 6.28)
        out += np.sin(u) * np.cos(v)
    return out / 5.0 * 1.6       # roughly -1..1

# regional relief amplitude (metres), rough match to the real islands
amp = np.full_like(wx, 120.0)
def box(lo0, lo1, la0, la1, a):
    m = (lon >= lo0) & (lon < lo1) & (lat >= la0) & (lat < la1); amp[m] = a
main = (lon > 127.6) & (lon < 128.4) & (lat > 26.0) & (lat < 26.95)
amp[main] = np.interp(lat[main], [26.05, 26.3, 26.42, 26.55, 26.7, 26.9], [150, 150, 230, 380, 470, 380])
box(127.2, 127.5, 26.0, 26.35, 260)     # Kerama
box(126.7, 127.0, 26.2, 26.45, 330)     # Kume
box(125.0, 125.6, 24.6, 25.0, 95)       # Miyako
box(124.6, 124.8, 24.6, 24.75, 40)      # Tarama
box(124.0, 124.4, 24.3, 24.65, 470)     # Ishigaki
box(123.6, 124.0, 24.2, 24.5, 480)      # Iriomote
box(124.05, 124.12, 24.3, 24.36, 25)    # Taketomi (flat)
box(123.7, 123.85, 24.0, 24.1, 60)      # Hateruma
box(122.9, 123.1, 24.4, 24.5, 220)      # Yonaguni
box(131.1, 131.4, 25.7, 26.0, 70)       # Daito
box(127.7, 127.85, 26.68, 26.75, 30)    # Ie (flat, peak added below)
box(127.9, 128.1, 27.0, 27.15, 260)     # Iheya / Izena
box(127.2, 127.3, 26.55, 26.62, 90)     # Aguni

t = 1.0 - np.exp(-din / 1500.0)
n1 = waves(5200, 1); n2 = waves(1700, 2); n3 = waves(650, 3)
Hm = amp * np.power(t, 0.85) * (0.62 + 0.38 * n1) + amp * t * (0.16 * n2 + 0.07 * n3)
Hm = np.maximum(Hm, 0) + np.minimum(din, 400) * 0.012
peaks = [(128.217, 26.717, 503, 1100), (128.03, 26.585, 345, 800), (127.93, 26.635, 453, 900),
         (127.88, 26.47, 363, 800), (127.806, 26.719, 172, 260), (124.19, 24.428, 526, 1200),
         (123.87, 24.34, 469, 1100), (123.01, 24.455, 231, 700), (126.77, 26.37, 310, 800)]
for plon, plat, ph, sg in peaks:
    px_, pz_ = tm(np.array([plon]), np.array([plat]))
    i = int((px_[0] - X0) / PX); j = int((pz_[0] - Z0) / PX)
    if not mask[j, i]: print('peak off land', plon, plat); continue
    r2 = (wx - px_[0]) ** 2 + (wz - pz_[0]) ** 2
    g = np.exp(-r2 / (2 * sg * sg))
    Hm += (ph - Hm[j, i]) * g * np.minimum(din / 300.0, 1.0)
Hm = np.clip(Hm, 0, 525)
reefw = 650 + 420 * waves(9000, 7) + 160 * waves(2500, 8)
reefw = np.clip(reefw, 260, 1300)
prox = np.clip(1.0 - (dout - PX * 0.5) / reefw, 0, 1)
v = np.where(mask, 16 + np.round(Hm / 2.2), np.round(prox * 15)).astype(np.uint8)
print('max H', Hm[mask].max(), 'mean', Hm[mask].mean())

tiles = {}
for tj in range(H // TILE):
    for ti in range(W // TILE):
        blk = v[tj * TILE:(tj + 1) * TILE, ti * TILE:(ti + 1) * TILE]
        if blk.any(): tiles['%d_%d' % (ti, tj)] = base64.b64encode(blk.tobytes()).decode()
print('tiles', len(tiles))

# ---------- places ----------
P = [  # id, lon, lat, kind (c=coast snap, i=inland keep)
 ('naha', 127.6713, 26.2205, 'c'), ('kokusai', 127.6860, 26.2150, 'i'), ('shuri', 127.7195, 26.2170, 'i'),
 ('chatan', 127.7570, 26.3160, 'c'), ('zanpa', 127.7128, 26.4408, 'c'), ('maeda', 127.7722, 26.4447, 'c'),
 ('manzamo', 127.8502, 26.5049, 'c'), ('nago', 127.9670, 26.5925, 'c'), ('churaumi', 127.8779, 26.6944, 'c'),
 ('sesoko', 127.8560, 26.6490, 'c'), ('kouri', 128.0180, 26.6950, 'c'), ('ie', 127.7870, 26.7045, 'c'),
 ('hedo', 128.2644, 26.8722, 'c'), ('ogimi', 128.1200, 26.7020, 'c'), ('katsuren', 127.8787, 26.3304, 'i'),
 ('sefa', 127.8270, 26.1733, 'i'), ('peace', 127.7247, 26.0957, 'i'), ('itoman', 127.6650, 26.1240, 'c'),
 ('zamami', 127.3130, 26.2227, 'c'), ('tokashiki', 127.3440, 26.1700, 'c'), ('kume', 126.8200, 26.3400, 'c'),
 ('miyako', 125.2620, 24.7340, 'c'), ('irabu', 125.2200, 24.8200, 'c'), ('kabira', 124.1440, 24.4530, 'c'),
 ('ishigaki', 124.1550, 24.3370, 'c'), ('taketomi', 124.0790, 24.3190, 'c'), ('iriomote', 123.7790, 24.4380, 'c'),
 ('hateruma', 123.7730, 24.0600, 'c'), ('yonaguni', 122.9340, 24.4494, 'c'),
]
coast = fine.boundary
places = {}
for pid, plon, plat, kind in P:
    x, z = tm(np.array([plon]), np.array([plat])); pt = Point(x[0], z[0])
    inside = fine.contains(pt); dist = coast.distance(pt)
    if kind == 'c':
        c = nearest_points(coast, pt)[0]
        best = None
        for a in np.linspace(0, 2 * math.pi, 48, endpoint=False):
            q = Point(c.x + 28 * math.cos(a), c.y + 28 * math.sin(a))
            if fine.contains(q):
                dq = coast.distance(q)
                if best is None or dq > best[0]: best = (dq, q)
        q = best[1] if best else c
        places[pid] = [round(q.x), round(q.y), round(c.x), round(c.y)]
    else:
        if not inside:
            print('WARN inland poi off land', pid)
            pt = nearest_points(fine, pt)[0]
        places[pid] = [round(pt.x), round(pt.y), round(pt.x), round(pt.y)]
    print('%-10s inside=%s coastdist=%6.0f m -> %s' % (pid, inside, dist, places[pid]))

out = {
    'proj': {'R': R, 'lon0': LON0, 'lat0': LAT0},
    'coast': enc(fine), 'coarse': enc(coarse),
    'muni': {k: enc(clean(g.simplify(30.0, preserve_topology=True), 2000, 1e12)) for k, g in munis.items()},
    'raster': {'px': PX, 'tile': TILE, 'x0': X0, 'z0': Z0, 'tiles': tiles},
    'places': places,
}
s = json.dumps(out, separators=(',', ':'))
open(OUT, 'w').write(s)
print('bytes', len(s), 'coast', len(json.dumps(out['coast'])), 'coarse', len(json.dumps(out['coarse'])),
      'muni', len(json.dumps(out['muni'])), 'raster', len(json.dumps(out['raster'])))
