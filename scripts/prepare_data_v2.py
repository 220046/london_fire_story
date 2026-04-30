import pandas as pd
import numpy as np
import json, gc, sys
sys.stdout.reconfigure(encoding='utf-8')

use_cols = ['CalYear','DateOfCall','IncidentGroup','SpecialServiceType',
            'PropertyCategory','ProperCase','FirstPumpArriving_AttendanceTime']

print('Loading...')
chunks = []
for chunk in pd.read_csv('data/LFB Incident data from 2009 - 2017.csv',
                          encoding='utf-8-sig', usecols=use_cols, chunksize=200000):
    chunks.append(chunk)
df1 = pd.concat(chunks, ignore_index=True); del chunks; gc.collect()
df2 = pd.read_excel('data/LFB Incident data from 2018 - 2023.xlsx', engine='openpyxl', usecols=use_cols)
df3 = pd.read_excel('data/LFB Incident data from 2024 onwards.xlsx', engine='openpyxl', usecols=use_cols)
df = pd.concat([df1, df2, df3], ignore_index=True); del df1,df2,df3; gc.collect()

df['DateOfCall'] = pd.to_datetime(df['DateOfCall'], format='mixed', dayfirst=True)
df['Month'] = df['DateOfCall'].dt.month
df['FirstPumpArriving_AttendanceTime'] = pd.to_numeric(df['FirstPumpArriving_AttendanceTime'], errors='coerce')
df = df[df['CalYear'].between(2014, 2025)]
print(f'Total 2014-2025: {len(df):,}')

data = {}

# 1. Yearly by type
yearly = df.groupby(['CalYear','IncidentGroup']).size().unstack(fill_value=0)
data['yearlyByType'] = {
    'years': [int(y) for y in yearly.index],
    'falseAlarm': [int(v) for v in yearly['False Alarm']],
    'fire': [int(v) for v in yearly['Fire']],
    'specialService': [int(v) for v in yearly['Special Service']],
}

# 2. False alarm breakdown - need StopCodeDescription
# Reload with that column for FA breakdown
print('Loading StopCodeDescription for FA...')
fa_chunks = []
for chunk in pd.read_csv('data/LFB Incident data from 2009 - 2017.csv',
                          encoding='utf-8-sig', usecols=['CalYear','IncidentGroup','StopCodeDescription'], chunksize=200000):
    fa_chunks.append(chunk[chunk['IncidentGroup']=='False Alarm'])
fa1 = pd.concat(fa_chunks, ignore_index=True); del fa_chunks; gc.collect()
fa2 = pd.read_excel('data/LFB Incident data from 2018 - 2023.xlsx', engine='openpyxl', usecols=['CalYear','IncidentGroup','StopCodeDescription'])
fa2 = fa2[fa2['IncidentGroup']=='False Alarm']
fa3 = pd.read_excel('data/LFB Incident data from 2024 onwards.xlsx', engine='openpyxl', usecols=['CalYear','IncidentGroup','StopCodeDescription'])
fa3 = fa3[fa3['IncidentGroup']=='False Alarm']
fa_all = pd.concat([fa1,fa2,fa3], ignore_index=True)
fa_all = fa_all[fa_all['CalYear'].between(2014,2025)]
fab = fa_all['StopCodeDescription'].value_counts().head(5)
data['falseAlarmBreakdown'] = {str(k): int(v) for k,v in fab.items()}
del fa1,fa2,fa3,fa_all; gc.collect()

# 3. Fire by property
fire = df[df['IncidentGroup']=='Fire']
fp = fire['PropertyCategory'].value_counts().head(9)
data['fireByProperty'] = {str(k): int(v) for k,v in fp.items()}

# 4. Monthly by ALL types
months = list(range(1,13))
monthly = {}

dwell_m = fire[fire['PropertyCategory']=='Dwelling'].groupby('Month').size()
outdoor_m = fire[fire['PropertyCategory']=='Outdoor'].groupby('Month').size()
monthly['dwelling_fire'] = [int(dwell_m.get(m,0)) for m in months]
monthly['outdoor_fire'] = [int(outdoor_m.get(m,0)) for m in months]

flood = df[df['SpecialServiceType'].str.contains('Flood', case=False, na=False)]
monthly['flooding'] = [int(flood.groupby('Month').size().get(m,0)) for m in months]

entry = df[df['SpecialServiceType'].str.contains('Effecting entry', case=False, na=False)]
monthly['forced_entry'] = [int(entry.groupby('Month').size().get(m,0)) for m in months]

assist = df[df['SpecialServiceType'].str.contains('Assist other agencies', case=False, na=False)]
monthly['agency_assist'] = [int(assist.groupby('Month').size().get(m,0)) for m in months]

fa_df = df[df['IncidentGroup']=='False Alarm']
monthly['false_alarm'] = [int(fa_df.groupby('Month').size().get(m,0)) for m in months]

data['monthlyByType'] = monthly

print('\nMonthly patterns (2014-2025):')
for k,v in monthly.items():
    peak = months[np.argmax(v)]
    trough = months[np.argmin(v)]
    ratio = max(v)/min(v) if min(v)>0 else 0
    print(f'  {k:20s}: peak=month {peak:2d}, trough=month {trough:2d}, peak/trough={ratio:.1f}x')

# 5. SS subtypes by year
ss = df[df['IncidentGroup']=='Special Service']
top_types = ['Effecting entry/exit','Flooding','Assist other agencies','No action (not false alarm)','Medical Incident']
ss_yearly = {}
for t in top_types:
    sub = ss[ss['SpecialServiceType']==t].groupby('CalYear').size()
    ss_yearly[t] = {str(k): int(v) for k,v in sub.to_dict().items()}
data['ssSubtypesByYear'] = ss_yearly

# 6. Borough data with SS growth
name_map = {}
for raw in df['ProperCase'].dropna().unique():
    clean = raw.strip().title().replace(' And ',' and ').replace(' Of ',' of ').replace(' Upon ',' upon ')
    name_map[raw] = clean

pop = {
    'Barking and Dagenham': 232747, 'Barnet': 405050, 'Bexley': 256434,
    'Brent': 352976, 'Bromley': 335319, 'Camden': 216943,
    'City of London': 15111, 'Croydon': 409342, 'Ealing': 385985,
    'Enfield': 327434, 'Greenwich': 299528, 'Hackney': 266758,
    'Hammersmith and Fulham': 188687, 'Haringey': 263850, 'Harrow': 270724,
    'Havering': 276274, 'Hillingdon': 329185, 'Hounslow': 299424,
    'Islington': 223024, 'Kensington and Chelsea': 144518,
    'Kingston upon Thames': 172692, 'Lambeth': 316920, 'Lewisham': 301255,
    'Merton': 218539, 'Newham': 374523, 'Redbridge': 321231,
    'Richmond upon Thames': 196678, 'Southwark': 314786, 'Sutton': 214525,
    'Tower Hamlets': 331886, 'Waltham Forest': 279737,
    'Wandsworth': 337655, 'Westminster': 209996
}

borough_fire = fire.groupby('ProperCase').size().to_dict()
borough_dwell = fire[fire['PropertyCategory']=='Dwelling'].groupby('ProperCase').size().to_dict()
borough_outdoor = fire[fire['PropertyCategory']=='Outdoor'].groupby('ProperCase').size().to_dict()
borough_resp = df.groupby('ProperCase')['FirstPumpArriving_AttendanceTime'].mean().to_dict()

ss_14 = ss[ss['CalYear']==2014].groupby('ProperCase').size().to_dict()
ss_25 = ss[ss['CalYear']==2025].groupby('ProperCase').size().to_dict()

borough_data = {}
for raw, clean in name_map.items():
    p = pop.get(clean, 1)
    tf = borough_fire.get(raw, 0)
    s14 = ss_14.get(raw, 0)
    s25 = ss_25.get(raw, 0)
    ss_growth = round(((s25/s14 - 1)*100), 1) if s14 > 10 else 0
    borough_data[clean] = {
        'totalFire': int(tf),
        'dwellingFire': int(borough_dwell.get(raw, 0)),
        'outdoorFire': int(borough_outdoor.get(raw, 0)),
        'population': p,
        'avgResponseSec': round(borough_resp.get(raw, 0), 1),
        'ssGrowth': ss_growth,
        'ss2014': int(s14),
        'ss2025': int(s25),
    }
data['boroughData'] = borough_data

# 7. Inner vs Outer SS
inner_list = ['Camden','City of London','Hackney','Hammersmith and Fulham','Haringey','Islington',
         'Kensington and Chelsea','Lambeth','Lewisham','Newham','Southwark','Tower Hamlets',
         'Wandsworth','Westminster']
df['Clean'] = df['ProperCase'].map(name_map)
df['IO'] = df['Clean'].apply(lambda x: 'Inner' if x in inner_list else 'Outer')
ss_io = df[df['IncidentGroup']=='Special Service'].groupby(['CalYear','IO']).size().unstack(fill_value=0)
data['ssInnerOuter'] = {
    'years': [int(y) for y in ss_io.index],
    'inner': [int(v) for v in ss_io['Inner']],
    'outer': [int(v) for v in ss_io['Outer']],
}

# 8. SS borough data
ss_borough = {}
for t in ['Effecting entry/exit','Flooding']:
    counts = ss[ss['SpecialServiceType']==t].groupby('ProperCase').size().to_dict()
    mapped = {}
    for raw, clean in name_map.items():
        mapped[clean] = int(counts.get(raw, 0))
    ss_borough[t] = mapped
data['ssBoroughData'] = ss_borough

# 9. IMD quartile data (hardcoded from previous analysis)
data['imdQuartile'] = {
    'labels': ['Q1 (Least deprived)', 'Q2', 'Q3', 'Q4 (Most deprived)'],
    'fireRate': [7.97, 10.51, 11.96, 13.12],
    'responseTime': [332.4, 309.5, 309.7, 297.7],
}

print('\nWriting fire_data.json...')
with open('website/data/fire_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)

total = sum(data['yearlyByType']['falseAlarm'])+sum(data['yearlyByType']['fire'])+sum(data['yearlyByType']['specialService'])
print(f'Total incidents 2014-2025: {total:,}')
print(f'Keys: {list(data.keys())}')

# Print some borough SS growth for scatter plot
print('\nTop SS growth boroughs:')
for b in sorted(borough_data, key=lambda x: borough_data[x]['ssGrowth'], reverse=True)[:8]:
    d = borough_data[b]
    print(f'  {b:30s} SS growth: {d["ssGrowth"]:+.1f}%  resp: {d["avgResponseSec"]:.0f}s')

print('\nDone!')
