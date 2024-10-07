import requests
import os
import json
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get bearer token from environment variables
bearer_token = os.getenv("BEARER_TOKEN")

# Check if the bearer token is provided
if not bearer_token:
    raise ValueError("The BEARER_TOKEN environment variable is missing. Please set it and try again.")

def create_url(user_id):
    """
    Create the URL for fetching the users the specified user is following.
    """
    return f"https://api.twitter.com/2/users/{user_id}/following"

def get_params():
    """
    Define the parameters for the request.
    """
    return {"user.fields": "created_at"}

def bearer_oauth(r):
    """
    Method required by bearer token authentication.
    """
    r.headers["Authorization"] = f"Bearer {bearer_token}"
    r.headers["User-Agent"] = "v2FollowingLookupPython"
    return r

def connect_to_endpoint(url, params):
    """
    Connect to the Twitter API endpoint.
    """
    response = requests.request("GET", url, auth=bearer_oauth, params=params)
    
    if response.status_code == 401:
        raise Exception(
            "Request returned a 401 Unauthorized error. "
            "Please check if your bearer token is valid and has the correct access permissions."
        )
    elif response.status_code == 403:
        raise Exception(
            "Request returned a 403 Forbidden error. Ensure your app is attached to a Project "
            "and has the appropriate API access level in the Twitter Developer Portal."
        )
    elif response.status_code != 200:
        raise Exception(
            f"Request returned an error: {response.status_code} {response.text}"
        )
    
    return response.json()

def main():
    # Get user_id from command line argument or prompt the user
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
    else:
        user_id = input("Enter the user ID of the account whose following list you want to retrieve: ")

    try:
        # Ensure the user_id provided is not a username (use numeric Twitter user ID)
        if not user_id.isdigit():
            raise ValueError("The provided user ID must be a numeric Twitter user ID.")

        url = create_url(user_id)
        params = get_params()
        json_response = connect_to_endpoint(url, params)
        print(json.dumps(json_response, indent=4, sort_keys=True))
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
