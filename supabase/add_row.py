import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def insert_report(lat: float, lon: float, image_url: str, report_date: str | None = None, report_state: str | None = None):
    """
    Insert a report into the Supabase database using the insert_report RPC function.
    
    Args:
        lat (float): Latitude coordinate
        lon (float): Longitude coordinate
        image_url (str): URL of the image associated with the report
        report_date (str): Date of the report
        report_state (str): State of the report
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        data = {
            'lat': lat,
            'lon': lon,
            'image_url': image_url
        }
        if report_date:
            data['report_date'] = report_date
        if report_state:
            data['report_state'] = report_state
        response = supabase.rpc('insert_report', data).execute()

        if response.data:
            print("Success:", response.data)
            return response.data
        else:
            print("No data returned")
            return None
            
    except Exception as error:
        print("Error:", error)
        return None

def main():
    # Example usage
    lat = float(40.7128)
    lon = float(-74.0060)
    image_url = "https://example.com/image.jpg"

    # Insert the report
    result = insert_report(lat, lon, image_url)
    
    if result:
        print(f"Report successfully inserted with result: {result}")
    else:
        print("Failed to insert report")

if __name__ == "__main__":
    main()