import pandas as pd
import geopandas as gpd
import json
from pathlib import Path

print("Loading LFB data...")
df1 = pd.read_csv('data/LFB Incident data from 2009 - 2017.csv', low_memory=False)
df2 = pd.read_excel('data/LFB Incident data from 2018 - 2023.xlsx')
df3 = pd.read_excel('data/LFB Incident data from 2024 onwards.xlsx')
df = pd.concat([df1, df2, df3], ignore_index=True)
print(f"Total records: {len(df)}")

df['DateOfCall'] = pd.to_datetime(df['DateOfCall'], dayfirst=True, errors='coerce')
df = df[df['DateOfCall'].dt.year >= 2014].copy()
df['month'] = df['DateOfCall'].dt.month

def get_season(m):
    if m in [5,6,7,8,9]:   return 'summer'
    if m in [11,12,1,2,3]: return 'winter'
    return 'other'
df['season'] = df['month'].apply(get_season)

def get_type(row):
    grp = str(row.get('IncidentGroup', ''))
    sst = str(row.get('SpecialServiceType', ''))
    scd = str(row.get('StopCodeDescription', ''))
    if grp == 'Fire':
        if scd == 'Secondary Fire': return 'outdoor_fire'
        if scd == 'Primary Fire':   return 'dwelling_fire'
        return 'other_fire'
    if 'Flooding' in sst:          return 'flooding'
    if 'Effecting entry' in sst:   return 'forced_entry'
    if 'Assist' in sst:            return 'agency_assist'
    return 'other'
df['inc_type'] = df.apply(get_type, axis=1)

df = df.dropna(subset=['Easting_rounded', 'Northing_rounded'])
df = df[df['Easting_rounded'] > 0]

print("Spatial join to ward...")
gdf = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(df['Easting_rounded'], df['Northing_rounded']),
    crs='EPSG:27700'
)

ward = gpd.read_file('ward/London_Ward.shp')[['GSS_CODE','NAME','DISTRICT','geometry']].copy()
ward = ward.to_crs('EPSG:27700')

joined = gpd.sjoin(gdf, ward, how='left', predicate='within')
joined = joined.dropna(subset=['GSS_CODE'])
print(f"Records with ward: {len(joined)}")

combos = [
    ('summer', 'outdoor_fire'),
    ('summer', 'dwelling_fire'),
    ('summer', 'flooding'),
    ('summer', 'forced_entry'),
    ('summer', 'agency_assist'),
    ('winter', 'outdoor_fire'),
    ('winter', 'dwelling_fire'),
    ('winter', 'flooding'),
    ('winter', 'forced_entry'),
    ('winter', 'agency_assist'),
]

result = {}
for season, inc_type in combos:
    key = f"{season}_{inc_type}"
    sub = joined[(joined['season'] == season) & (joined['inc_type'] == inc_type)]
    counts = sub.groupby('GSS_CODE').size().to_dict()
    result[key] = counts
    print(f"{key}: {len(counts)} wards, {sum(counts.values())} incidents")

ward_wgs = ward.to_crs('EPSG:4326')
features = []
for _, row in ward_wgs.iterrows():
    code = row['GSS_CODE']
    props = {
        'code':    code,
        'name':    row['NAME'],
        'borough': row['DISTRICT'],
    }
    for season, inc_type in combos:
        key = f"{season}_{inc_type}"
        props[key] = result[key].get(code, 0)
    features.append({
        'type': 'Feature',
        'geometry': row['geometry'].__geo_interface__,
        'properties': props
    })

geojson = {'type': 'FeatureCollection', 'features': features}
out = Path('website/data/ward_seasonal.json')
with open(out, 'w') as f:
    json.dump(geojson, f)
print(f"Saved {out}  with {len(features)} wards")