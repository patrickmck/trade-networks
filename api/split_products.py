import pandas as pd
import numpy as np
import os

##
## The objective is to arrive at one file per product, covering all years. The data
## comes in the form of one file per year, covering all products.
##
## Three stages to shape it up:
##   1. Read in yearly data, taking care to minimise memory impacts, then record
##      the list of (six-digit) products available in that year.
##   2. Split out each year-product subset as its own pickle file (memory-friendly)
##   3. Get the set of all product codes and collect each of their yearly pickles,
##      concatenating them into one dataframe and writing it out
##


# for year in [2015,2016,2017,2018,2019]:

#     data = pd.read_csv(f'./data/by-year/country_partner_hsproduct6digit_year_{year}.csv', usecols=[
#         'year', 'hs_product_code', 'location_code', 'partner_code', 'export_value'
#     ], dtype={
#         'year': np.int16,
#         'hs_product_code': 'Int64',   # permits null values ...
#         'location_code': str,
#         'partner_code': str,
#         'export_value': np.int32
#     }, na_values='XXXXXX')            # ... which hide bad values
    
#     # # First passthrough
#     # data = data.loc[data['hs_product_code']>99999]
#     # product_codes = sorted(data['hs_product_code'].unique())
#     # pd.Series(product_codes).to_pickle(f'./data/product_codes_{year}.pkl')

#     # Subsequent passes
#     product_codes = pd.read_pickle(f'./data/product_codes_{year}.pkl')
#     for product in product_codes:
#         subset = data.loc[data['hs_product_code']==product]
#         subset.to_pickle(f'./data/by-product-year/{product}_{year}.pkl')
#         print(f'{product} ({len(subset)})')

#     print()
#     print(f'{year}: {len(product_codes)} products')


# Final passthrough to recombine
product_file_list = os.listdir('./data/by-product-year/')
unique_product_codes = sorted(set([i.split('_')[0] for i in product_file_list]))
for product in unique_product_codes:
    file_sublist = [p for p in product_file_list if product in p]
    new_df = pd.DataFrame()
    for p in file_sublist:
        new_df = pd.concat([new_df, pd.read_pickle(f'./data/by-product-year/{p}')])
    new_df.to_pickle(f'./data/hs-product-6/{product}.pkl')
    print(f'{product} pickled')
