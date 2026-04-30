# London Fire Story

CASA0029 Urban Data Visualisation, UCL 2025/26 group project.

Live site: https://220046.github.io/london_fire_story/

## What is in this repository

```
.
|-- index.html              Single page application
|-- css/styles.css          Styling
|-- js/main.js              Charts, maps, scrollytelling
|-- data/                   Processed JSON the website fetches
|-- image/                  Bridge background photos (Unsplash)
|-- scripts/                Python pipeline that produced data/
|-- reference_data/         Small open datasets used by the scripts
|-- ward/                   2018 London ward shapefile (LondonDataStore)
|-- README.md
`-- .gitignore
```

## Reproducing the processed JSON

The raw London Fire Brigade incident files are too large to host on GitHub
(about 547 MB across three files). To regenerate the contents of `data/`:

1. Download the three raw LFB incident files from the
   [London Datastore](https://data.london.gov.uk/dataset/london-fire-brigade-incident-records)
   under the Open Government Licence v2:
   * `LFB Incident data from 2009 - 2017.csv`
   * `LFB Incident data from 2018 - 2023.xlsx`
   * `LFB Incident data from 2024 onwards.xlsx`
2. Place them in a sibling folder called `data/` next to this repository,
   so the directory layout looks like:
   ```
   project_root/
   |-- data/                 raw LFB files
   |-- ward/                 already in this repo
   |-- reference_data/       already in this repo
   `-- london_fire_story/    this repo
   ```
3. Install dependencies:
   ```
   pip install pandas numpy pyproj geopandas shapely openpyxl scipy
   ```
4. From the parent folder, run the scripts in this order:
   ```
   python london_fire_story/scripts/prepare_data_v2.py
   python london_fire_story/scripts/prepare_grids_v3.py
   python london_fire_story/scripts/prepare_grid_response.py
   python london_fire_story/scripts/prepare_stations.py
   python london_fire_story/scripts/prepare_seasonal_ward.py
   python london_fire_story/scripts/imd_analysis.py
   ```

Each script reads from `data/` (sibling) and writes to `london_fire_story/data/`.

## Script outputs

| Script | Output JSON | Notes |
|---|---|---|
| `prepare_data_v2.py` | `data/fire_data.json` | Aggregated yearly, monthly, borough, IMD quartile statistics |
| `prepare_grids_v3.py` | `data/grid_fire.json`, `grid_fa.json`, `grid_ss.json` | 250m grid choropleth layers |
| `prepare_grid_response.py` | `data/grid_response.json` | First pump attendance time per 250m cell |
| `prepare_stations.py` | `data/stations.json` | 102 active fire stations with incident counts |
| `prepare_seasonal_ward.py` | `data/ward_seasonal.json` | Summer and winter incident counts per ward |
| `imd_analysis.py` | console output | Pearson r between IMD score and fire rate per 1000 population |

## Reference data sources

| File | Source |
|---|---|
| `reference_data/London_wards_id2019_summary_measures.xlsx` | MHCLG English Indices of Deprivation 2019 |
| `reference_data/ward-profiles-excel-version.csv` | Greater London Authority Ward Profiles, London Datastore |
| `reference_data/Metadata.xlsx` | LFB incident records field documentation |
| `reference_data/lfb_stations_source.csv` | Open Data Institute, theodi/FNR_Analysis (geocoded station addresses, 113 rows including 11 closures and duplicates) |
| `ward/London_Ward.shp` | LondonDataStore Statistical GIS Boundary Files for London, 2018 vintage |

## Methodology summary

A roughly 1000 word methodology summary is integrated in the website
conclusion section. Direct link:
https://220046.github.io/london_fire_story/#conclusion

## AI tools used

Claude (Anthropic) and ChatGPT (OpenAI) assisted in scaffolding the website
structure, drafting initial Chart.js, D3, and Mapbox boilerplate, and
reviewing the code. The data preparation scripts were drafted with AI
assistance and reviewed by the team. All analytical claims in the text
were computed directly from the source data files using the scripts in
this repository, and were cross-checked against the script output.

## Licence

Code: see repository licence file.
Data: London Datastore content under Open Government Licence v2.
Bridge background photographs: Unsplash licence, photographers credited
in the website conclusion.
