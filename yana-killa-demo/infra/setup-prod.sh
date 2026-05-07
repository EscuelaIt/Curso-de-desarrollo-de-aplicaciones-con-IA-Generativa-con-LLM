#!/bin/bash
#
# setup-prod.sh - Provisiona infraestructura AWS de produccion para Yana Killa demo.
#
# Crea: Security Group, Key Pair, EC2 t3.medium con Docker + swap.
# NO crea EIP (IP publica dinamica detras de Cloudflare proxied).
# NO crea S3 ni RDS (frontend SSR + SQLite local en EBS).
#
# Uso: ./infra/setup-prod.sh
# Pre: AWS CLI configurado en tu cuenta
#      infra/config.env (copiar desde infra/config.env.example)

set -euo pipefail

# ===================== LOAD CONFIG =====================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: config file not found: $CONFIG_FILE"
    echo "Copia infra/config.env.example a infra/config.env y completa los valores."
    exit 1
fi

source "$CONFIG_FILE"

# ===================== CONFIGURATION =====================
PROJECT="yanakilla"
ENV_NAME="prod"
TAG_PREFIX="${PROJECT}-${ENV_NAME}"

EC2_INSTANCE_TYPE="t3.medium"      # 4GB RAM (BGE-M3 ~2GB + uvicorn + tesseract + node SSR)
KEY_PAIR_NAME="${TAG_PREFIX}-key"
KEY_FILE="${SCRIPT_DIR}/${KEY_PAIR_NAME}.pem"
EBS_SIZE=30                        # GB gp3 (modelo BGE + cache markdown + SQLite + PDFs)

# ===================== COLORS =====================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log_step()    { echo -e "\n${YELLOW}[$1] $2${NC}"; }
log_success() { echo -e "${GREEN}  ok $1${NC}"; }
log_info()    { echo -e "${CYAN}  i  $1${NC}"; }
log_error()   { echo -e "${RED}  x  $1${NC}"; }

# ===================== PRE-FLIGHT =====================
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Yana Killa demo - Infra de prod   ${NC}"
echo -e "${GREEN}================================================${NC}"

command -v aws >/dev/null || { log_error "AWS CLI no instalado"; exit 1; }

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text --region "$REGION") || {
    log_error "credenciales AWS no configuradas"; exit 1;
}
log_info "AWS Account: $AWS_ACCOUNT | Region: $REGION"

aws ec2 describe-vpcs --vpc-ids "$VPC_ID" --query 'Vpcs[0].VpcId' --output text --region "$REGION" >/dev/null || {
    log_error "VPC $VPC_ID no encontrada"; exit 1;
}

# ===================== CLOUDFLARE IP RANGES =====================
log_info "Descargando rangos IPv4 de Cloudflare..."
CF_IPS_RAW=$(curl -fsS https://www.cloudflare.com/ips-v4 || true)
if [ -z "$CF_IPS_RAW" ]; then
    log_error "no pude descargar https://www.cloudflare.com/ips-v4"
    exit 1
fi
CF_IPS=()
while IFS= read -r cidr; do
    [ -n "$cidr" ] && CF_IPS+=("$cidr")
done <<< "$CF_IPS_RAW"
log_info "Cloudflare IPv4 ranges: ${#CF_IPS[@]}"

# IP para SSH
echo ""
read -p "Tu IP para SSH (vacio = 0.0.0.0/0): " SSH_CIDR
SSH_CIDR="${SSH_CIDR:-0.0.0.0/0}"
[[ "$SSH_CIDR" != *"/"* ]] && SSH_CIDR="${SSH_CIDR}/32"

echo ""
echo -e "${YELLOW}Resumen:${NC}"
echo "  Account:    $AWS_ACCOUNT"
echo "  VPC:        $VPC_ID"
echo "  EC2:        $EC2_INSTANCE_TYPE | ${EBS_SIZE}GB gp3 (DeleteOnTermination=false) | IP publica dinamica"
echo "  FQDN:       $PROD_FQDN  (Cloudflare proxied -> EC2)"
echo "  SSH desde:  $SSH_CIDR"
echo ""
read -p "Continuar? (y/N): " CONFIRM
[[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]] || { echo "Cancelado."; exit 0; }

# ===================== 1. SUBNETS =====================
log_step "1/5" "Obteniendo subnets de la VPC..."
SUBNET_IDS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC_ID" \
    --query 'Subnets[*].SubnetId' --output text --region "$REGION")
FIRST_SUBNET=$(echo "$SUBNET_IDS" | awk '{print $1}')
log_success "Primera subnet: $FIRST_SUBNET"

# ===================== 2. SECURITY GROUP =====================
log_step "2/5" "Creando security group..."
EC2_SG_ID=$(aws ec2 create-security-group \
    --group-name "${TAG_PREFIX}-ec2-sg" \
    --description "Yana Killa demo prod - EC2 (HTTP/HTTPS via Cloudflare, SSH)" \
    --vpc-id "$VPC_ID" --query 'GroupId' --output text --region "$REGION")

aws ec2 create-tags --resources "$EC2_SG_ID" \
    --tags Key=Name,Value="${TAG_PREFIX}-ec2-sg" Key=Environment,Value="$ENV_NAME" Key=Project,Value="$PROJECT" \
    --region "$REGION"

aws ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" --region "$REGION" \
    --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=${SSH_CIDR},Description=SSH}]" \
    > /dev/null

CF_RANGES_80=""
CF_RANGES_443=""
for cidr in "${CF_IPS[@]}"; do
    CF_RANGES_80="${CF_RANGES_80}{CidrIp=${cidr},Description=Cloudflare},"
    CF_RANGES_443="${CF_RANGES_443}{CidrIp=${cidr},Description=Cloudflare},"
done
CF_RANGES_80="${CF_RANGES_80%,}"
CF_RANGES_443="${CF_RANGES_443%,}"

aws ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" --region "$REGION" \
    --ip-permissions \
    "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[${CF_RANGES_80}]" \
    "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[${CF_RANGES_443}]" \
    > /dev/null

log_success "EC2 SG: $EC2_SG_ID (22 desde tu IP, 80/443 solo desde Cloudflare)"

# ===================== 3. KEY PAIR =====================
log_step "3/5" "Creando key pair EC2..."
aws ec2 create-key-pair --key-name "$KEY_PAIR_NAME" \
    --query 'KeyMaterial' --output text --region "$REGION" > "$KEY_FILE"
chmod 400 "$KEY_FILE"
log_success "Key: $KEY_FILE"

# ===================== 4. EC2 INSTANCE =====================
log_step "4/5" "Lanzando EC2 ($EC2_INSTANCE_TYPE)..."
AMI_ID=$(aws ec2 describe-images --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023.*-x86_64" "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text --region "$REGION")
log_info "AMI: $AMI_ID (Amazon Linux 2023)"

USER_DATA=$(cat <<'USERDATA'
#!/bin/bash
set -e
dnf update -y
dnf install -y docker rsync git
systemctl enable --now docker
usermod -aG docker ec2-user

# Docker Compose plugin (pin a version que soporta `docker compose build` con la version
# de buildx que trae AL2023). El "latest" tag puede traer un release pre-publicado raro.
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.30.3/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Swap 4GB (mitiga OOM en builds Docker y en runtime con BGE-M3)
dd if=/dev/zero of=/swapfile bs=128M count=32
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

# Carpeta de la app (rsynceada por deploy.sh)
mkdir -p /opt/yanakilla/certs
chown -R ec2-user:ec2-user /opt/yanakilla
USERDATA
)

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" --instance-type "$EC2_INSTANCE_TYPE" \
    --key-name "$KEY_PAIR_NAME" --security-group-ids "$EC2_SG_ID" \
    --subnet-id "$FIRST_SUBNET" --user-data "$USER_DATA" \
    --block-device-mappings "[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":${EBS_SIZE},\"VolumeType\":\"gp3\",\"DeleteOnTermination\":false}}]" \
    --tag-specifications \
        "ResourceType=instance,Tags=[{Key=Name,Value=${TAG_PREFIX}-app},{Key=Environment,Value=${ENV_NAME}},{Key=Project,Value=${PROJECT}}]" \
        "ResourceType=volume,Tags=[{Key=Name,Value=${TAG_PREFIX}-vol},{Key=Environment,Value=${ENV_NAME}},{Key=Project,Value=${PROJECT}}]" \
    --query 'Instances[0].InstanceId' --output text --region "$REGION")
log_success "EC2: $INSTANCE_ID"

aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"
log_success "EC2 corriendo"

# ===================== 5. IP PUBLICA + prod-resources.txt =====================
log_step "5/5" "Obteniendo IP publica dinamica..."

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text --region "$REGION")
log_success "IP publica: $PUBLIC_IP (dinamica - cambia si la instancia se reinicia)"

RESOURCES_FILE="${SCRIPT_DIR}/prod-resources.txt"
cat > "$RESOURCES_FILE" <<EOF
# Yana Killa demo - Recursos de produccion
# Generado: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

REGION=${REGION}
VPC_ID=${VPC_ID}
EC2_SG_ID=${EC2_SG_ID}
KEY_PAIR_NAME=${KEY_PAIR_NAME}
INSTANCE_ID=${INSTANCE_ID}
PUBLIC_IP=${PUBLIC_IP}
PROD_FQDN=${PROD_FQDN}
EOF

# Auto-actualizar config.env con deploy targets
sed -i.bak "s|^PROD_SSH_KEY=.*|PROD_SSH_KEY=\"${KEY_FILE}\"|; s|^PROD_SSH_HOST=.*|PROD_SSH_HOST=\"ec2-user@${PUBLIC_IP}\"|" "$CONFIG_FILE"
rm -f "${CONFIG_FILE}.bak"

# ===================== SUMMARY =====================
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Infraestructura creada                         ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "  ${CYAN}EC2:${NC}        $INSTANCE_ID ($EC2_INSTANCE_TYPE)"
echo -e "  ${CYAN}IP publica:${NC} $PUBLIC_IP (dinamica)"
echo -e "  ${CYAN}Key:${NC}        $KEY_FILE"
echo ""
echo -e "${YELLOW}Proximos pasos:${NC}"
echo ""
echo "  1. DNS en Cloudflare:"
echo "     A  ${PROD_FQDN%%.*}  ${PUBLIC_IP}  Proxied (naranja)"
echo ""
echo "  2. Pre-seed local del indice (~40 min, una sola vez):"
echo "     make seed   # genera ./data/ con embeddings de los 8 PDFs"
echo ""
echo "  3. Configura el .env de produccion en la raiz del repo:"
echo "     LLM_MODEL=deepseek/deepseek-chat"
echo "     LLM_MODELS=deepseek/deepseek-chat,deepseek/deepseek-reasoner"
echo "     DEEPSEEK_API_KEY=sk-..."
echo "     PILOT_TOKEN=\$(python -c 'import secrets; print(secrets.token_urlsafe(24))')"
echo "     ALLOWED_ORIGINS=https://${PROD_FQDN}"
echo ""
echo "  4. Primer deploy:"
echo "     ./infra/deploy.sh"
echo ""
echo "  5. Verificar:"
echo "     curl https://${PROD_FQDN}/health"
echo "     open  https://${PROD_FQDN}"
echo ""
echo -e "  ${CYAN}IDs guardados en:${NC} $RESOURCES_FILE"
echo ""
