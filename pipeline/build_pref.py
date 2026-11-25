#!/usr/bin/env python3
"""Whole-prefecture buildings, roads and named places from Overture Maps -> game tiles.

usage: build_pref.py <out_dir> [work_dir]
Writes <out_dir>/t_<tx>_<tz>.json (same format as the Naha tiles), index.json and report.json.
Buildings inside Naha are skipped: the game already has the surveyed PLATEAU model there.
"""
import sys, os, json, math, subprocess, collections, urllib.request
import numpy as np
import geopandas as gpd
import shapely
from shapely.geometry import shape
from shapely.prepared import prep

OUT = sys.argv[1]; WORK = sys.argv[2] if len(sys.argv) > 2 else 'work'
os.makedirs(OUT, exist_ok=True); os.makedirs(WORK, exist_ok=True)
R, LON0, LAT0, TILE = 6364600.0, 127.75, 26.25, 768          # must match the game's projection
BOXES = {'okinawa': (126.70, 26.00, 128.40, 27.10), 'miyako': (124.60, 24.60, 125.60, 25.00),
         'yaeyama': (122.90, 24.00, 124.40, 24.70), 'daito': (131.10, 25.75, 131.40, 26.00)}
ROAD_W = {'motorway': 16, 'trunk': 14, 'primary': 12, 'secondary': 10, 'tertiary': 8, 'residential': 6, 'unclassified': 6,
          'living_street': 5, 'pedestrian': 6, 'service': 4, 'track': 3, 'footway': 2.5, 'path': 2.5, 'steps': 2.5, 'cycleway': 2.5}

def tm(lon, lat):
    lam = np.radians(np.asarray(lon, float) - LON0); phi = np.radians(np.asarray(lat, float))
    x = R * np.arctanh(np.cos(phi) * np.sin(lam))
    return x, -R * (np.arctan2(np.tan(phi), np.cos(lam)) - math.radians(LAT0))
def proj(geom):
    return shapely.transform(geom, lambda c: np.column_stack(tm(c[:, 0], c[:, 1])))
def fetch(kind, name, box):
    path = f'{WORK}/{name}_{kind}.parquet'
    if not os.path.exists(path):
        subprocess.run(['overturemaps', 'download', '--bbox=%s,%s,%s,%s' % box, '-f', 'geoparquet', f'--type={kind}', '-o', path], check=True)
    return gpd.read_parquet(path)
def get(row, col):
    try:
        v = row[col]
    except Exception:
        return None
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else v
def primary(v):
    try:
        return v.get('primary') if isinstance(v, dict) else None
    except Exception:
        return None
def first(v):
    """first usable string of a list-like column (phones, websites)"""
    try:
        if v is None or isinstance(v, str): return (v or '')[:24]
        for q in list(v):
            if q: return str(q)[:24]
    except Exception:
        pass
    return ''
def address(v):
    """one line from the first Overture address record: street part, town, postcode"""
    try:
        if v is None: return ''
        a = list(v)[0]
        g = lambda k: (a.get(k) if hasattr(a, 'get') else None) or ''
        free, loc, post = str(g('freeform')).strip(), str(g('locality')).strip(), str(g('postcode')).strip()
        out = free
        if loc and loc not in free: out = (loc + ' ' + free).strip()
        if post and post not in out: out = (out + ' \u3012' + post).strip()
        return out[:70]
    except Exception:
        return ''
def polys(g):
    if g is None or g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    if g.geom_type == 'MultiPolygon': return list(g.geoms)
    return []
def lines(g):
    if g is None or g.is_empty: return []
    if g.geom_type == 'LineString': return [g]
    if g.geom_type == 'MultiLineString': return list(g.geoms)
    return []

# Naha city outline (MLIT N03), to leave the surveyed city to PLATEAU
naha = None
try:
    with urllib.request.urlopen('https://raw.githubusercontent.com/niiyz/JapanCityGeoJson/HEAD/geojson/47/47201.json', timeout=60) as f:
        gj = json.load(f)
    naha = prep(proj(shapely.union_all([shapely.make_valid(shape(ft['geometry'])) for ft in gj['features']])))
except Exception as e:
    print('WARNING: could not load the Naha outline, Naha buildings will be duplicated:', e)

tiles = collections.defaultdict(lambda: {'b': [], 'n': 0, 'p': [], 'v': []})
rep = collections.Counter(); per = collections.defaultdict(collections.Counter)

for region, box in BOXES.items():
    # ---- buildings ----
    try:
        df = fetch('building', region, box); print(region, 'buildings', len(df), flush=True)
        for _, row in df.iterrows():
            h = get(row, 'height'); fl = get(row, 'num_floors')
            for pg in polys(row.geometry):
                try:
                    q = proj(pg).simplify(0.3)
                    if q.geom_type != 'Polygon' or q.area < 8: continue
                except Exception:
                    continue
                c = np.asarray(q.exterior.coords)[:-1]; cx, cz = c[:, 0].mean(), c[:, 1].mean()
                if naha is not None and naha.contains(shapely.Point(cx, cz)): rep['skipped_in_naha'] += 1; continue
                if h and h > 1.5: hh, flag = float(h), 0; rep['height_recorded'] += 1
                elif fl and fl > 0: hh, flag = float(fl) * 3.2, 0; rep['height_from_floors'] += 1
                else: hh, flag = (3.5 if q.area < 60 else 6.5 if q.area < 250 else 9.0), 4; rep['height_estimated'] += 1
                key = (int(math.floor(cx / TILE)), int(math.floor(cz / TILE))); T = tiles[key]
                pts = np.round((c - [key[0] * TILE, key[1] * TILE]) * 5).astype(int); d = np.vstack([pts[:1], np.diff(pts, axis=0)])
                if np.abs(d).max() > 32000: continue
                T['b'] += [len(pts), int(round(min(hh, 300) * 10)), flag] + d.flatten().tolist(); T['n'] += 1
                rep['buildings'] += 1; per[region]['buildings'] += 1
        del df
    except Exception as e:
        print('ERROR buildings', region, repr(e)); rep['errors'] += 1
    # ---- roads (kept as lines; the game paints them onto the ground) ----
    try:
        df = fetch('segment', region, box); print(region, 'segments', len(df), flush=True)
        for _, row in df.iterrows():
            if get(row, 'subtype') not in (None, 'road'): continue
            w = ROAD_W.get(get(row, 'class') or '', 5)
            for ln in lines(row.geometry):
                ln = proj(ln).simplify(1.0)
                if ln.is_empty or ln.length < 2: continue
                rep['road_km'] += ln.length / 1000
                x0, z0, x1, z1 = ln.bounds
                for tx in range(int((x0 - w) // TILE), int((x1 + w) // TILE) + 1):
                    for tz in range(int((z0 - w) // TILE), int((z1 + w) // TILE) + 1):
                        piece = ln.intersection(shapely.box(tx * TILE - w - 2, tz * TILE - w - 2, (tx + 1) * TILE + w + 2, (tz + 1) * TILE + w + 2))
                        for part in lines(piece):
                            q = np.round((np.asarray(part.coords) - [tx * TILE, tz * TILE]) * 2).astype(int)
                            keep = np.ones(len(q), bool); keep[1:] = np.any(q[1:] != q[:-1], axis=1); q = q[keep]
                            if len(q) < 2: continue
                            d = np.vstack([q[:1], np.diff(q, axis=0)])
                            tiles[(tx, tz)]['v'] += [int(round(w)), len(q)] + d.flatten().tolist()
        del df
    except Exception as e:
        print('ERROR roads', region, repr(e)); rep['errors'] += 1
    # ---- named places: shops, restaurants, sights ----
    try:
        df = fetch('place', region, box); print(region, 'places', len(df), flush=True)
        for _, row in df.iterrows():
            name = primary(get(row, 'names'))
            if not name: continue
            conf = get(row, 'confidence')
            if conf is not None and conf < 0.5: rep['places_low_confidence'] += 1; continue
            cat = primary(get(row, 'categories')) or get(row, 'basic_category') or primary(get(row, 'taxonomy')) or ''
            g = row.geometry
            if g is None or g.geom_type != 'Point': continue
            x, z = tm([g.x], [g.y]); key = (int(math.floor(x[0] / TILE)), int(math.floor(z[0] / TILE)))
            addr, phone = address(get(row, 'addresses')), first(get(row, 'phones'))
            if addr: rep['places_with_address'] += 1
            if phone: rep['places_with_phone'] += 1
            tiles[key]['p'].append([int(round(x[0])), int(round(z[0])), str(name)[:40], str(cat)[:32], addr, phone])
            rep['places'] += 1; per[region]['places'] += 1
        del df
    except Exception as e:
        print('ERROR places', region, repr(e)); rep['errors'] += 1

GROUP = 12                      # tiles are shipped in bundles of 12 x 12 (about 9 km) to keep the file count low
bundles = collections.defaultdict(dict); index = {}
for k, T in tiles.items():
    if not T['n'] and not T['p'] and not T['v']: continue
    bundles[(k[0] // GROUP, k[1] // GROUP)]['%d_%d' % k] = {'b': T['b'], 'v': T['v'], 'p': T['p']}; index['%d_%d' % k] = [T['n'], 0]
size = 0
for bk, B in bundles.items():
    s = json.dumps(B, separators=(',', ':'), ensure_ascii=False)
    open(f'{OUT}/b_{bk[0]}_{bk[1]}.json', 'w', encoding='utf-8').write(s); size += len(s.encode())
report = dict(rep); report['tiles'] = len(index); report['bundles'] = len(bundles); report['megabytes'] = round(size / 1e6, 1); report['regions'] = {r: dict(c) for r, c in per.items()}
report['road_km'] = round(report.get('road_km', 0))
json.dump({'tile': TILE, 'group': GROUP, 'tiles': index, 'report': report}, open(f'{OUT}/index.json', 'w'), separators=(',', ':'))
json.dump(report, open(f'{OUT}/report.json', 'w'), indent=1)
print(json.dumps(report, indent=1))
if not report.get('buildings'): sys.exit('no buildings were produced')
