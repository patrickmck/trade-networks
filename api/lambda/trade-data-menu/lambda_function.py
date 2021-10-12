import json
import boto3
import pandas as pd
import numpy as np

import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

def lambda_handler(event, context):
    results = pd.read_csv(s3.get_object(Bucket='dataverse-trade-data', Key='harmonized_system.csv')['Body'])
    results['hscode'] = pd.to_numeric(results['hscode'], errors='coerce')
    results = results.loc[results['hscode']>99999, ['hscode', 'description']].rename(columns={
        'hscode': 'id',
        'description': 'text'
    }).to_dict('records')
    # logger.info(results.columns)
    logger.info(results)
    return json.dumps({"results": results})

