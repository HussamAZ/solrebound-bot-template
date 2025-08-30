# SolRebound Community Telegram Bot

![Solana](https://img.shields.io/badge/Solana-Blockchain-9945FF?style=for-the-badge&logo=solana)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

This repository contains the source code for the **SolRebound Community Bot**, a customizable Telegram bot designed to help Solana users check their wallets for reclaimable SOL from empty Associated Token Accounts (ATAs).

The bot is designed to be deployed as a white-label solution for community partners, allowing them to offer a valuable tool to their members while generating referral revenue through SolRebound.com.

## 🚀 Features

-   **User-Friendly Interface:** A button-based interface makes it easy for users to interact with the bot without needing to remember commands.
-   **Real-time Wallet Analysis:** Connects to the Solana network via a dedicated RPC to accurately scan for empty ATAs.
-   **Value Estimation:** Calculates the net reclaimable SOL (after platform fees) and provides an estimated value in USD.
-   **Dynamic Price Updates:** Fetches the current SOL/USD price from CoinMarketCap and caches it to provide up-to-date information efficiently.
-   **Partner-Centric:** Easily configurable for different partners with their own unique referral links and branding.
-   **Secure & Private:** The bot only ever interacts with public wallet addresses and never asks for private keys or seed phrases.
-   **Dockerized:** Ready for scalable and isolated deployment using Docker and Docker Compose.

---

## 🛠️ Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher)
-   [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
-   A Telegram Bot Token from [@BotFather](https://t.me/BotFather)
-   An RPC URL from a provider like [Helius](https://helius.dev/)
-   An API Key from [CoinMarketCap](https://coinmarketcap.com/api/)

### ⚙️ Configuration

The bot is configured entirely through environment variables. Create a `.env` file in the root directory for local development.

```env
# --- Telegram Bot Configuration ---
# Get this from @BotFather on Telegram
BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"

# --- Partner Configuration ---
# The full referral link for this specific partner
PARTNER_REFERRAL_LINK="https://solrebound.com/?ref=PARTNER_CODE"
# The numerical Telegram User ID of the partner (for the /partner_stats command)
PARTNER_TELEGRAM_ID="PARTNER_TELEGRAM_USER_ID"

# --- Service API Keys ---
# A reliable Solana RPC URL (Helius is recommended)
RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY"
# CoinMarketCap API Key for price fetching
CMC_API_KEY="YOUR_COINMARKETCAP_API_KEY"
```

📦 Deployment  
This project is designed to be deployed as a Docker container, managed by Docker Compose. The recommended approach is to have a centralized docker-compose.yml file on a server to manage all partner bots.

**Step 1: Automated Docker Image Build**  
The repository is configured with a GitHub Actions workflow (`.github/workflows/main.yml`) that automatically builds and pushes the Docker image to Docker Hub whenever changes are pushed to the main branch.

The image is pushed to: hussamaz/solrebound-community-bot:latest

**Step 2: Running a Bot on the Server**  
SSH into your server.  
Create a dedicated directory for managing the bots (e.g., `~/solrebound-bots`).  
Create a `docker-compose.yml` file with the following structure:

```yaml
version: '3.8'

services:
  partner_name_bot:
    image: hussamaz/solrebound-community-bot:latest
    container_name: partner_name_bot
    restart: unless-stopped
    environment:
      - BOT_TOKEN=...
      - PARTNER_REFERRAL_LINK=...
      - PARTNER_TELEGRAM_ID=...
      - RPC_URL=...
      - CMC_API_KEY=...
```

Launch the bot:

docker compose up -d

**Step 3: Updating All Bots**  
When a new version of the bot is ready (after pushing code to GitHub and the image is rebuilt), simply run the following commands on your server in the `~/solrebound-bots` directory:

# Pull the latest version of the image from Docker Hub
docker compose pull

# Recreate all containers with the new image
docker compose up -d
```

---

## 👨‍💻 Local Development

1- Clone the repository:

git clone https://github.com/HussamAZ/solrebound-bot-template.git
cd solrebound-bot-template

2- Install dependencies:

npm install

3- Create your `.env` file and fill it with your development keys.  

4- Start the bot:

node app.js
