.PHONY: dev api web seed reset test build

dev:
	@echo "Starting API on :8000 and web on :5173..."
	@(cd api && uv run uvicorn app.main:app --reload --port 8000 &) && \
	 (cd web && pnpm dev)

api:
	cd api && uv run uvicorn app.main:app --reload --port 8000

web:
	cd web && pnpm dev

seed:
	cd api && uv run python -m app.scripts.seed

reset:
	rm -f data/index.sqlite*
	rm -rf data/markdown/*
	@echo "Data index reset. Run 'make seed' to repopulate."

test:
	cd api && uv run pytest -v
	cd web && pnpm test

build:
	docker compose build
