import pandas as pd
import json, gc, sys, os
sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = 'data'
OUT = 'website/data'
STATION_CSV = f'{DATA_DIR}/lfb_stations_source.csv'

CLOSED_2014 = {
    'Belsize', 'Bow', 'Clerkenwell', 'Downham', 'Kingsland',
    'Knightsbridge', 'Silvertown', 'Southwark', 'Westminster', 'Woolwich',
}
DUPLICATES = {'Lambeth River'}


def norm(s):
    return str(s).strip().lower()


print('Loading station list...')
stations = pd.read_csv(STATION_CSV)
print(f'  {len(stations)} stations in source list')
stations = stations[~stations['name'].isin(CLOSED_2014)]
stations = stations[~stations['name'].isin(DUPLICATES)]
stations = stations.reset_index(drop=True)
print(f'  {len(stations)} stations after removing 2014 closures and duplicates')

print('Loading LFB incident counts per station...')
use_cols = ['CalYear', 'IncidentStationGround']
chunks = []
csv_path = f'{DATA_DIR}/LFB Incident data from 2009 - 2017.csv'
for chunk in pd.read_csv(csv_path, encoding='utf-8-sig', usecols=use_cols, chunksize=200000):
    chunks.append(chunk)
df1 = pd.concat(chunks, ignore_index=True); del chunks; gc.collect()
df2 = pd.read_excel(f'{DATA_DIR}/LFB Incident data from 2018 - 2023.xlsx', engine='openpyxl', usecols=use_cols)
df3 = pd.read_excel(f'{DATA_DIR}/LFB Incident data from 2024 onwards.xlsx', engine='openpyxl', usecols=use_cols)
df = pd.concat([df1, df2, df3], ignore_index=True); del df1, df2, df3; gc.collect()
df = df[df['CalYear'].between(2018, 2025)]
df = df.dropna(subset=['IncidentStationGround'])
df['station_norm'] = df['IncidentStationGround'].apply(norm)
counts = df.groupby('station_norm').size().to_dict()
print(f'  {len(counts)} unique station names in LFB incident data')

print('Building geojson...')
features = []
matched = 0
for _, row in stations.iterrows():
    name = str(row['name']).strip()
    lon = round(float(row['longitude']), 5)
    lat = round(float(row['latitude']), 5)
    incidents = int(counts.get(norm(name), 0))
    if incidents > 0:
        matched += 1
    features.append({
        'type': 'Feature',
        'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
        'properties': {'name': name, 'incidents': incidents},
    })

print(f'  {matched} stations matched against LFB incident counts')

geo = {'type': 'FeatureCollection', 'features': features}
out_path = f'{OUT}/stations.json'
os.makedirs(OUT, exist_ok=True)
with open(out_path, 'w') as f:
    json.dump(geo, f, separators=(',', ':'))
print(f'  wrote {out_path}, {os.path.getsize(out_path) / 1024:.0f}KB')
print('Done')
