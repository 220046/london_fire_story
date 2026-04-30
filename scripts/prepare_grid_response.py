import pandas as pd
import numpy as np
import json, gc, sys, os
from pyproj import Transformer
sys.stdout.reconfigure(encoding='utf-8')

transformer = Transformer.from_crs('EPSG:27700', 'EPSG:4326', always_xy=True)
DATA_DIR = 'data'
OUT = 'website/data'
GRID = 250
MIN_INCIDENTS = 3

use_cols = ['CalYear', 'Easting_rounded', 'Northing_rounded', 'FirstPumpArriving_AttendanceTime']

print('Loading...')
chunks = []
csv_path = f'{DATA_DIR}/LFB Incident data from 2009 - 2017.csv'
for chunk in pd.read_csv(csv_path, encoding='utf-8-sig', usecols=use_cols, chunksize=200000):
    chunks.append(chunk)
df1 = pd.concat(chunks, ignore_index=True); del chunks; gc.collect()
df2 = pd.read_excel(f'{DATA_DIR}/LFB Incident data from 2018 - 2023.xlsx', engine='openpyxl', usecols=use_cols)
df3 = pd.read_excel(f'{DATA_DIR}/LFB Incident data from 2024 onwards.xlsx', engine='openpyxl', usecols=use_cols)
df = pd.concat([df1, df2, df3], ignore_index=True); del df1, df2, df3; gc.collect()
df = df[df['CalYear'].between(2009, 2025)]
df['FirstPumpArriving_AttendanceTime'] = pd.to_numeric(df['FirstPumpArriving_AttendanceTime'], errors='coerce')
df = df.dropna(subset=['Easting_rounded', 'Northing_rounded'])
df = df[(df['Easting_rounded'] > 500000) & (df['Easting_rounded'] < 565000)]
df = df[(df['Northing_rounded'] > 155000) & (df['Northing_rounded'] < 205000)]
df['ge'] = (df['Easting_rounded'] // GRID * GRID).astype(int)
df['gn'] = (df['Northing_rounded'] // GRID * GRID).astype(int)
print(f'Total incidents with valid coordinates: {len(df):,}')


def bng(e, n):
    lon, lat = transformer.transform(e, n)
    return [round(lon, 6), round(lat, 6)]


print('Aggregating per cell...')
agg = df.groupby(['ge', 'gn']).agg(
    mean=('FirstPumpArriving_AttendanceTime', 'mean'),
    count=('Easting_rounded', 'size'),
).reset_index()
agg = agg[agg['count'] >= MIN_INCIDENTS]
agg = agg.dropna(subset=['mean'])
agg['mean'] = agg['mean'].round().astype(int)
agg['count'] = agg['count'].astype(int)
print(f'  cells with at least {MIN_INCIDENTS} incidents: {len(agg):,}')

p5 = np.percentile(agg['mean'], 5)
p95 = np.percentile(agg['mean'], 95)
print(f'  response time p5={p5:.0f}s, p95={p95:.0f}s')


def to_d(r):
    val = (r - p5) / (p95 - p5) * 100
    if val < 0: return 0.0
    if val > 100: return 100.0
    return round(float(val), 1)


print('Building geojson...')
features = []
for _, row in agg.iterrows():
    e, n = int(row['ge']), int(row['gn'])
    sw = bng(e, n)
    se = bng(e + GRID, n)
    ne_ = bng(e + GRID, n + GRID)
    nw = bng(e, n + GRID)
    features.append({
        'type': 'Feature',
        'geometry': {'type': 'Polygon', 'coordinates': [[sw, se, ne_, nw, sw]]},
        'properties': {'r': int(row['mean']), 'd': to_d(row['mean']), 'c': int(row['count'])}
    })

geo = {'type': 'FeatureCollection', 'features': features}
out_path = f'{OUT}/grid_response.json'
os.makedirs(OUT, exist_ok=True)
with open(out_path, 'w') as f:
    json.dump(geo, f, separators=(',', ':'))
print(f'  wrote {out_path}, {os.path.getsize(out_path) / 1024:.0f}KB')
print('Done')
