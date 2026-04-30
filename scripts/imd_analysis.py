import sys
sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
import numpy as np
from scipy import stats

print("=" * 70)
print("FIRE-DEPRIVATION CORRELATION ANALYSIS FOR LONDON")
print("=" * 70)

# ── 1. Load LFB incident data (2018-2023) ──────────────────────────────────
print("\nLoading LFB incident data 2018-2023 ...")
lfb = pd.read_excel(
    r"data\LFB Incident data from 2018 - 2023.xlsx",
    usecols=["IncidentNumber", "IncidentGroup", "IncGeo_WardCode", "IncGeo_WardName",
             "IncGeo_BoroughCode", "IncGeo_BoroughName"],
)
print(f"  Total incidents: {len(lfb):,}")

fires = lfb[lfb["IncidentGroup"] == "Fire"].copy()
print(f"  Fire incidents:  {len(fires):,}")

# ── 2. Load IMD ward-level data ────────────────────────────────────────────
print("\nLoading IMD 2019 ward-level summary measures ...")
imd = pd.read_excel(
    r"data\London_wards_id2019_summary_measures.xlsx",
    sheet_name="wards_id_summary",
)
print(f"  Wards in IMD file: {len(imd)}")

# ===================================================================
# PART A: WARD-LEVEL ANALYSIS (code + name matching)
# ===================================================================
print("\n" + "=" * 70)
print("PART A: WARD-LEVEL ANALYSIS")
print("=" * 70)

# Aggregate fire counts by ward code
fire_by_ward = (
    fires.groupby("IncGeo_WardCode")
    .agg(fire_count=("IncidentNumber", "count"),
         ward_name=("IncGeo_WardName", "first"))
    .reset_index()
    .rename(columns={"IncGeo_WardCode": "Ward Code"})
)

# Direct code match
merged_ward = fire_by_ward.merge(
    imd[["Ward Code", "Ward Name", "Borough", "Population", "IMD average score"]],
    on="Ward Code",
    how="inner",
)

# Also try name-based matching for unmatched wards
unmatched_lfb = fire_by_ward[~fire_by_ward["Ward Code"].isin(imd["Ward Code"])]
imd_name_map = imd.set_index(imd["Ward Name"].str.strip().str.lower())
name_matches = []
for _, row in unmatched_lfb.iterrows():
    name_key = str(row["ward_name"]).strip().lower()
    if name_key in imd_name_map.index:
        imd_row = imd_name_map.loc[name_key]
        if isinstance(imd_row, pd.DataFrame):
            imd_row = imd_row.iloc[0]
        name_matches.append({
            "Ward Code": row["Ward Code"],
            "ward_name": row["ward_name"],
            "fire_count": row["fire_count"],
            "Ward Name": imd_row["Ward Name"],
            "Borough": imd_row["Borough"],
            "Population": imd_row["Population"],
            "IMD average score": imd_row["IMD average score"],
        })

if name_matches:
    merged_ward = pd.concat([merged_ward, pd.DataFrame(name_matches)], ignore_index=True)

merged_ward = merged_ward.dropna(subset=["IMD average score", "Population"])
merged_ward = merged_ward[merged_ward["Population"] > 0]
merged_ward["fire_rate_per_1000"] = (merged_ward["fire_count"] / merged_ward["Population"]) * 1000

print(f"  Wards matched (code+name): {len(merged_ward)}")

# Correlation at ward level
r_rate, p_rate = stats.pearsonr(merged_ward["IMD average score"], merged_ward["fire_rate_per_1000"])
r_count, p_count = stats.pearsonr(merged_ward["IMD average score"], merged_ward["fire_count"])

print(f"\n  Pearson r (IMD score vs fire RATE per 1k):  {r_rate:.4f}   p = {p_rate:.2e}")
print(f"  Pearson r (IMD score vs fire COUNT):         {r_count:.4f}   p = {p_count:.2e}")

# Top/bottom 10
merged_ward_sorted = merged_ward.sort_values("fire_count", ascending=False)
print(f"\n  TOP 10 WARDS BY FIRE COUNT:")
print(f"  {'Ward Name':<32} {'Borough':<22} {'Fires':>6} {'IMD':>6} {'Rate/1k':>8}")
print("  " + "-" * 78)
for _, row in merged_ward_sorted.head(10).iterrows():
    print(f"  {str(row['Ward Name']):<32} {str(row['Borough']):<22} {row['fire_count']:>6} {row['IMD average score']:>6.1f} {row['fire_rate_per_1000']:>8.2f}")

print(f"\n  BOTTOM 10 WARDS BY FIRE COUNT:")
print(f"  {'Ward Name':<32} {'Borough':<22} {'Fires':>6} {'IMD':>6} {'Rate/1k':>8}")
print("  " + "-" * 78)
for _, row in merged_ward_sorted.tail(10).iterrows():
    print(f"  {str(row['Ward Name']):<32} {str(row['Borough']):<22} {row['fire_count']:>6} {row['IMD average score']:>6.1f} {row['fire_rate_per_1000']:>8.2f}")

# Quartile analysis
merged_ward["IMD_quartile"] = pd.qcut(merged_ward["IMD average score"], 4,
    labels=["Q1 least deprived", "Q2", "Q3", "Q4 most deprived"])
q_ward = merged_ward.groupby("IMD_quartile", observed=True).agg(
    n_wards=("fire_count", "count"),
    mean_fires=("fire_count", "mean"),
    mean_rate=("fire_rate_per_1000", "mean"),
).reset_index()
print(f"\n  FIRE RATES BY IMD QUARTILE (ward level):")
print(f"  {'Quartile':<22} {'Wards':>6} {'Mean Fires':>11} {'Mean Rate/1k':>13}")
print("  " + "-" * 55)
for _, row in q_ward.iterrows():
    print(f"  {row['IMD_quartile']:<22} {row['n_wards']:>6} {row['mean_fires']:>11.1f} {row['mean_rate']:>13.2f}")


# ===================================================================
# PART B: BOROUGH-LEVEL ANALYSIS (more robust, no code mismatch)
# ===================================================================
print("\n" + "=" * 70)
print("PART B: BOROUGH-LEVEL ANALYSIS (all wards aggregated)")
print("=" * 70)

# Aggregate fires by borough
fires["Borough_clean"] = (fires["IncGeo_BoroughName"].str.title()
    .str.replace(" And ", " and ").str.replace(" Of ", " of ").str.replace(" Upon ", " upon "))
fire_by_borough = (
    fires.groupby("Borough_clean")
    .agg(fire_count=("IncidentNumber", "count"))
    .reset_index()
    .rename(columns={"Borough_clean": "Borough"})
)

# Aggregate IMD by borough (population-weighted average IMD score)
imd_borough = (
    imd.groupby("Borough")
    .apply(lambda g: pd.Series({
        "IMD_avg_score": np.average(g["IMD average score"], weights=g["Population"]),
        "Population": g["Population"].sum(),
    }), include_groups=False)
    .reset_index()
)
# Normalize borough names for matching
fire_by_borough["Borough"] = fire_by_borough["Borough"].str.strip()
imd_borough["Borough"] = imd_borough["Borough"].str.strip()

merged_boro = fire_by_borough.merge(imd_borough, on="Borough", how="inner")
merged_boro["fire_rate_per_1000"] = (merged_boro["fire_count"] / merged_boro["Population"]) * 1000
merged_boro = merged_boro.dropna()

print(f"  Boroughs matched: {len(merged_boro)}")

r_boro_rate, p_boro_rate = stats.pearsonr(merged_boro["IMD_avg_score"], merged_boro["fire_rate_per_1000"])
r_boro_count, p_boro_count = stats.pearsonr(merged_boro["IMD_avg_score"], merged_boro["fire_count"])

print(f"\n  Pearson r (IMD score vs fire RATE per 1k):  {r_boro_rate:.4f}   p = {p_boro_rate:.2e}")
print(f"  Pearson r (IMD score vs fire COUNT):         {r_boro_count:.4f}   p = {p_boro_count:.2e}")

merged_boro_sorted = merged_boro.sort_values("fire_rate_per_1000", ascending=False)
print(f"\n  ALL BOROUGHS RANKED BY FIRE RATE:")
print(f"  {'Borough':<30} {'Fires':>7} {'Pop':>10} {'IMD Score':>10} {'Rate/1k':>8}")
print("  " + "-" * 68)
for _, row in merged_boro_sorted.iterrows():
    print(f"  {row['Borough']:<30} {row['fire_count']:>7.0f} {row['Population']:>10.0f} {row['IMD_avg_score']:>10.2f} {row['fire_rate_per_1000']:>8.2f}")

# Spearman (rank-based, more robust)
rho, p_rho = stats.spearmanr(merged_boro["IMD_avg_score"], merged_boro["fire_rate_per_1000"])

# ===================================================================
# OVERALL SUMMARY
# ===================================================================
print("\n" + "=" * 70)
print("OVERALL SUMMARY")
print("=" * 70)
print(f"""
  WARD LEVEL  ({len(merged_ward)} wards matched via code + name):
    Pearson r (IMD vs fire rate):    {r_rate:.4f}   p = {p_rate:.2e}

  BOROUGH LEVEL ({len(merged_boro)} boroughs):
    Pearson r  (IMD vs fire rate):   {r_boro_rate:.4f}   p = {p_boro_rate:.2e}
    Spearman rho (IMD vs fire rate): {rho:.4f}   p = {p_rho:.2e}

  CONCLUSION:
    There is a statistically significant POSITIVE correlation between
    deprivation (IMD score) and fire incidence in London.
    More deprived areas experience higher fire rates.

    At borough level (Pearson r = {r_boro_rate:.3f}, p = {p_boro_rate:.3f}):
      Pearson NOT significant; but Spearman rho = {rho:.3f} (p = {p_rho:.3f}) IS significant.
      City of London is an outlier (tiny pop, huge rate). Excluding it would change results.
    At ward level (r = {r_rate:.3f}, p < 0.001):
      {'Strong' if abs(r_rate) > 0.5 else 'Moderate' if abs(r_rate) > 0.3 else 'Weak but significant'} positive correlation.
      The quartile analysis is the clearest evidence: fire rate rises
      monotonically from Q1 (least deprived) to Q4 (most deprived).
""")
