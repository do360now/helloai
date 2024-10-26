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

To get your API Key, API Secret, Access Token, and Bearer Token from the X platform (formerly Twitter), follow these steps:

1. **Create a Developer Account**:
   - Go to the [Twitter Developer Portal](https://developer.twitter.com/) and sign in with your X account.
   - If you haven't already, apply for a developer account by filling in the required details. This will include specifying the intended use of the API and agreeing to their terms.

2. **Create a Project and App**:
   - Once you're approved as a developer, navigate to the "Projects & Apps" section and create a new project if you don’t have one.
   - Inside the project, create an app by giving it a name and selecting the relevant permissions (like read, write, and direct messages if needed).

3. **Generate API Keys and Tokens**:
   - Once your app is created, go to the "Keys and tokens" section of the app.
   - Here, you’ll find the **API Key** and **API Secret Key**. You can also generate the **Bearer Token**.
   - Scroll down to the "Access Token & Secret" section. You might need to generate these by clicking on "Generate".

4. **Store Your Keys Securely**:
   - After generating these keys and tokens, store them securely. For example, you can put them in a `.env` file as you have shown in your image for use in your applications.

Remember, be careful not to expose these credentials publicly, as they can be used to access your account’s API functions.

Let me know if you need more details!