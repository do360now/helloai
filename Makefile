VERSION=2.14.24

# ─── Rootless Docker ─────────────────────────────────────
# Point at the rootless per-user socket. ?= preserves any DOCKER_HOST
# already exported by ~/.bashrc for interactive shells; only sets it
# when running from cron or another minimal-env context.
export DOCKER_HOST ?= unix:///run/user/1000/docker.sock

# ─── Azure Config (fill these in) ────────────────────────
AZURE_RG ?= helloai-rg
AZURE_APP ?= helloai-web
DOCKER_IMAGE = do360now/helloai-web

# Develop

run_dev:
	npm run dev

# ─── Discovery (run these first to find your Azure names) ─
az_list_webapps:
	az webapp list --output table --query "[].{Name:name, ResourceGroup:resourceGroup, State:state}"

az_show_container:
	az webapp config container show --name $(AZURE_APP) --resource-group $(AZURE_RG) --output table

# ─── Build ────────────────────────────────────────────────
build_helloai_app:
	NEXT_PUBLIC_APP_VERSION=$(VERSION) npm run build

build_helloai_image:
	docker build --network=host --build-arg APP_VERSION=$(VERSION) -t $(DOCKER_IMAGE):$(VERSION) -t $(DOCKER_IMAGE):latest .

# ─── Push ─────────────────────────────────────────────────
push_helloai_image:
	docker push $(DOCKER_IMAGE):$(VERSION)
	docker push $(DOCKER_IMAGE):latest

# ─── Run locally ──────────────────────────────────────────
run_docker:
	docker run -p 3000:3000 $(DOCKER_IMAGE):$(VERSION)

# ─── Azure Deploy (the new targets) ──────────────────────
az_set_tag:
	az webapp config container set \
		--name $(AZURE_APP) \
		--resource-group $(AZURE_RG) \
		--container-image-name $(DOCKER_IMAGE):$(VERSION)

az_restart:
	az webapp restart \
		--name $(AZURE_APP) \
		--resource-group $(AZURE_RG)

az_logs:
	az webapp log tail \
		--name $(AZURE_APP) \
		--resource-group $(AZURE_RG)

az_deploy: az_set_tag az_restart
	@echo "✅ Azure updated to $(DOCKER_IMAGE):$(VERSION)"
	@echo "   Tailing logs (Ctrl+C to stop)..."
	az webapp log tail --name $(AZURE_APP) --resource-group $(AZURE_RG)

# ─── Full pipeline ────────────────────────────────────────
deploy:
	./verify-all-agents.sh
	$(MAKE) weekly_update
	$(MAKE) bump_version
	$(MAKE) build_helloai_app build_helloai_image push_helloai_image az_deploy

# ─── Weekly Update ────────────────────────────────────────
# Article generation is handled by the /weekly-update Claude Code skill.
weekly_update:
	@echo "Updating leaderboard and data..."
	python3 scripts/weekly_update.py --auto-commit

# ─── Version Management ───────────────────────────────────
bump_version:
	@echo "🔢 Bumping version number..."
	@current=$$(grep '^VERSION=' Makefile | cut -d'=' -f2); \
	major=$$(echo $$current | cut -d'.' -f1); \
	minor=$$(echo $$current | cut -d'.' -f2); \
	patch=$$(echo $$current | cut -d'.' -f3); \
	new_patch=$$(expr $$patch + 1); \
	new_version="$$major.$$minor.$$new_patch"; \
	sed -i "s/^VERSION=.*/VERSION=$$new_version/" Makefile; \
	echo "✅ Version bumped: $$current → $$new_version"

# ─── Cron Setup ───────────────────────────────────────────
setup_weekly_deploy: test_deploy
	@echo "Setting up weekly deployment cronjob (Sundays at midnight)..."
	@echo "⚠️  IMPORTANT: For cronjobs, ensure Azure CLI authentication persists."
	@echo "   Current 'az login' tokens expire. Consider using a service principal:"
	@echo "   az ad sp create-for-rbac --name helloai-deploy --role contributor --scopes /subscriptions/YOUR_SUB_ID"
	@echo ""
	@(crontab -l 2>/dev/null; echo "0 0 * * 0 source /home/cmc/.nvm/nvm.sh && cd $(PWD) && make deploy") | crontab -
	@echo "✅ Cronjob added. Run 'crontab -l' to verify."

remove_weekly_deploy:
	@echo "Removing weekly deployment cronjob..."
	@crontab -l 2>/dev/null | grep -v "make deploy" | crontab -
	@echo "✅ Cronjob removed."

list_cron:
	@echo "Current crontab:"
	@crontab -l

# ─── Azure Validation ─────────────────────────────────────
test_azure_auth:
	@echo "Testing Azure CLI authentication..."
	@az account show --output table || (echo "❌ Not logged in. Run: az login"; exit 1)
	@echo "✅ Azure CLI authenticated"

test_azure_access:
	@echo "Testing access to Azure resources..."
	@az group show --name $(AZURE_RG) --output table || (echo "❌ Cannot access resource group $(AZURE_RG)"; exit 1)
	@az webapp show --name $(AZURE_APP) --resource-group $(AZURE_RG) --output table || (echo "❌ Cannot access webapp $(AZURE_APP)"; exit 1)
	@echo "✅ Azure resources accessible"

test_deploy: test_azure_auth test_azure_access
	@echo "✅ All Azure credentials and access validated!"
	@echo "   The weekly cronjob should work correctly."
