#!/usr/bin/env python3
"""PLATEAU Naha CityGML (zip) -> game tiles. usage: naha.py <zip> <outdir> <world.json>
Reads straight from the zip; nothing is extracted or executed."""
import sys, zipfile, json, math, base64, io, collections, time
import numpy as np
from lxml import etree
from PIL import Image, ImageDraw
import mapbox_earcut as earcut
from shapely.geometry import Polygon
from scipy.interpolate import griddata
from scipy import ndimage
from scipy.spatial import cKDTree

ZIP, OUT, WORLD = sys.argv[1], sys.argv[2], sys.argv[3]
R, LON0, LAT0 = 6364600.0, 127.75, 26.25
TILE = 768
B = '{http://www.opengis.net/citygml/building/2.0}'; G = '{http://www.opengis.net/gml}'
A = '{http://www.opengis.net/citygml/appearance/2.0}'; TR = '{http://www.opengis.net/citygml/transportation/2.0}'
def tm(lat, lon):
    lam = np.radians(lon - LON0); phi = np.radians(lat)
    x = R * np.arctanh(np.cos(phi) * np.sin(lam))
    return x, -R * (np.arctan2(np.tan(phi), np.cos(lam)) - math.radians(LAT0))
def ring(el):
    a = np.array(el.text.split(), dtype=np.float64).reshape(-1, 3)
    x, z = tm(a[:, 0], a[:, 1]); return np.column_stack([x, z, a[:, 2]])
z = zipfile.ZipFile(ZIP)
names = z.namelist()
tiles = collections.defaultdict(lambda: {'b': [], 'm': [], 'n': 0, 'a': [], 'nm': {}})
WANT = ('usage', 'storeysAboveGround', 'buildingStructureType', 'totalFloorArea', 'surveyYear', 'name')
def num(s):
    try: return int(round(float(s)))
    except Exception: return 0
dem_pts = []; stats = collections.Counter(); thumbs = {}
def thumb(path):
    if path not in thumbs:
        try:
            im = Image.open(io.BytesIO(z.read(path))).convert('RGB'); im.thumbnail((96, 96)); thumbs[path] = np.asarray(im, np.float32)
        except Exception: thumbs[path] = None
    return thumbs[path]
def tri3d(rings):
    P = np.vstack(rings); ext = rings[0]
    n = np.zeros(3)
    for i in range(len(ext)):
        a, b = ext[i], ext[(i + 1) % len(ext)]
        n += [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]
    L = np.linalg.norm(n)
    if L < 1e-6: return None
    n /= L; u = np.cross(n, [0, 0, 1.0] if abs(n[2]) < .9 else [1.0, 0, 0]); u /= np.linalg.norm(u); v = np.cross(n, u)
    p2 = np.column_stack([P @ u, P @ v]); ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
    try: idx = earcut.triangulate_float64(p2, ends)
    except Exception: return None
    return P, np.asarray(idx, np.int64)

t0 = time.time()
for fn in sorted(n for n in names if n.startswith('udx/bldg/') and n.endswith('.gml')):
    blds = []; tex = {}
    with z.open(fn) as f:
        for _, el in etree.iterparse(f, events=('end',), tag=(B + 'Building', A + 'ParameterizedTexture')):
            if el.tag == A + 'ParameterizedTexture':
                img = el.findtext(A + 'imageURI')
                for tg in el.iter(A + 'target'):
                    tc = tg.find('.//' + A + 'textureCoordinates')
                    if tc is None or not tc.text: continue
                    uv = np.array(tc.text.split(), dtype=np.float32).reshape(-1, 2)
                    tex[tg.get('uri', '').lstrip('#')] = (img, uv[:, 0].min(), uv[:, 1].min(), uv[:, 0].max(), uv[:, 1].max())
                el.clear(); continue
            zs = [ring(p)[:, 2] for s in el.iter(B + 'lod1Solid') for p in s.iter(G + 'posList')]
            if not zs: el.clear(); continue
            zz = np.concatenate(zs); base, top = float(zz.min()), float(zz.max())
            foots = [ring(p.find('.//' + G + 'exterior//' + G + 'posList'))[:-1, :2] for e in el.iter(B + 'lod0RoofEdge', B + 'lod0FootPrint') for p in e.iter(G + 'Polygon')]
            surf = []
            for s in el.iter(B + 'RoofSurface', B + 'WallSurface', B + 'OuterCeilingSurface', B + 'OuterFloorSurface', B + 'ClosureSurface'):
                for p in s.iter(G + 'Polygon'):
                    rs = [ring(q)[:-1] for q in p.iter(G + 'posList')]
                    if rs and len(rs[0]) >= 3: surf.append((p.get(G + 'id'), [r for r in rs if len(r) >= 3]))
            att = {}
            for c in el.iter():
                if not isinstance(c.tag, str): continue
                ln = c.tag.rsplit('}', 1)[-1]
                if ln in WANT and ln not in att and c.text and c.text.strip(): att[ln] = c.text.strip()
            blds.append((base, top, foots, surf, att)); el.clear()
            while el.getprevious() is not None: del el.getparent()[0]
    appdir = fn.rsplit('/', 1)[0] + '/'
    for base, top, foots, surf, att in blds:
        h = top - base
        if h < 1.8 or not foots: stats['skip_small'] += 1; continue
        first = True
        for ft in foots:
            try:
                pg = Polygon(ft).simplify(0.25)
                if pg.geom_type != 'Polygon' or pg.area < 8: continue
            except Exception: continue
            c = np.asarray(pg.exterior.coords)[:-1]; cx, cz = c[:, 0].mean(), c[:, 1].mean()
            key = (int(math.floor(cx / TILE)), int(math.floor(cz / TILE))); T = tiles[key]
            q = np.round((c - [key[0] * TILE, key[1] * TILE]) * 5).astype(int)
            d = np.vstack([q[:1], np.diff(q, axis=0)])
            has2 = (1 if first else 2) if surf else 0
            T['b'] += [len(q), int(round(h * 10)), has2] + d.flatten().tolist(); idx = T['n']; T['n'] += 1
            st = num(att.get('storeysAboveGround', 0)); T['a'] += [num(att.get('usage', 0)), st if st < 200 else 0, num(att.get('buildingStructureType', 0)), num(att.get('totalFloorArea', 0)), num(att.get('surveyYear', 0))]
            stats['u' + att.get('usage', '-')] += 1; stats['s' + att.get('buildingStructureType', '-')] += 1
            if att.get('name'): T['nm'][idx] = att['name']; stats['named'] += 1
            dem_pts.append((cx, cz, base)); stats['lod1'] += 1
            if has2 == 1:
                first = False; vmap = {}; verts = []; polys = []; o = np.array([key[0] * TILE, key[1] * TILE, base])
                for pid, rs in surf:
                    r3 = tri3d(rs)
                    if r3 is None: continue
                    P, ti = r3; col = -1; tx = tex.get(pid)
                    if tx:
                        im = thumb(appdir + tx[0])
                        if im is not None:
                            H, W = im.shape[:2]; u0, v0, u1, v1 = tx[1:]
                            a = im[max(0, int((1 - v1) * H)):max(1, int(math.ceil((1 - v0) * H))), max(0, int(u0 * W)):max(1, int(math.ceil(u1 * W)))]
                            if a.size:
                                m = a.reshape(-1, 3).mean(0); col = (int(m[0]) << 16) | (int(m[1]) << 8) | int(m[2])
                    Q = np.round((P - o) * 10).astype(int); loc = []
                    for v in Q:
                        k = (int(v[0]), int(v[2]), int(v[1]))       # x, y(up), z
                        if k not in vmap: vmap[k] = len(verts) // 3; verts += k
                        loc.append(vmap[k])
                    polys.append([col] + [loc[i] for i in ti]); stats['tri2'] += len(ti) // 3
                if polys: T['m'].append({'i': idx, 'v': verts, 'p': polys}); stats['lod2'] += 1
    print(fn.split('/')[-1], len(blds), 'bldg', round(time.time() - t0), 's', flush=True)
thumbs.clear()

# ---- roads -> 1 m masks per tile ----
masks = {}
def mask(k):
    if k not in masks: masks[k] = Image.new('L', (TILE, TILE), 0)
    return masks[k]
for fn in sorted(n for n in names if n.startswith('udx/tran/') and n.endswith('.gml')):
    with z.open(fn) as f:
        for _, el in etree.iterparse(f, events=('end',), tag=G + 'Polygon'):
            ex = el.find(G + 'exterior//' + G + 'posList')
            if ex is None: continue
            c = ring(ex)[:, :2]; stats['road'] += 1
            for tx in range(int(c[:, 0].min() // TILE), int(c[:, 0].max() // TILE) + 1):
                for tz in range(int(c[:, 1].min() // TILE), int(c[:, 1].max() // TILE) + 1):
                    ImageDraw.Draw(mask((tx, tz))).polygon([(float(x - tx * TILE), float(y - tz * TILE)) for x, y in c], fill=255)
            el.clear()
def rle(a):
    f = (a.reshape(-1) > 127).astype(np.int8); ch = np.flatnonzero(np.diff(f)) + 1
    runs = np.diff(np.concatenate([[0], ch, [f.size]])).tolist()
    return ([0] if f[0] else []) + runs
# ---- ground from building bases ----
D = np.array(dem_pts); STEP = 24.0
x0 = math.floor((D[:, 0].min() - 700) / STEP) * STEP; z0 = math.floor((D[:, 1].min() - 700) / STEP) * STEP
nx = int((D[:, 0].max() + 700 - x0) / STEP) + 1; nz = int((D[:, 1].max() + 700 - z0) / STEP) + 1
gx, gz = np.meshgrid(x0 + np.arange(nx) * STEP, z0 + np.arange(nz) * STEP)
H = griddata(D[:, :2], D[:, 2], (gx, gz), method='linear'); Hn = griddata(D[:, :2], D[:, 2], (gx, gz), method='nearest')
H = np.where(np.isnan(H), Hn, H); H = ndimage.gaussian_filter(ndimage.median_filter(H, 3), 1.0)
dist = cKDTree(D[:, :2]).query(np.column_stack([gx.ravel(), gz.ravel()]))[0].reshape(nz, nx)
Wt = 1 - np.clip((dist - 200) / 400, 0, 1); Wt = Wt * Wt * (3 - 2 * Wt)
dem = {'x0': x0, 'z0': z0, 'nx': nx, 'nz': nz, 'step': STEP, 'q': 0.75,
       'h': base64.b64encode(np.clip(np.round((H + 2) / 0.75), 0, 255).astype(np.uint8).tobytes()).decode(),
       'w': base64.b64encode(np.round(Wt * 255).astype(np.uint8).tobytes()).decode()}
# ---- anchors: put Kokusai-dori's marker in the middle of the widest street near the hand-placed point ----
world = json.load(open(WORLD)); anchors = {}
for pid in ('kokusai',):
    px, pz = world['places'][pid][:2]; k = (int(px // TILE), int(pz // TILE))
    if k in masks:
        m = np.asarray(masks[k]) > 127; dt = ndimage.distance_transform_edt(m)
        jj, ii = np.mgrid[0:TILE, 0:TILE]; near = np.hypot(ii - (px - k[0] * TILE), jj - (pz - k[1] * TILE)) < 220
        j, i = np.unravel_index(np.argmax(dt * near), dt.shape); anchors[pid] = [k[0] * TILE + int(i), k[1] * TILE + int(j)]
        print('anchor', pid, (px, pz), '->', anchors[pid], 'half-width', dt[j, i])
import os
os.makedirs(OUT, exist_ok=True); index = {}; tot = [0, 0]
for k in set(tiles) | set(masks):
    T = tiles.get(k, {'b': [], 'm': [], 'n': 0}); name = '%d_%d' % k; rd = rle(np.asarray(masks[k])) if k in masks else None
    s = json.dumps({'b': T['b'], 'r': rd}, separators=(',', ':')); open(f'{OUT}/t_{name}.json', 'w').write(s); tot[0] += len(s)
    if T['m']:
        s = json.dumps(T['m'], separators=(',', ':')); open(f'{OUT}/m_{name}.json', 'w').write(s); tot[1] += len(s)
    index[name] = [T['n'], 1 if T['m'] else 0]
open(f'{OUT}/attrs.json', 'w').write(json.dumps({'a': {'%d_%d' % k: T['a'] for k, T in tiles.items()}, 'n': {'%d_%d' % k: T['nm'] for k, T in tiles.items() if T['nm']}}, separators=(',', ':'), ensure_ascii=False))
open(f'{OUT}/index.json', 'w').write(json.dumps({'tile': TILE, 'tiles': index, 'dem': dem, 'anchors': anchors}, separators=(',', ':')))
print(dict(stats)); print('tiles', len(index), 'lod2 tiles', sum(v[1] for v in index.values()), 'bytes t/m', tot, 'dem', nx, nz, 'elev range', float(D[:, 2].min()), float(D[:, 2].max()))
