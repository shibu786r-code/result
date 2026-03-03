import csv
import boto3

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
table = dynamodb.Table('SebaResults2023')

filename = 'data.csv'

def clean_record(item):
    """Remove empty strings from the record, as DynamoDB doesn't allow them."""
    return {k: str(v).strip() for k, v in item.items() if v and str(v).strip() != ''}

try:
    with open(filename, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        with table.batch_writer() as batch:
            for count, row in enumerate(reader, 1):
                # Construct unique roll number
                roll = row.get('Roll', '').strip()
                no = row.get('No', '').strip()
                unique_roll = f"{roll}-{no}"
                
                # Base record
                student_record = {
                    'RollNumber': unique_roll,
                    'CandidateName': row.get('Candidate_Name', ''),
                    'SchoolName': row.get('School_Name', ''),
                    'Stream': row.get('Stream', ''),
                    'MarksheetNo': row.get('Mark_Sheet_No', ''),
                    'FinalResult': row.get('Remarks1', '')
                }
                
                # Add subject details (up to 16 subjects based on CSV headers)
                for i in range(1, 17):
                    code_key = f'Sub{i}_Code'
                    if row.get(code_key) and row[code_key].strip() != '':
                        student_record[code_key] = row[code_key]
                        student_record[f'Sub{i}_Name'] = row.get(f'Sub{i}_Name', '')
                        student_record[f'Sub{i}_Th_Marks'] = row.get(f'Sub{i}_Th_Marks', '')
                        student_record[f'Sub{i}_Pr_Marks'] = row.get(f'Sub{i}_Pr_Marks', '')
                        student_record[f'Sub{i}_Tot_Marks'] = row.get(f'Sub{i}_Tot_Marks', '')

                # Clean the record of any empty strings before uploading
                cleaned_record = clean_record(student_record)
                
                # Ensure RollNumber is present after cleaning
                if 'RollNumber' in cleaned_record:
                    batch.put_item(Item=cleaned_record)
                
                if count % 100 == 0:
                    print(f"Processed {count} records...")
                    
        print("Upload complete!")

except FileNotFoundError:
    print(f"Error: {filename} not found.")
except Exception as e:
    print(f"An error occurred: {e}")
