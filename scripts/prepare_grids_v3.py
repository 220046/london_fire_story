import pandas as pd
import numpy as np
import json, gc, sys, os
from pyproj import Transformer
sys.stdout.reconfigure(encoding='utf-8')

transformer = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)
DATA_DIR = 'data'
OUT = 'website/data'
GRID = 250

use_cols = ['CalYear','IncidentGroup','SpecialServiceType','PropertyCategory',
            'Easting_rounded','Northing_rounded','StopCodeDescription']

print('Loading...')
chunks = []
for chunk in pd.read_csv(f'{DATA_DIR}/LFB Incident data from 2009 - 2017.csv',
                          encoding='utf-8-sig', usecols=use_cols, chunksize=200000):
    chunks.append(chunk)
df1 = pd.concat(chunks, ignore_index=True); del chunks; gc.collect()
df2 = pd.read_excel(f'{DATA_DIR}/LFB Incident data from 2018 - 2023.xlsx', engine='openpyxl', usecols=use_cols)
df3 = pd.read_excel(f'{DATA_DIR}/LFB Incident data from 2024 onwards.xlsx', engine='openpyxl', usecols=use_cols)
df = pd.concat([df1, df2, df3], ignore_index=True); del df1,df2,df3; gc.collect()
df = df[df['CalYear'].between(2014, 2025)]
df = df.dropna(subset=['Easting_rounded','Northing_rounded'])
df = df[(df['Easting_rounded'] > 500000) & (df['Easting_rounded'] < 565000)]
df = df[(df['Northing_rounded'] > 155000) & (df['Northing_rounded'] < 205000)]
df['ge'] = (df['Easting_rounded'] // GRID * GRID).astype(int)
df['gn'] = (df['Northing_rounded'] // GRID * GRID).astype(int)
print(f'Total: {len(df):,}')

YEARS = list(range(2014, 2026))

def bng(e, n):
    lon, lat = transformer.transform(e, n)
    return [round(lon, 6), round(lat, 6)]

def build_grid(subset, sub_configs, label, min_total=2):
    totals = subset.groupby(['ge','gn']).size().reset_index(name='t')
    totals = totals[totals['t'] >= min_total]

    # Sub-type counts
    sub_counts = {}
    for key, filt_fn in sub_configs.items():
        sc = filt_fn(subset).groupby(['ge','gn']).size()
        sub_counts[key] = {(e,n): int(c) for (e,n), c in sc.items()}

    # Yearly counts
    year_counts = {}
    for y in YEARS:
        yc = subset[subset['CalYear']==y].groupby(['ge','gn']).size()
        year_counts[y] = {(e,n): int(c) for (e,n), c in yc.items()}

    features = []
    for _, r in totals.iterrows():
        e, n, t = int(r['ge']), int(r['gn']), int(r['t'])
        sw, se, ne_, nw = bng(e,n), bng(e+GRID,n), bng(e+GRID,n+GRID), bng(e,n+GRID)
        props = {'t': t}
        for key in sub_configs:
            props[key] = sub_counts[key].get((e,n), 0)
        for y in YEARS:
            props[f'y{y}'] = year_counts[y].get((e,n), 0)
        features.append({"type":"Feature","geometry":{"type":"Polygon","coordinates":[[sw,se,ne_,nw,sw]]},"properties":props})

    print(f'  {label}: {len(features)} cells')
    return {"type":"FeatureCollection","features":features}

# FIRE
fire = df[df['IncidentGroup']=='Fire']
geo_fire = build_grid(fire, {
    'dw': lambda d: d[d['PropertyCategory']=='Dwelling'],
    'od': lambda d: d[d['PropertyCategory']=='Outdoor'],
    'os': lambda d: d[d['PropertyCategory']=='Outdoor Structure'],
    'rv': lambda d: d[d['PropertyCategory']=='Road Vehicle'],
}, 'Fire', 3)
with open(f'{OUT}/grid_fire.json','w') as f: json.dump(geo_fire, f, separators=(',',':'))
print(f'    {os.path.getsize(f"{OUT}/grid_fire.json")/1024:.0f}KB')

# FALSE ALARM
fa = df[df['IncidentGroup']=='False Alarm']
geo_fa = build_grid(fa, {
    'afa': lambda d: d[d['StopCodeDescription'].str.contains('AFA', case=False, na=False)],
    'gi': lambda d: d[d['StopCodeDescription'].str.contains('Good intent', case=False, na=False)],
    'mal': lambda d: d[d['StopCodeDescription'].str.contains('Malicious', case=False, na=False)],
}, 'False Alarm', 3)
with open(f'{OUT}/grid_fa.json','w') as f: json.dump(geo_fa, f, separators=(',',':'))
print(f'    {os.path.getsize(f"{OUT}/grid_fa.json")/1024:.0f}KB')

# SPECIAL SERVICE
ss = df[df['IncidentGroup']=='Special Service']
geo_ss = build_grid(ss, {
    'en': lambda d: d[d['SpecialServiceType'].str.contains('Effecting entry', case=False, na=False)],
    'fl': lambda d: d[d['SpecialServiceType'].str.contains('Flood', case=False, na=False)],
    'ag': lambda d: d[d['SpecialServiceType'].str.contains('Assist other agencies', case=False, na=False)],
    'md': lambda d: d[d['SpecialServiceType'].str.contains('Medical', case=False, na=False)],
    'lr': lambda d: d[d['SpecialServiceType'].str.contains('Lift Release', case=False, na=False)],
}, 'Special Service', 2)
with open(f'{OUT}/grid_ss.json','w') as f: json.dump(geo_ss, f, separators=(',',':'))
print(f'    {os.path.getsize(f"{OUT}/grid_ss.json")/1024:.0f}KB')

print('Done!')
