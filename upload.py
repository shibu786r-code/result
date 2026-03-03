import csv
import boto3

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
table = dynamodb.Table('SebaResults2023')

filename = 'data.csv'

def clean_record(item):
    """Remove empty strings as DynamoDB doesn't allow them."""
    return {k: str(v).strip() for k, v in item.items() if v and str(v).strip() != ''}

try:
    with open(filename, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        with table.batch_writer() as batch:
            for count, row in enumerate(reader, 1):
                roll = row.get('Roll', '').strip()
                no = row.get('No', '').strip()
                unique_roll = f"{roll}-{no}"
                
                # Capture all base fields correctly
                student_record = {
                    'RollNumber': unique_roll,
                    'CandidateName': row.get('Candidate_Name', ''),
                    'SchoolName': row.get('School_Name', ''),
                    'Stream': row.get('Stream', ''),
                    'Date': row.get('Date', ''),
                    'Total_Marks_in_Words': row.get('Total_Marks_in_Words', ''),
                    'Total_Marks_in_Figure': row.get('Total_Marks_in_Figure', ''),
                    'FinalResult': row.get('Result', ''), # Fixed: AHSEC Result column
                    'ENVE_Grade': row.get('ENVE_Grade', '')
                }
                
                # Capture ALL 16 subject slots
                for i in range(1, 17):
                    code = row.get(f'Sub{i}_Code', '').strip()
                    if code:
                        student_record[f'Sub{i}_Code'] = code
                        student_record[f'Sub{i}_Pap_Indicator'] = row.get(f'Sub{i}_Pap_Indicator', 'CORE')
                        student_record[f'Sub{i}_Name'] = row.get(f'Sub{i}_Name', '')
                        student_record[f'Sub{i}_Th_Marks'] = row.get(f'Sub{i}_Th_Marks', '')
                        student_record[f'Sub{i}_Pr_Marks'] = row.get(f'Sub{i}_Pr_Marks', '')
                        student_record[f'Sub{i}_Tot_Marks'] = row.get(f'Sub{i}_Tot_Marks', '')

                cleaned_record = clean_record(student_record)
                if 'RollNumber' in cleaned_record:
                    batch.put_item(Item=cleaned_record)
                
                if count % 100 == 0:
                    print(f"Uploaded {count} records...")
                    
        print("Upload complete! Now your database has all subjects and marks.")

except Exception as e:
    print(f"Error: {e}")
