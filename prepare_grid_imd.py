import pandas as pd
import json, sys, os
from pyproj import Transformer
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = 'data'
OUT = 'website/data'
GRID = 250

# Download the London ward boundaries GeoJSON from ONS Open Geography Portal
# (Wards December 2017 or May 2018, the vintage that matches IMD 2019)
# and save it at the path below before running this script.
WARD_GEOJSON = f'{DATA_DIR}/london_wards.geojson'

# Bounding box covering Greater London in EPSG 27700 BNG, same lattice as prepare_grids_v3
E_MIN, E_MAX = 500000, 565000
N_MIN, N_MAX = 155000, 205000

transformer = Transformer.from_crs('EPSG:27700', 'EPSG:4326', always_xy=True)

def bng(e, n):
    lon, lat = transformer.transform(e, n)
    return [round(lon, 6), round(lat, 6)]

print('Loading IMD ward table')
imd_df = pd.read_excel(f'{DATA_DIR}/London_wards_id2019_summary_measures.xlsx',
                       sheet_name='wards_id_summary')
imd_lookup = {}
for _, r in imd_df.iterrows():
    imd_lookup[r['Ward Code']] = {
        'score': float(r['IMD average score']),
        'ward': r['Ward Name'],
        'borough': r['Borough'],
        'pop': int(r['Population']) if pd.notna(r['Population']) else 0,
    }
print(f'  {len(imd_lookup)} wards in IMD table')

print('Loading ward boundaries')
with open(WARD_GEOJSON, encoding='utf-8') as f:
    wards = json.load(f)

CODE_KEYS = ['WD17CD', 'WD18CD', 'WD19CD', 'GSS_CODE', 'Ward Code', 'wd17cd', 'wd18cd']

def find_code(props):
    for k in CODE_KEYS:
        if k in props and props[k] in imd_lookup:
            return props[k]
    return None

ward_polys = []
ward_props = []
unmatched = 0
for feat in wards['features']:
    code = find_code(feat['properties'])
    if code is None:
        unmatched += 1
        continue
    poly = shape(feat['geometry'])
    ward_polys.append(poly)
    ward_props.append({'code': code, **imd_lookup[code]})
print(f'  {len(ward_polys)} ward polygons matched to IMD, {unmatched} skipped')

tree = STRtree(ward_polys)

print(f'Generating {GRID}m grid')
features = []
hits = 0
miss = 0
for e in range(E_MIN, E_MAX, GRID):
    for n in range(N_MIN, N_MAX, GRID):
        cx_lon, cy_lat = transformer.transform(e + GRID / 2, n + GRID / 2)
        pt = Point(cx_lon, cy_lat)
        match = None
        for idx in tree.query(pt):
            if ward_polys[idx].contains(pt):
                match = ward_props[idx]
                break
        if match is None:
            miss += 1
            continue
        sw, se, ne_, nw = bng(e, n), bng(e + GRID, n), bng(e + GRID, n + GRID), bng(e, n + GRID)
        features.append({
            'type': 'Feature',
            'geometry': {'type': 'Polygon', 'coordinates': [[sw, se, ne_, nw, sw]]},
            'properties': {
                'imd': round(match['score'], 2),
                'ward': match['ward'],
                'borough': match['borough'],
            },
        })
        hits += 1

print(f'  {hits} cells inside London wards, {miss} cells outside (water, parks, gaps)')

geo = {'type': 'FeatureCollection', 'features': features}
out_path = f'{OUT}/grid_imd.json'
os.makedirs(OUT, exist_ok=True)
with open(out_path, 'w') as f:
    json.dump(geo, f, separators=(',', ':'))
print(f'  wrote {out_path}, {os.path.getsize(out_path) / 1024:.0f}KB')
print('Done')
