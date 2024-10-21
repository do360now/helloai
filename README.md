# HelloAi

Automated post generation for X.com

![Screenshot of the app](images/ai_gen_image.png)

## Prerequisites

- Install Ollama with Llama3.2:
  ```sh
  curl -fsSL https://ollama.com/install.sh | sh
  ```
- Run Llama3.2:
  ```sh
  ollama run llama3.2
  ```

## Getting Started

Follow these steps to get started with automated post generation for X.com:

### 1. Clone the Repository
First, clone the repository to your local machine:
```sh
git clone <repository-url>
cd HelloAi
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory and provide your Twitter API credentials:

```
API_KEY=<your-api-key>
API_SECRET=<your-api-secret>
ACCESS_TOKEN=<your-access-token>
ACCESS_SECRET=<your-access-secret>
```
Ensure you replace the placeholders with your actual credentials.

### 3. Install Dependencies
Use `poetry` to install the required dependencies:
```sh
poetry install
```

### 4. Run the Application
Now you can run the script to generate and post tweets every hour:
```sh
poetry run python main.py
```

### 5. Posting Tweets
The application uses Llama3.2 to generate tweets about semiconductors and automatically posts them to X.com (Twitter). Make sure your Twitter credentials are valid and that you have the necessary permissions.

### Notes
- The `.env` file should **never** be committed to the repository to keep your credentials safe.
- The script will run indefinitely, posting a tweet every hour. You can stop it anytime by pressing `Ctrl + C`.

Let me know if you need more information or encounter any issues!

