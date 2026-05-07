# Walkthrough de infraestructura · `yana-killa-demo`

> Guía conceptual del proyecto de referencia de Clase 5. Explica **el porqué** de cada decisión antes de mirar el código. Léela primero, y después abre los archivos del repo del demo.

---

## 1 · La pregunta arquitectónica del bloque

> *"La app del demo funciona en mi laptop. ¿Qué hace falta para que la use un usuario real, en internet, todos los días?"*

Esa diferencia se compone de seis preocupaciones — y cada una se resuelve con una decisión de infra concreta. Al final de esta guía deberías poder mirar cualquier app LLM y reconocer **dónde** vive cada preocupación.

| # | Preocupación | Pregunta concreta | Dónde se resuelve en `yana-killa-demo` |
|---|---|---|---|
| 1 | **Cómputo** | Dónde corre el código y con qué recursos | EC2 `t3.medium` (4 GB RAM) en us-east-1 |
| 2 | **Estado** | Dónde viven los datos persistentes | EBS gp3 30 GB (SQLite + índices + PDFs) |
| 3 | **Red** | Cómo llegan las peticiones desde internet | Cloudflare → EC2 (HTTP/HTTPS solo desde rangos CF) |
| 4 | **TLS y dominio** | Cómo se ofrece HTTPS sin operar una CA | Cloudflare DNS proxied + origin cert (15 años) |
| 5 | **Empaque** | Cómo se distribuyen los servicios y dependencias | Docker + docker-compose (api, web, nginx) |
| 6 | **Despliegue** | Cómo pasan los cambios de mi laptop al servidor | `rsync` por SSH + `docker compose up -d` |

Lo que **no** se resuelve aquí (y vale la pena nombrarlo explícitamente): observabilidad LLM, evaluación, guardrails, multi-instancia, autoescalado. La sección §9 de esta guía mapea esas brechas.

---

## 2 · Stack en una imagen

```
                                                                
  Internet                                                       
                                                                 
     │                                                           
     │  HTTPS (TLS 1.3)                                          
     ▼                                                           
  ┌──────────────────────────────────────┐                      
  │            Cloudflare (proxied)      │   DNS + DDoS + WAF + 
  │          yanakilla.deepskill.space   │   cache estático      
  └──────────────────────────────────────┘                      
     │                                                           
     │  HTTPS al origin (cert deepskill.pem, 15 años)           
     │  Solo desde rangos IPv4 de Cloudflare                     
     ▼                                                           
  ┌──────────────────────────────────────┐                      
  │  AWS EC2 t3.medium (Amazon Linux 23) │                      
  │  IP pública dinámica · 4 GB RAM      │                      
  │  Swap 4 GB · EBS gp3 30 GB           │                      
  │                                      │                      
  │  ┌──────────────────────────────┐    │                      
  │  │  Docker network "app"        │    │                      
  │  │                              │    │                      
  │  │  ┌───────┐ ┌───────┐ ┌─────┐ │    │                      
  │  │  │ nginx │→│  api  │ │ web │ │    │                      
  │  │  │ :443  │ │ :8000 │ │:3000│ │    │                      
  │  │  └───────┘ └───────┘ └─────┘ │    │                      
  │  │       ▲       ▲              │    │                      
  │  └───────│───────│──────────────┘    │                      
  │   /etc/nginx │  ./data (volumen)     │                      
  │   ./certs    │  SQLite + índices     │                      
  └──────────────────────────────────────┘                      
                                                                 
```

Tres contenedores en **un solo host**. Sin orquestador, sin balanceador, sin réplicas. Esa es la decisión central — y todo lo demás se justifica desde ahí.

---

## 3 · ¿Por qué un solo host? (la decisión central)

| Tamaño esperado | Tráfico | Modelo de despliegue razonable |
|---|---|---|
| Piloto interno (< 50 usuarios) | < 1 req/s sostenido | **1 host** + Docker Compose |
| Producto SaaS (cientos / miles) | 10-100 req/s | Múltiples instancias + LB |
| Multi-tenant a escala | > 100 req/s | Kubernetes / ECS / managed |

`yana-killa-demo` es un **piloto** (un cliente, < 50 usuarios). Toda la infra se calibra para esa escala. La trampa habitual es traer Kubernetes a un piloto: triplica la complejidad operativa y no resuelve ningún problema real del piloto.

**Regla mental para el curso**: empieza por la infra más simple que resuelva tu escala actual. Subir de tier es fácil cuando tienes métricas reales que lo justifiquen; bajar de tier es doloroso.

---

## 4 · Decisiones AWS, una por una

Archivo guía: `infra/setup-prod.sh`. La idea de este script es que toda la infra cabe en un solo bash reproducible — no Terraform, no CDK. La cardinalidad lo permite.

### 4.1 Cómputo: EC2 `t3.medium`

```
EC2_INSTANCE_TYPE="t3.medium"   # 2 vCPU · 4 GB RAM
```

| Por qué | Alternativa descartada | Razón del descarte |
|---|---|---|
| 4 GB RAM caben: BGE-M3 (~2 GB) + uvicorn + tesseract + Node SSR | `t3.small` (2 GB) | OOM al cargar BGE-M3 |
| Burstable: ráfagas de CPU para ingesta de PDFs (OCR + embedding) | `t3.large` (8 GB) | doble coste sin ganancia para el caso |
| ARM `t4g`: ~20% más barato pero faltaba imagen `tesseract-ocr-spa` lista | `t4g.medium` | dependencias OCR en ARM eran fricción extra |
| Lambda / Fargate | — | Cold start + límite de memoria + sin estado local hacen el patrón inviable para RAG con índice SQLite local |

**Idea clave**: la elección de cómputo se hace al revés — "qué necesita mi proceso más pesado" (BGE-M3 cargado en RAM, persistente) y desde ahí eliges el menor tier que lo soporte. No empieces por el tier; empieza por el perfil del proceso.

### 4.2 Estado: EBS gp3 30 GB

```
EBS_SIZE=30
DeleteOnTermination=false
VolumeType=gp3
```

| Decisión | Razonamiento |
|---|---|
| **gp3** y no gp2 | gp3 desacopla IOPS del tamaño: misma capacidad, más rápido y más barato. gp2 ya es legacy en AWS. |
| **30 GB** | BGE-M3 ~2 GB + ~5 GB de markdown/PDFs cacheados + SQLite con vectores ~1 GB + holgura para logs/imágenes Docker |
| **DeleteOnTermination=false** | Si se rompe la instancia, los datos sobreviven. Puedes lanzar una nueva EC2 y montar el volumen. |
| Sin **RDS / Postgres** | El estado total cabe en SQLite; añadir RDS son ~30 USD/mes y otra superficie operativa. Si crece, migras. |
| Sin **S3** | El frontend se sirve desde Node SSR (TanStack Start), no es un static bundle. PDFs se montan como volumen read-only. |

**Idea clave**: para una app LLM con RAG, el "estado" suele ser el índice vectorial. Ese índice es el activo más caro de regenerar (horas de embedding). Tratarlo como dato persistente — no como cache — es el reflejo correcto.

### 4.3 Red: Security Group restringido a Cloudflare

```bash
# Puerto 22 (SSH): solo desde tu IP
# Puerto 80/443: solo desde rangos IPv4 de Cloudflare
CF_IPS_RAW=$(curl -fsS https://www.cloudflare.com/ips-v4)
```

| Decisión | Razonamiento |
|---|---|
| **80/443 cerrados al mundo** | Si alguien encuentra la IP del EC2 (escaneo, DNS leak), no puede llegar al backend. Toda solicitud "legítima" pasa por Cloudflare. |
| **Cloudflare proxied** (modo naranja) | Cloudflare actúa como WAF + cache + anti-DDoS. La IP de origen queda oculta tras la red de Cloudflare. |
| **22 (SSH) solo desde mi IP** | Reduce superficie de ataque. Si tu IP cambia, editas el SG y listo. Alternativa: SSM Session Manager (sin SSH abierto) — no usado aquí para mantener el script simple. |
| Sin **ALB / NLB** | El balanceador no aporta nada con un solo backend; añade ~16 USD/mes y otro punto de configuración. |
| Sin **EIP** (IP elástica) | Cloudflare proxied → la IP pública no se publica nunca. Si la EC2 se reinicia y cambia IP, actualizas el A record. Te ahorras 3.6 USD/mes y una capa. |

**Idea clave**: defense-in-depth no significa "más capas que pueda pagar". Significa "que si una capa falla, otra contiene el daño". Cerrar 80/443 al mundo y dejarlos abiertos solo a Cloudflare es la versión barata de WAF.

### 4.4 Sistema operativo: Amazon Linux 2023

```bash
filters="Name=al2023-ami-2023.*-x86_64"
```

| Por qué AL2023 | Comentario |
|---|---|
| AMI mantenida y reciente (gestor `dnf`, kernel moderno) | AL2 entró en *maintenance* en 2025; AL2023 es la apuesta a 5+ años |
| Optimizada para AWS (cloud-init, agente SSM preinstalado) | Menor superficie que Ubuntu genérico |
| Repos rápidos dentro de la región AWS | `dnf update` arranca en segundos sin salir de la red de AWS |

**Alternativa razonable**: Ubuntu 24.04 LTS si tu equipo ya vive en Ubuntu o necesitas paquetes más nuevos.

### 4.5 Bootstrap del host: `user-data`

El script `setup-prod.sh` inyecta un `user-data` que corre en el primer arranque:

```bash
dnf install -y docker rsync git
systemctl enable --now docker
usermod -aG docker ec2-user

# Docker Compose plugin pinned a v2.30.3
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL ".../v2.30.3/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x ...

# Swap 4 GB
dd if=/dev/zero of=/swapfile bs=128M count=32
mkswap /swapfile && swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

mkdir -p /opt/yanakilla/certs
chown -R ec2-user:ec2-user /opt/yanakilla
```

| Pieza | Por qué |
|---|---|
| `docker compose` versión **pinned** | El "latest" tag a veces incluye un release pre-publicado raro que rompe `compose build`. En producción, pinea. |
| **Swap 4 GB** | El proceso BGE-M3 + el `pnpm build` dentro del contenedor pueden chuparse 5+ GB transitoriamente. Sin swap → OOM kill. Con swap → más lento, pero no muere. |
| `usermod -aG docker ec2-user` | Permite ejecutar `docker compose` sin `sudo` desde la sesión SSH del usuario por defecto. |
| `/opt/yanakilla` con `chown ec2-user` | Carpeta de la app. Está separada de `/home/ec2-user` para que el deploy pueda hacerse aunque el home esté lleno o pertenezca a otro user. |

**Idea clave**: un buen `user-data` deja la máquina lista para recibir el primer deploy sin intervención manual. Si tienes que entrar por SSH a "ajustar algo después de crearla", todavía no terminaste el script.

### 4.6 Lo que NO se aprovisiona

Tan importante como lo que está, es lo que se descartó:

| No usado | Por qué no | Cuándo sí |
|---|---|---|
| **VPC custom** | Default VPC alcanza para 1 host con SG estricto | Multi-tier, subredes privadas, NAT gateway |
| **ALB / NLB** | 1 backend → no hay nada que balancear | ≥ 2 instancias o cert manager AWS-native |
| **RDS / Aurora** | SQLite cabe y es más barato | Multi-host, transacciones cruzadas, alta concurrencia |
| **S3** | Sin static bundle ni archivos de usuario por subir | CDN para assets, lago de datos |
| **CloudWatch dashboards** | El piloto no monetiza el SLA todavía | Cuando un cliente pague por uptime |
| **Auto Scaling Group** | Tráfico predecible y bajo | Picos no predecibles |
| **Secrets Manager** | `.env` rsynceado alcanza para 1 entorno | Multi-cuenta, rotación automatizada |

---

## 5 · Cloudflare como plano de control

Esto no es código del repo, pero es la mitad del diseño. Vale la pena nombrarlo explícitamente.

| Función | Qué aporta | Coste |
|---|---|---|
| **DNS** | A record `yanakilla.deepskill.space → IP del EC2` con TTL bajo (cambia IP sin re-deploy) | 0 USD |
| **TLS al cliente** | Cloudflare termina TLS hacia el navegador con su cert (Let's Encrypt o managed) | 0 USD |
| **TLS al origin** | El backend tiene su propio cert (origin cert de Cloudflare, válido 15 años) | 0 USD |
| **DDoS shield** | Capa 3/4 incluida en plan free | 0 USD |
| **WAF básico** | Reglas managed contra OWASP top 10 (en plan free están limitadas, pero ayudan) | 0 USD |
| **Cache estático** | Frontend SSR no cachea HTML, pero sí JS/CSS hashed | 0 USD |

**Origin certs vs Let's Encrypt**:
- Origin cert: lo emite Cloudflare, válido **solo entre Cloudflare y tu origin**, dura **15 años**, cero rotación. Solo funciona si Cloudflare proxied está activo.
- Let's Encrypt: válido para cualquier cliente, dura 90 días, requiere renovación automática (certbot, lego). Gratis pero más operativa.

Para apps detrás de Cloudflare, el origin cert es la decisión natural: olvidarse de la rotación durante años.

---

## 6 · Empaque: Docker, paso a paso

### 6.1 Por qué Docker (y no `pip install` directo en el host)

| Ventaja | Para qué sirve en este proyecto |
|---|---|
| **Build reproducible** | Mismas dependencias del API en mi laptop y en el EC2 |
| **Aislamiento** | nginx, node y python conviven sin pisarse paths |
| **Rollback trivial** | `docker compose up -d` con la imagen anterior y listo |
| **Onboarding** | Un nuevo dev clona y `docker compose up`. Sin "instala estas 14 cosas". |

### 6.2 `api/Dockerfile`

```dockerfile
FROM python:3.12-slim                     # base mínima Debian
WORKDIR /app
RUN apt-get update && apt-get install -y \
    tesseract-ocr tesseract-ocr-spa \    # OCR (PDFs escaneados en español)
    && rm -rf /var/lib/apt/lists/*
RUN pip install uv                       # instalador rápido
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev                     # instala antes que el código → cache friendly
COPY app ./app
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

| Decisión | Razonamiento |
|---|---|
| **`python:3.12-slim`** | Base de ~80 MB. Alpine es más chica pero compilar `lxml` y `numpy` ahí es doloroso (musl vs glibc). |
| **`tesseract` instalado en imagen** | Si los PDFs son escaneados, OCR es parte del pipeline. Mejor una vez en build que cada vez en runtime. |
| **`uv` en lugar de `pip`** | 10-50× más rápido. Cuando cada deploy reconstruye, la diferencia es notoria. |
| **`COPY pyproject.toml` antes de `COPY app`** | Aprovecha el caché de capas: si el código cambia pero las deps no, no re-instala. |

**Lo que falta para "producción seria"**: usuario no-root (`USER appuser`), `HEALTHCHECK` declarativo, build multi-stage (separar build deps de runtime). El piloto no los necesita; un producto sí.

### 6.3 `web/Dockerfile` (multi-stage)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server-entry.js ./server-entry.js
EXPOSE 3000
CMD ["node", "server-entry.js"]
```

| Decisión | Razonamiento |
|---|---|
| **Multi-stage** | El builder tiene devDependencies + el código fuente; el runner solo lleva lo necesario. La imagen final es la mitad. |
| **`alpine` aquí sí** | Node y JS no compilan código nativo, así que glibc vs musl no importa. Imagen ~150 MB. |
| **`ARG VITE_API_URL=""`** | El frontend se buildea con `""` → llama a rutas relativas (`/api/chat`). Es nginx quien decide a dónde van. Útil para que la imagen sirva en cualquier dominio sin rebuildear. |
| **`pnpm install --frozen-lockfile`** | Falla el build si el lockfile no es exacto. Reproducibilidad real. |
| **SSR con Node** | TanStack Start renderiza en servidor. Si fuera SPA pura, podría servirse desde nginx directo y ahorrar un contenedor. |

### 6.4 `infra/docker-compose.prod.yml`

```yaml
services:
  api:
    build: ../api
    restart: unless-stopped
    env_file: ../.env
    volumes:
      - ../data:/app/data                   # estado persistente
      - ../docs-piloto:/app/docs-piloto:ro  # PDFs read-only
    networks: [app]

  web:
    build:
      context: ../web
      args: { VITE_API_URL: "" }
    restart: unless-stopped
    networks: [app]
    depends_on: [api]

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ../certs:/etc/nginx/certs:ro
    depends_on: [api, web]
    networks: [app]

networks:
  app:
```

| Decisión | Razonamiento |
|---|---|
| **`restart: unless-stopped`** | Si un contenedor crashea, Docker lo reinicia. Si yo lo paro a mano, se queda parado. Es el comportamiento que quiero en un host single-node. |
| **`env_file: ../.env`** | Un único archivo de secretos en la raíz. Limpio para rsync y para `cp .env.example .env`. |
| **Volume `../data:/app/data`** | El índice SQLite + embeddings vive en el host, no en la imagen. Sobrevive a `docker compose down`. |
| **Volume `:ro` para `docs-piloto`** | Los PDFs no deben ser modificados por el contenedor. `:ro` lo hace explícito. |
| **Solo nginx publica puertos** | El api y el web no son accesibles desde fuera del host. La única puerta de entrada es nginx. |
| **Network `app` privada** | Los contenedores se hablan por nombre (`api`, `web`, `nginx`) en una red interna que Docker crea automáticamente. |

**Diferencia con `docker-compose.yml` (dev)**: en dev sí se publica `api:8000` y `web:5173` directo, no hay nginx ni TLS. La separación de `compose.yml` (dev) y `compose.prod.yml` (prod) evita meter `if PROD then …` en un solo archivo.

---

## 7 · nginx: el router y el TLS-terminator

```nginx
# Redirección HTTP → HTTPS
server {
    listen 80 default_server;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    server_name _;

    ssl_certificate     /etc/nginx/certs/deepskill.pem;
    ssl_certificate_key /etc/nginx/certs/deepskill.key;

    client_max_body_size 60m;

    location /api/ {
        proxy_pass         http://api:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_buffering    off;            # ← clave para SSE
        proxy_read_timeout 3600s;          # ← clave para SSE
    }

    location = /health {
        proxy_pass http://api:8000/health;
    }

    location / {
        proxy_pass         http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

| Línea | Por qué |
|---|---|
| `listen 80 ... return 301` | Nadie debe poder hablar HTTP plano con la app. Si llega a 80, redirige. |
| `listen 443 ssl http2` | TLS termina aquí, no en cada contenedor. Todos los demás contenedores hablan HTTP plano dentro de la red privada. |
| `client_max_body_size 60m` | Default de nginx es 1 MB → un PDF subido en `/api/ingest` se rechazaría con `413`. Subimos a 60 MB. |
| **`proxy_buffering off`** | Por defecto nginx **acumula** la respuesta del backend hasta tenerla completa. Para SSE eso significa que el cliente no ve nada hasta que el LLM termina. Off → cada token se reenvía cuando llega. |
| **`proxy_read_timeout 3600s`** | El default (60s) cierra conexiones de streaming largo. Una respuesta LLM con razonamiento puede pasar 5-10 min. 1 hora deja margen y mata cualquier socket realmente colgado. |
| `location = /health` | El `=` fuerza match exacto. Bypass del routing del frontend. Útil para healthchecks externos (Cloudflare, monitor). |
| `location /api/` antes que `location /` | nginx escoge el más específico que matchea. `/api/...` va al backend; todo lo demás al frontend SSR. |
| `proxy_set_header X-Forwarded-*` | Cuando una IP llega filtrada por Cloudflare y luego nginx, perdemos la IP del cliente real si no la propagamos. Estos headers la preservan. |

**Idea clave**: si tu app LLM usa SSE o streaming HTTP, `proxy_buffering off` y un `read_timeout` generoso son **obligatorios** en cualquier proxy delante. Es la causa #1 de "el streaming funciona en local pero no en producción".

---

## 8 · Despliegue: `rsync` + `docker compose up`

Archivo guía: `infra/deploy.sh`. La idea es que un deploy completo cabe en un script de 100 líneas.

### 8.1 Flujo

```
┌────────────────┐                                ┌────────────────┐
│  laptop dev    │                                │  EC2 prod      │
│                │     1. rsync certs/            │                │
│  - código      │ ───────────────────────────►   │  /opt/yanakilla│
│  - .env prod   │     2. rsync repo + data/      │                │
│  - data/       │ ───────────────────────────►   │                │
│  - certs/ (de  │                                │                │
│    devops      │     3. ssh: docker compose      │                │
│    compartido) │        build && up -d           │                │
│                │ ───────────────────────────►   │                │
│                │     4. curl /health             │                │
│                │ ◄───────────────────────────   │                │
└────────────────┘                                └────────────────┘
```

### 8.2 Decisiones de deploy

| Decisión | Razonamiento |
|---|---|
| **Push-mode** (yo empujo desde mi laptop) | No hay agente en el server escuchando webhooks. Menos superficie, menos componentes vivos. |
| **`rsync` en lugar de `git pull`** | El server no necesita acceso al repo (tokens, deploy keys). El `.env` y el `data/` (índice precomputado) **no están en git** y rsync los lleva igual. |
| **`--exclude '.git' 'node_modules' '.venv' '__pycache__'`** | Acelera el rsync y evita que detalles de mi laptop contaminen el server. |
| **`--include 'data/'`** | El índice SQLite + embeddings se genera **una vez** en local con `make seed` (~40 min) y se sube. La EC2 nunca embebe; eso ahorra horas en cada deploy. |
| **Restablecer `chown ec2-user`** antes del rsync | Los volúmenes Docker pueden dejar archivos como `root` después de un run anterior. Sin este chown, rsync falla con permission denied. |
| **`docker compose build` en el server** (no push de imagen) | Para 1 host es más simple que pelearse con un registry. La build es rápida porque las capas se cachean. |
| **`restart nginx` después del up** | A veces los certs llegan justo después del primer up de nginx; el restart asegura que los lea. Hack barato y honesto. |
| **`curl /health`** al final | Verificación viva. Si rompió algo, lo sabes en 30 segundos, no cuando un usuario reporta. |

### 8.3 Secretos: por qué `.env` rsynceado alcanza

| Solución | Cuándo se justifica | Aquí |
|---|---|---|
| `.env` rsynceado | 1 entorno, 1 dev, equipo pequeño | ✅ |
| AWS Secrets Manager | rotación automática, multi-app, multi-cuenta | sobre-ingeniería |
| HashiCorp Vault | dynamic secrets, auditoría completa | enterprise |
| SOPS + git encrypted | secrets versionados con el código | razonable, no implementado |

**Idea clave**: la "mejor" gestión de secretos es la que tu equipo realmente va a usar. Vault sin un humano que lo cuide es peor que un `.env` con permisos correctos.

---

## 9 · Observabilidad: lo mínimo y la trampa

Lo que hay:

| Pieza | Qué da |
|---|---|
| `GET /health` | "el proceso está vivo" |
| `latency_ms` en evento `final` SSE | "el último request tardó X ms" |
| `docker compose logs` | stdout/stderr de cada contenedor |
| `docker compose ps` | qué está corriendo |

Lo que **NO** hay (y es la diferencia entre piloto y producto):

| Falta | Qué resuelve | Herramienta típica |
|---|---|---|
| Logging estructurado de cada llamada LLM | "cuántos tokens estoy gastando, en qué prompts, con qué modelo" | Langfuse, Helicone, Logfire |
| Tracing distribuido | "qué hizo este request específico, paso a paso" | OpenTelemetry + Tempo/Jaeger |
| Métricas Prometheus / dashboards | "tendencia de latencia, error rate, p95" | Prometheus + Grafana |
| Alertas | "avísame si /health cae 3 veces seguidas" | Cloudflare alerts, UptimeRobot |
| Eval continua | "¿la calidad de las respuestas se degradó tras el cambio de prompt?" | Frameworks de eval LLM (deepeval, ragas, promptfoo) |

**Trampa frecuente**: "tengo `/health` y veo CPU en CloudWatch, estoy observando". No. Eso te dice que la máquina respira; no te dice que tu LLM está respondiendo bien o cuánto cuesta. La observabilidad LLM es una capa propia — y es lo primero que se añade cuando un piloto pasa a producto.

---

## 10 · Modos de fallo: integración con la infra

Recap de clase 4 y cómo se monta sobre esta infra:

| Plan | Qué falla | Qué sigue funcionando | Dónde lo soporta la infra |
|---|---|---|---|
| **A** (default) | Nada | Todo | LLM externo (DeepSeek/Claude) vía LiteLLM |
| **B** | Sin internet o LLM externo caído | Chat con LLM local Ollama | Bastaría `LLM_MODEL=ollama/...` en `.env` y un contenedor extra Ollama (no incluido por defecto: requiere modelo descargado) |
| **C** | LLM completamente caído | Búsqueda híbrida BM25+vector con citas (`/buscar`) | Ya en la infra: el index SQLite + sqlite-vec funcionan sin LLM |

**Idea clave**: una buena app LLM **degrada** en lugar de **caerse**. Eso es una decisión arquitectónica que se toma temprano (cuando todavía hay tiempo de poner un fallback en cada capa). Tarde es costoso.

---

## 11 · Teardown: el reverso simétrico

```
./infra/teardown-prod.sh
```

| Qué destruye | Qué sobrevive |
|---|---|
| EC2 instance | EBS volume (DeleteOnTermination=false) |
| Security Group | El `.pem` en local |
| Key pair | `prod-resources.txt` en local |

Tener un teardown es tan importante como el setup. Un script que solo crea infra es media solución: te deja sin forma sistemática de limpiar el entorno (y eso significa cuentas de AWS llenas de recursos huérfanos).

**Idea clave**: cuando demuestres infra-as-code, muestra siempre el ciclo completo `setup → deploy → teardown`. Es lo que separa un *script de creación* de una *infraestructura operada*.

---

## 12 · Tabla maestra de decisiones

| Decisión | Elegimos | Descartamos | Por qué |
|---|---|---|---|
| Cómputo | EC2 t3.medium | t3.small / Lambda / Fargate | RAM mínima para BGE-M3 + estado local persistente |
| Estado | EBS gp3 30 GB | gp2 / RDS | gp3 más rápido y barato; SQLite alcanza |
| Red de entrada | Cloudflare proxied | ALB / EIP | DDoS + WAF + DNS gratis; IP origen oculta |
| TLS al cliente | Cloudflare maneja | certbot + Let's Encrypt en host | sin rotación, una capa menos |
| TLS al origin | Origin cert (15 años) | Let's Encrypt | sin rotación |
| Secrets | `.env` rsynceado | Secrets Manager / Vault | escala adecuada, simple |
| Empaque | Docker Compose | Kubernetes / ECS | 1 host, sin orquestador |
| Frontend | Node SSR contenedor | static + S3+CloudFront | TanStack SSR ya elegido en clase 4 |
| Reverse proxy | nginx alpine | Caddy / Traefik | conocido, soporta SSE bien con buffering off |
| Despliegue | `rsync` + `docker compose` | CI/CD pipeline | escala adecuada, scripts versionados |
| OS | Amazon Linux 2023 | Ubuntu / Debian | mantenida + AWS-native |
| Bootstrap | `user-data` | imagen pre-buildeada | AMI estándar + script reproducible |
| Swap | 4 GB | sin swap | mitiga OOM en build / BGE-M3 |
| Observabilidad | `/health` + `latency_ms` | OTel / Langfuse | brecha consciente — ver §9 |

---

## 13 · Orden de lectura sugerido

Cuando vayas al repo del demo, este es el orden que más rinde: el "porqué" de cada archivo ya está en esta guía, así que abrirlos en este orden hace que cada decisión caiga en su sitio.

| # | Archivo | Lo que se subraya |
|---|---|---|
| 1 | esta guía §1-2 | la pregunta arquitectónica + stack en una imagen |
| 2 | `infra/config.env.example` | qué se parametriza (región, VPC, FQDN), qué no |
| 3 | `infra/setup-prod.sh` | recorrido top-down: SG, key, EC2 + user-data, gp3 |
| 4 | `api/Dockerfile` y `web/Dockerfile` | base mínima + multi-stage + `tesseract-ocr-spa` |
| 5 | `infra/docker-compose.prod.yml` | redes privadas, volúmenes, `restart` |
| 6 | `infra/nginx.conf` | `proxy_buffering off`, `read_timeout 3600s`, redirección 80→443 |
| 7 | `infra/deploy.sh` | rsync + chown defensivo + healthcheck final |
| 8 | `infra/teardown-prod.sh` | el ciclo completo, EBS sobrevive |
| 9 | esta guía §9 | brechas de observabilidad |

Para profundizar después: el `Makefile` del demo expone los targets `seed` y `reset` que muestran cómo se prepara el dato (índice precomputado) antes de un deploy.
