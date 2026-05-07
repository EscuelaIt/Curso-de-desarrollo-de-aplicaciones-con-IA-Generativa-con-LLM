#!/bin/bash
#
# teardown-prod.sh - Destruye toda la infra de produccion del Yana Killa demo.
#
# Termina la EC2, espera a que se elimine, borra el SG y el key pair.
# El EBS se conserva (DeleteOnTermination=false) y debe borrarse manualmente
# si ya no lo necesitas.
#
# Uso: ./infra/teardown-prod.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"
RESOURCES_FILE="${SCRIPT_DIR}/prod-resources.txt"

[ -f "$CONFIG_FILE" ] || { echo "Falta $CONFIG_FILE"; exit 1; }
[ -f "$RESOURCES_FILE" ] || { echo "Falta $RESOURCES_FILE (no hay infra creada por setup-prod.sh)"; exit 1; }

source "$CONFIG_FILE"
source "$RESOURCES_FILE"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${YELLOW}Esto va a DESTRUIR los siguientes recursos:${NC}"
echo "  EC2 instance:   $INSTANCE_ID"
echo "  Security group: $EC2_SG_ID"
echo "  Key pair:       $KEY_PAIR_NAME"
echo ""
echo -e "${CYAN}Se conservan (borrar manual si quieres):${NC}"
echo "  EBS volume del EC2 (DeleteOnTermination=false)"
echo "  prod-resources.txt e infra/${KEY_PAIR_NAME}.pem en local"
echo ""
read -p "Estas seguro? (escribe 'destroy'): " CONFIRM
[[ "$CONFIRM" == "destroy" ]] || { echo "Cancelado."; exit 0; }

echo ""
echo -e "${YELLOW}==> Terminando EC2 $INSTANCE_ID...${NC}"
aws ec2 terminate-instances --instance-ids "$INSTANCE_ID" --region "$REGION" >/dev/null
aws ec2 wait instance-terminated --instance-ids "$INSTANCE_ID" --region "$REGION"
echo -e "${GREEN}    ok${NC}"

echo -e "${YELLOW}==> Borrando security group $EC2_SG_ID...${NC}"
aws ec2 delete-security-group --group-id "$EC2_SG_ID" --region "$REGION"
echo -e "${GREEN}    ok${NC}"

echo -e "${YELLOW}==> Borrando key pair $KEY_PAIR_NAME...${NC}"
aws ec2 delete-key-pair --key-name "$KEY_PAIR_NAME" --region "$REGION"
echo -e "${GREEN}    ok${NC}"

echo ""
echo -e "${GREEN}Teardown completo.${NC}"
echo "  Borra manual si quieres: infra/${KEY_PAIR_NAME}.pem y prod-resources.txt"
echo "  Recuerda quitar el registro A en Cloudflare para ${PROD_FQDN}"
