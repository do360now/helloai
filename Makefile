VERSION=2.14.42

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

# ─── Open AI Stacks (Ollama / Fireconnect) ─────────────────
# Launch open-weight agent stacks for real-world testing.
# Run `make open_stacks_help` for the full menu.
#
# Prerequisites:
#   - ollama (https://ollama.com) — `make open_signin` for cloud models
#   - claude / hermes on PATH (installed by `ollama launch` on first run)
#   - fireconnect (optional) — `make open_fireconnect_install`

OPEN_MODEL_GLM52        ?= glm-5.2:cloud
OPEN_MODEL_DEEPSEEK_PRO ?= deepseek-v4-pro:cloud
OPEN_MODEL_DEEPSEEK_FLASH ?= deepseek-v4-flash:cloud
OPEN_MODEL_KIMI_CODE    ?= kimi-k2.7-code:cloud
OPEN_MODEL_MINIMAX_M3   ?= minimax-m3:cloud

.PHONY: open_stacks_help open_signin open_pull_models \
	open_hermes_glm52 open_claude_glm52 open_claude_deepseek_pro \
	open_claude_deepseek_flash open_claude_kimi_code open_claude_minimax_m3 \
	open_cline_glm52 open_kimi_code_cli \
	open_fireconnect_install open_fireconnect_tiered open_fireconnect_off \
	open_fireconnect_status open_claude_fireconnect_tiered \
	open_aider_install open_aider_deepseek_flash

open_stacks_help:
	@echo "Open-weight agent stacks — launch targets:"
	@echo ""
	@echo "  Setup"
	@echo "    make open_signin                  Ollama cloud auth (required for :cloud models)"
	@echo "    make open_pull_models             Pre-pull all cloud models used below"
	@echo "    make open_fireconnect_install     Install Fireconnect CLI (Claude Code + Fireworks)"
	@echo "    make open_aider_install           Install Aider (pip, cost-optimized coding)"
	@echo ""
	@echo "  Convenience (article stack)"
	@echo "    make open_hermes_glm52            Hermes + GLM-5.2:cloud"
	@echo ""
	@echo "  Peak open coding (Claude Code harness — recommended)"
	@echo "    make open_claude_fireconnect_tiered  OPTIMUM: GLM-latest main + DeepSeek Flash subagents"
	@echo "    make open_fireconnect_tiered         Configure tiered routing only (then run: claude)"
	@echo "    make open_claude_glm52               Claude Code + GLM-5.2:cloud (long-horizon planning)"
	@echo "    make open_claude_deepseek_pro        Claude Code + DeepSeek V4 Pro (peak SWE-bench open)"
	@echo "    make open_claude_deepseek_flash      Claude Code + DeepSeek V4 Flash (best \$$/quality)"
	@echo "    make open_claude_kimi_code           Claude Code + Kimi K2.7 Code (MCP/tool agents)"
	@echo ""
	@echo "  Other harnesses"
	@echo "    make open_cline_glm52               Cline (VS Code) + GLM-5.2:cloud"
	@echo "    make open_kimi_code_cli             Kimi Code CLI + Kimi K2.7 Code"
	@echo "    make open_claude_minimax_m3         Claude Code + MiniMax M3 (multimodal)"
	@echo "    make open_aider_deepseek_flash      Aider + DeepSeek V4 Flash via Ollama"
	@echo ""
	@echo "  Fireconnect management"
	@echo "    make open_fireconnect_status        Show current Claude Code provider + model map"
	@echo "    make open_fireconnect_off           Restore native Anthropic routing"

open_signin:
	@command -v ollama >/dev/null || (echo "❌ ollama not found — install from https://ollama.com"; exit 1)
	@echo "🔐 Signing in to Ollama cloud (required for :cloud models)..."
	ollama signin

open_pull_models:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "📥 Pulling cloud models..."
	ollama pull $(OPEN_MODEL_GLM52)
	ollama pull $(OPEN_MODEL_DEEPSEEK_PRO)
	ollama pull $(OPEN_MODEL_DEEPSEEK_FLASH)
	ollama pull $(OPEN_MODEL_KIMI_CODE)
	ollama pull $(OPEN_MODEL_MINIMAX_M3)
	@echo "✅ Models ready"

# ── Hermes + GLM (convenience; not peak coding performance) ──
open_hermes_glm52:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Hermes + $(OPEN_MODEL_GLM52)"
	ollama launch hermes --model $(OPEN_MODEL_GLM52)

# ── Claude Code + single open model (via Ollama cloud) ──
open_claude_glm52:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Claude Code + $(OPEN_MODEL_GLM52) — long-horizon planning"
	ollama launch claude --model $(OPEN_MODEL_GLM52)

open_claude_deepseek_pro:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Claude Code + $(OPEN_MODEL_DEEPSEEK_PRO) — peak open SWE-bench (~80.6%)"
	ollama launch claude --model $(OPEN_MODEL_DEEPSEEK_PRO)

open_claude_deepseek_flash:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Claude Code + $(OPEN_MODEL_DEEPSEEK_FLASH) — best cost/quality Pareto frontier"
	ollama launch claude --model $(OPEN_MODEL_DEEPSEEK_FLASH)

open_claude_kimi_code:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Claude Code + $(OPEN_MODEL_KIMI_CODE) — MCP/tool-heavy agents"
	ollama launch claude --model $(OPEN_MODEL_KIMI_CODE)

open_claude_minimax_m3:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Claude Code + $(OPEN_MODEL_MINIMAX_M3) — multimodal + 1M context"
	ollama launch claude --model $(OPEN_MODEL_MINIMAX_M3)

# ── Other Ollama-integrated harnesses ──
open_cline_glm52:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Cline + $(OPEN_MODEL_GLM52) — VS Code agent with approval gates"
	ollama launch cline --model $(OPEN_MODEL_GLM52)

open_kimi_code_cli:
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Kimi Code CLI + $(OPEN_MODEL_KIMI_CODE)"
	ollama launch kimi --model $(OPEN_MODEL_KIMI_CODE)

# ── Fireconnect: optimum tiered open stack (Claude Code harness) ──
open_fireconnect_install:
	@echo "📦 Installing Fireconnect..."
	curl -fsSL https://raw.githubusercontent.com/fw-ai/fireconnect/main/install.sh | bash
	@echo "✅ Fireconnect installed. Run: make open_fireconnect_tiered"

open_fireconnect_tiered:
	@command -v fireconnect >/dev/null || (echo "❌ fireconnect not found — run: make open_fireconnect_install"; exit 1)
	@if [ -z "$$FIREWORKS_API_KEY" ] && ! python3 -c "import json,pathlib; c=json.loads(pathlib.Path('$$HOME/.fireconnect/config.json').read_text()); exit(0 if c.get('apiKey') else 1)" 2>/dev/null; then \
		echo "❌ No Fireworks API key found."; \
		echo "   Run make open_fireconnect_install, or set FIREWORKS_API_KEY=fw_..."; \
		echo "   https://app.fireworks.ai/settings/users/api-keys"; \
		exit 1; \
	fi
	@echo "⚙️  Tiered routing: main/opus=glm-latest, sonnet=glm-5p1, haiku/subagent=deepseek-v4-flash"
	@if [ -n "$$FIREWORKS_API_KEY" ]; then \
		fireconnect claude on --api-key "$$FIREWORKS_API_KEY" \
			--main glm-latest --sonnet glm-5p1 \
			--haiku deepseek-v4-flash --subagent deepseek-v4-flash; \
	else \
		fireconnect claude on \
			--main glm-latest --sonnet glm-5p1 \
			--haiku deepseek-v4-flash --subagent deepseek-v4-flash; \
	fi
	@echo "✅ Configured. Start a new Claude Code session: claude"

open_claude_fireconnect_tiered: open_fireconnect_tiered
	@command -v claude >/dev/null || (echo "❌ claude not found on PATH"; exit 1)
	@echo "🚀 Launching Claude Code with Fireconnect tiered open models..."
	claude

open_fireconnect_status:
	@command -v fireconnect >/dev/null || (echo "❌ fireconnect not found — run: make open_fireconnect_install"; exit 1)
	fireconnect claude status

open_fireconnect_off:
	@command -v fireconnect >/dev/null || (echo "❌ fireconnect not found"; exit 1)
	fireconnect claude off
	@echo "✅ Restored native Anthropic Claude Code routing"

# ── Aider: lowest-cost agentic coding ──
open_aider_install:
	@echo "📦 Installing Aider..."
	pip3 install --user aider-chat
	@echo "✅ Aider installed. Ensure Ollama is running, then: make open_aider_deepseek_flash"

open_aider_deepseek_flash:
	@command -v aider >/dev/null || (echo "❌ aider not found — run: make open_aider_install"; exit 1)
	@command -v ollama >/dev/null || (echo "❌ ollama not found"; exit 1)
	@echo "🚀 Aider + Ollama $(OPEN_MODEL_DEEPSEEK_FLASH) — lowest-cost open coding"
	aider --model ollama_chat/$(OPEN_MODEL_DEEPSEEK_FLASH)

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


