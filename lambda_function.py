import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SebaResults2023') # Replace with your table name

def lambda_handler(event, context):
    # Support both API Gateway and Function URL
    params = event.get('queryStringParameters', {})
    roll_number = params.get('rollNumber')

    if not roll_number:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing rollNumber'})
        }

    try:
        response = table.get_item(Key={'RollNumber': roll_number})
        item = response.get('Item')
        
        if not item:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*', # CORS
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Result not found'})
            }

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*', # CORS for frontend
                'Content-Type': 'application/json'
            },
            'body': json.dumps(item)
        }

    except ClientError as e:
        print(e.response['Error']['Message'])
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
