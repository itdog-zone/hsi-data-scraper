# Stock data scraper

This project will download stock data from various data source

## Setup
The following environment should be included in `.env` file

``` ini
# user login for hsi page
HSI_USERNAME=<hsi_login_username>
HSI_PASSWORD=<hsi_login_password>
# Gighub key
GITHUB_TOKEN=<github_token>
GITHUB_OWNER=<github_owner>
GITHUB_REPO=<github_repo>
# Telegram bot token
TELEGRAM_BOT_TOKEN=<tg_token>
TELEGRAM_BOT_CHAT_ID=<tg_chat_id>
```

## Install dependants

``` bash
npm install
```

## Run

``` bash
# default download today data
node index.js

# download specific date
node index.js --date=2025-06-30

# download by date range
node index.js --from=2025-06-01 --to=2025-06-30

```
