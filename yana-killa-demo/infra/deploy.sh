#!/bin/bash
#
# deploy.sh - Despliegue end-to-end del Yana Killa demo.
#
# Sube el repo (incluyendo data/ pre-seedeado y .env de prod) al EC2,
# copia los certs origen de Cloudflare desde un directorio externo,
# y arranca el stack via docker compose (api + web + nginx).
#
# Uso:   ./infra/deploy.sh
# Pre:   - infra/config.env con PROD_SSH_KEY y PROD_SSH_HOST (autogenerado por setup-prod.sh)
#        - .env en la raiz con DEEPSEEK_API_KEY, PILOT_TOKEN, etc.
#        - data/ generado localmente con `make seed`
#        - certs/yanakilla.{pem,key} accesibles (ajusta CERTS_DIR abajo)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

[ -f "$CONFIG_FILE" ] || { echo "Falta $CONFIG_FILE"; exit 1; }
source "$CONFIG_FILE"

[ -n "${PROD_SSH_KEY:-}" ] || { echo "PROD_SSH_KEY vacio en config.env"; exit 1; }
[ -n "${PROD_SSH_HOST:-}" ] || { echo "PROD_SSH_HOST vacio en config.env"; exit 1; }

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
header() { echo -e "\n${CYAN}========== $1 ==========${NC}"; }
log()    { echo -e "${YELLOW}==> ${1}${NC}"; }
ok()     { echo -e "${GREEN}    ok${NC}"; }

START=$(date +%s)

# ===================== Pre-checks =====================
[ -f "${PROJECT_DIR}/.env" ] || { echo "Falta ${PROJECT_DIR}/.env (DEEPSEEK_API_KEY, PILOT_TOKEN, ALLOWED_ORIGINS)"; exit 1; }
[ -d "${PROJECT_DIR}/data" ] || { echo "Falta ${PROJECT_DIR}/data/ (corre 'make seed' antes)"; exit 1; }

CERTS_DIR="${PROJECT_DIR}/../certs"
[ -f "${CERTS_DIR}/origin.pem" ] || { echo "Falta ${CERTS_DIR}/origin.pem"; exit 1; }
[ -f "${CERTS_DIR}/origin.key" ] || { echo "Falta ${CERTS_DIR}/origin.key"; exit 1; }

REMOTE_DIR="/opt/yanakilla"
SSH_OPTS="-i ${PROD_SSH_KEY} -o StrictHostKeyChecking=no"

# Restablece propiedad de /opt/yanakilla a ec2-user antes del rsync.
# Necesario porque los volume mounts de Docker pueden dejar archivos como root.
ssh ${SSH_OPTS} "$PROD_SSH_HOST" "sudo chown -R ec2-user:ec2-user ${REMOTE_DIR}" >/dev/null 2>&1

header "Subiendo certs Cloudflare"
log "rsync certs/ -> ${PROD_SSH_HOST}:${REMOTE_DIR}/certs/"
rsync -az -e "ssh ${SSH_OPTS}" \
    "${CERTS_DIR}/origin.pem" "${CERTS_DIR}/origin.key" \
    "${PROD_SSH_HOST}:${REMOTE_DIR}/certs/"
ssh ${SSH_OPTS} "$PROD_SSH_HOST" "chmod 600 ${REMOTE_DIR}/certs/origin.key"
ok

header "Subiendo repo (api, web, infra, .env, data)"
log "rsync -> ${PROD_SSH_HOST}:${REMOTE_DIR}/"
rsync -az --delete -e "ssh ${SSH_OPTS}" \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.output' \
    --exclude 'web/dist' \
    --exclude '__pycache__' \
    --exclude '.venv' \
    --exclude 'yanakilla_api.egg-info' \
    --exclude '*.pyc' \
    --exclude 'e2e' \
    --exclude 'docs/' \
    --exclude 'docs-piloto-md/' \
    --exclude 'docs-root-md/' \
    --exclude 'certs/' \
    --include 'data/' \
    --include 'data/**' \
    "${PROJECT_DIR}/" "${PROD_SSH_HOST}:${REMOTE_DIR}/"
ok

header "Build + up del stack en el EC2"
ssh ${SSH_OPTS} "$PROD_SSH_HOST" bash <<REMOTE
set -e
cd ${REMOTE_DIR}
docker compose -f infra/docker-compose.prod.yml pull --ignore-pull-failures || true
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml up -d
# Restart nginx por si los certs llegaron despues del primer arranque del container.
docker compose -f infra/docker-compose.prod.yml restart nginx
sleep 3
docker compose -f infra/docker-compose.prod.yml ps
REMOTE
ok

header "Healthcheck"
log "https://${PROD_FQDN}/health"
sleep 2
curl -fsS "https://${PROD_FQDN}/health" || echo "  (DNS aun no propaga, certs no estan, o app aun arrancando)"
echo ""

ELAPSED=$(( $(date +%s) - START ))
echo ""
echo -e "${GREEN}Deploy completo en ${ELAPSED}s${NC}"
echo "  URL: https://${PROD_FQDN}"
