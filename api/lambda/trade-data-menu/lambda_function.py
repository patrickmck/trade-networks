import json
import boto3
import pandas as pd
import numpy as np

import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
s3_resource = boto3.resource('s3')

def lambda_handler(event, context):
    results = pd.read_csv(s3_client.get_object(Bucket='dataverse-trade-data', Key='harmonized_system.csv')['Body'])
    results['hscode'] = pd.to_numeric(results['hscode'], errors='coerce')
    results = results.loc[results['hscode']>99999, ['hscode', 'description']].rename(columns={
        'hscode': 'id',
        'description': 'text'
    })
    logger.info(f'Codes found: {len(results)}')
    
    avail_files = s3_resource.Bucket('dataverse-trade-data').objects.filter(Prefix='hs-product/')
    avail_files = pd.Series([i.key.split('hs-product/')[1].split('.pkl')[0] for i in avail_files])
    logger.info(f'Files in S3: {len(avail_files)}')
    
    avail_files = pd.to_numeric(avail_files, errors='coerce')
    results = results.loc[results['id'].isin(avail_files)]
    results['id'] = results['id'].astype(int)
    logger.info(f'Intersection: {len(results)}')
    
    results = {"results": results.to_dict('records')}
    
    response = s3_client.put_object(
         Body=json.dumps(results),
         Bucket='dataverse-trade-data',
         Key='product_options.json'
    )
    logger.info(response)
    
    return 200

