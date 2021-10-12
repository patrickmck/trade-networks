import json
import boto3

import pandas as pd


s3 = boto3.client('s3')

def s3_download_countries():
    return s3.get_object(Bucket='dataverse-trade-data', Key='country_codes.csv')['Body']

def s3_download_pickle(filename):
    s3.download_file(Bucket='dataverse-trade-data', Key=f'hs-product/{filename}.pkl', Filename=f'/tmp/{filename}.pkl')
    with open(f'/tmp/{filename}.pkl', 'rb') as f:
        df = pd.read_pickle(f)
    return df

import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    
    try:
        product_code = str(event['product_code'])
        logger.info(f'product code: {product_code}')
        df = s3_download_pickle(product_code)
        logger.info(df)
    except (Exception, ValueError, NameError) as e:
        logger.info('something went wrong')
        logger.info(e)
        logger.info(f'event: {event}')
        return {
            'statusCode': 404,
            'body': json.dumps('Failed - could not find `product_code`')
        }
        
    
    ##
    ## First calculate the top n importers and exporters, then calculate:
    ##   (a) Their total volumes per year, to supply the node-level data
    ##   (b) Their trade volumes with each of the other top countries, to
    ##       supply the link-level data
    ##
    top_n = 10
    
    im_top = df.groupby('partner_code')['export_value'].sum().reset_index()
    im_top = im_top.sort_values('export_value', ascending=False).head(n=top_n)
    top_importers = im_top['partner_code'].to_list()
    
    ex_top = df.groupby('location_code')['export_value'].sum().reset_index()
    ex_top = ex_top.sort_values('export_value', ascending=False).head(n=top_n)
    top_exporters = ex_top['location_code'].to_list()
    
    top_countries = sorted(set(top_importers + top_exporters))
    
    top_trade = df.loc[
        (df['location_code'].isin(top_exporters)) &
        (df['partner_code'].isin(top_importers))
    ].rename(columns={
        'location_code': 'source',
        'partner_code': 'target',
        'export_value': 'volume',
    }).sort_values('volume', ascending=False)
    
    logger.info(top_trade)
    
    ##
    ## Top xxports provides the link-level data (volume per bilateral pair per year)
    ## while pivoting total volumes per country by year prepares the node-level data
    ## to be broken down into a dictionary of {year: volume} values.
    ##
    
    top_importer_volumes = df.loc[df['partner_code'].isin(top_importers)]\
        .groupby(['partner_code', 'year'])['export_value'].sum().reset_index()
    top_importer_volumes = top_importer_volumes.pivot(index='partner_code', columns='year', values='export_value').to_dict('index')
    
    top_exporter_volumes = df.loc[df['location_code'].isin(top_exporters)]\
        .groupby(['location_code', 'year'])['export_value'].sum().reset_index()
    top_exporter_volumes = top_exporter_volumes.pivot(index='location_code', columns='year', values='export_value').to_dict('index')
    
    ##
    ## Given a country c, return year-by-year volumes per partner country
    ##
    def get_trade_links(country, flowtype):
        if flowtype=='export':
            flow_data = top_trade.loc[top_trade['source']==country]
            logger.info('flow data:')
            logger.info(flow_data)
            partner_data = flow_data.groupby(['target', 'year'])['volume'].sum().reset_index()
            partner_data = partner_data.pivot(index='target', columns='year', values='volume')
        elif flowtype=='import':
            flow_data = top_trade.loc[top_trade['target']==country]
            partner_data = flow_data.groupby(['source', 'year'])['volume'].sum().reset_index()
            partner_data = partner_data.pivot(index='source', columns='year', values='volume')
        else:
            raise('Bad flowtype in get_trade_links')
            
        
        partner_data = partner_data.fillna(0).astype(int)
    #     print(country)
    #     print(partner_data)
    #     print()
        return partner_data.to_dict('index')
    
    
    ## 
    ## Final output data should look like:
    ## {
    ##   nodes: [ {name: n, lat: y, lon: x, volume: {year: v, ...}, ... ],
    ##   links: [ {source: n1, target: n2, volume: {year: v, ...}, ... ]
    ## }
    ## 
    ## 
    
    output_nodes = []
    output_links = []
    
    country_codes = pd.read_csv(s3_download_countries()).set_index('alpha3')
    
    for country in top_countries:
        ##
        ## Some countries may be both top importers and top exporters, so rather
        ## than type={import, export}, use type=[0,1] where 0 = 'purely imports'
        ##
        if country in top_importer_volumes.keys():
            # Each bilateral link only needs to be included once - because of the
            # way the if-else is structured below, it's easiest to count links at
            # the import node, to catch trade with both 'pure' and 'mixed' nodes
            
            import_links = get_trade_links(country, 'import')
            output_links.extend([
                {
                    "source": partner,
                    "target": country,
                    "volume": volumes
                }
                for partner, volumes in import_links.items()
            ])
            
            if country in top_exporter_volumes.keys():
                # Then this country has both inflows and outflows to account for
                total_volume = {
                    i: v + top_exporter_volumes[country][i]
                    for i,v in top_importer_volumes[country].items()
                }
                vol_mixture = {
                    i: round(v / total_volume[i],3)
                    for i,v in top_importer_volumes[country].items()
                }
                output_nodes.append({
                    "name": country,
                    "name_full": country_codes.loc[country, 'name'],
                    "lat": country_codes.loc[country, 'latitude'],
                    "lon": country_codes.loc[country, 'longitude'],
                    "type": vol_mixture,
                    "volume": total_volume,
                })
            else:
                output_nodes.append({
                    "name": country,
                    "name_full": country_codes.loc[country, 'name'],
                    "lat": country_codes.loc[country, 'latitude'],
                    "lon": country_codes.loc[country, 'longitude'],
                    "type": {i: 0 for i in top_importer_volumes[country].keys()},
                    "volume": top_importer_volumes[country],
                })
        else:
            output_nodes.append({
                "name": country,
                "name_full": country_codes.loc[country, 'name'],
                "lat": country_codes.loc[country, 'latitude'],
                "lon": country_codes.loc[country, 'longitude'],
                "type": {i: 1 for i in top_exporter_volumes[country].keys()},
                "volume": top_exporter_volumes[country],
            })
    
    # print()
    # print(output_nodes)
    # print()
    # print(output_links)
    
    output_data = {
        "nodes": output_nodes,
        "links": output_links
    }
    
    logger.info('completed extraction')
    
    return {
        'statusCode': 200,
        'body': json.dumps(output_data)
    }

