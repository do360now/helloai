#!/usr/bin/env bash
# Turn on App Service persistent /home so view totals written to
# VIEWS_STATE_PATH survive a restart between deploys. No-op when the
# setting is already true. Changing it restarts the container that is
# live right now; deploy.sh runs this after the snapshot is in the
# image and before the new tag is applied.
set -euo pipefail

APP="${AZURE_APP:-helloai-web}"
RG="${AZURE_RG:-helloai-rg}"

current="$(az webapp config appsettings list --name "$APP" --resource-group "$RG" -o json)"
enabled="$(python3 -c 'import json,sys; s={i["name"]: i.get("value") for i in json.load(sys.stdin)}; print(s.get("WEBSITES_ENABLE_APP_SERVICE_STORAGE",""))' <<<"$current")"

if [[ "$enabled" == "true" ]]; then
  echo "App Service /home storage already enabled"
  exit 0
fi

echo "Enabling WEBSITES_ENABLE_APP_SERVICE_STORAGE so view totals survive restarts"
az webapp config appsettings set \
  --name "$APP" \
  --resource-group "$RG" \
  --settings WEBSITES_ENABLE_APP_SERVICE_STORAGE=true \
  --output none
