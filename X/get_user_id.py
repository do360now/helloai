from dotenv import load_dotenv
import requests
import os


load_dotenv()
# Get bearer token from environment variables
bearer_token = os.getenv("BEARER_TOKEN")

if not bearer_token:
    raise ValueError("The BEARER_TOKEN environment variable is missing. Please set it and try again.")

def get_user_id_from_username(username):
    url = f"https://api.twitter.com/2/users/by/username/{username}"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "User-Agent": "v2UserLookupPython"
    }
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(
            f"Failed to get user ID for username '{username}': {response.status_code} {response.text}"
        )
    return response.json()['data']['id']

# Example usage in the main function
username = input("Enter the Twitter username: ")
try:
    user_id = get_user_id_from_username(username)
    print(f"User ID for {username} is {user_id}")
except Exception as e:
    print(f"An error occurred: {e}")
