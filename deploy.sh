#!/bin/bash
# ============================================
# Deploy script - meutatico.com
# Execute na VPS Hostinger
# ============================================
set -e

DOMAIN="meutatico.com"
APP_DIR="/opt/tatica-gestap"
REPO_URL="https://github.com/ataticagestao-tech/meutatico.git"

echo "=========================================="
echo " Deploy Tatica Gestap - $DOMAIN"
echo "=========================================="

# 1. Instalar dependencias
install_deps() {
    echo "[1/6] Instalando dependencias..."
    apt-get update
    apt-get install -y docker.io docker-compose-plugin git curl
    systemctl enable docker
    systemctl start docker
    echo "  Docker: $(docker --version)"
}

# 2. Clonar/atualizar projeto
setup_project() {
    echo "[2/6] Configurando projeto..."
    if [ -d "$APP_DIR" ]; then
        cd "$APP_DIR"
        git pull origin main
    else
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
}

# 3. Gerar chaves secretas
generate_secrets() {
    echo "[3/6] Gerando chaves secretas..."
    JWT_KEY=$(openssl rand -hex 32)
    ADMIN_KEY=$(openssl rand -hex 32)

    sed -i "s|TROCAR-AQUI-GERE-COM-openssl-rand-hex-32|$JWT_KEY|" .env.production
    # Second occurrence
    sed -i "0,/TROCAR-AQUI-GERE-COM-openssl-rand-hex-32/s||$ADMIN_KEY|" .env.production

    echo "  Chaves geradas com sucesso!"
}

# 4. Setup SSL inicial (HTTP first, then HTTPS)
setup_ssl() {
    echo "[4/6] Configurando SSL..."

    # Start with HTTP-only config
    cp nginx/conf.d/initial.conf nginx/conf.d/app.conf
    rm -f nginx/conf.d/default.conf nginx/conf.d/initial.conf 2>/dev/null

    # Build and start services
    docker compose -f docker-compose.prod.yml up -d --build

    echo "  Aguardando servicos iniciarem..."
    sleep 15

    # Get SSL certificate
    echo "  Obtendo certificado SSL..."
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email izabelvier@outlook.com \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN

    # Switch to HTTPS config
    cat > nginx/conf.d/app.conf << 'NGINXCONF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name meutatico.com www.meutatico.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name meutatico.com www.meutatico.com;

    ssl_certificate /etc/letsencrypt/live/meutatico.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meutatico.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /uploads/ {
        proxy_pass http://backend:8000/uploads/;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINXCONF

    # Reload nginx with HTTPS config
    docker compose -f docker-compose.prod.yml restart nginx
    echo "  SSL configurado com sucesso!"
}

# 5. Verificar deploy
verify() {
    echo "[5/6] Verificando deploy..."
    sleep 5

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
    echo "  http://$DOMAIN -> $HTTP_CODE"

    HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "SSL pending")
    echo "  https://$DOMAIN -> $HTTPS_CODE"

    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/v1/financeiro/status 2>/dev/null || echo "pending")
    echo "  API status -> $API_CODE"
}

# 6. Informacoes finais
finish() {
    echo ""
    echo "=========================================="
    echo " Deploy completo!"
    echo "=========================================="
    echo ""
    echo " Site: https://$DOMAIN"
    echo " API:  https://$DOMAIN/api/v1"
    echo " Docs: https://$DOMAIN/docs"
    echo ""
    echo " Comandos uteis:"
    echo "   cd $APP_DIR"
    echo "   docker compose -f docker-compose.prod.yml logs -f"
    echo "   docker compose -f docker-compose.prod.yml restart"
    echo "   docker compose -f docker-compose.prod.yml down"
    echo ""
}

# ============================================
# Executar
# ============================================
case "${1:-full}" in
    full)
        install_deps
        setup_project
        generate_secrets
        setup_ssl
        verify
        finish
        ;;
    update)
        echo "Atualizando..."
        cd "$APP_DIR"
        git pull origin main
        docker compose -f docker-compose.prod.yml up -d --build
        echo "Atualizado!"
        ;;
    ssl)
        cd "$APP_DIR"
        setup_ssl
        ;;
    restart)
        cd "$APP_DIR"
        docker compose -f docker-compose.prod.yml restart
        ;;
    logs)
        cd "$APP_DIR"
        docker compose -f docker-compose.prod.yml logs -f
        ;;
    *)
        echo "Uso: $0 {full|update|ssl|restart|logs}"
        ;;
esac
