# Guia de Deploy — Tatica Gestap em VPS com Domínio

## Pré-requisitos

Antes de começar, você precisa:

1. **Uma VPS** (servidor virtual) — recomendações:
   - DigitalOcean Droplet: 2 vCPU, 4GB RAM (~$24/mês = ~R$120/mês)
   - Hetzner Cloud CX22: 2 vCPU, 4GB RAM (~€4/mês = ~R$25/mês) ← melhor custo-benefício
   - Escolha Ubuntu 22.04 LTS como sistema operacional

2. **Um domínio registrado** (ex: meutatico.com):
   - Registro.br (~R$40/ano para .com.br)
   - Cloudflare Registrar (~$10/ano para .com)
   - Namecheap (~$9/ano para .com)

3. **Seu código no GitHub** (repositório privado recomendado)

---

## Passo 1: Preparar credenciais (NO SEU COMPUTADOR)

**IMPORTANTE:** Faça isso ANTES de subir para o servidor.

```bash
# 1. Revogar credenciais expostas:
# - Supabase: https://supabase.com/dashboard → Settings → API → Regenerar chave
# - Google: https://console.cloud.google.com → Credenciais → Revogar e criar novo

# 2. Gerar novas chaves JWT (rode no terminal):
openssl rand -hex 32
# Copie o resultado — será seu JWT_SECRET_KEY

openssl rand -hex 32
# Copie o resultado — será seu SUPER_ADMIN_SECRET_KEY

# 3. Anote tudo em local seguro (gerenciador de senhas)
```

---

## Passo 2: Configurar DNS

No painel do seu registrador de domínio, adicione:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | IP_DO_SEU_VPS | 300 |
| A | www | IP_DO_SEU_VPS | 300 |

Aguarde 5-30 minutos para propagação.

Para verificar: `nslookup meutatico.com`

---

## Passo 3: Configurar o VPS

Conecte via SSH:

```bash
ssh root@IP_DO_SEU_VPS
```

### 3.1 Atualizar sistema e instalar dependências

```bash
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose
apt install docker-compose-plugin -y

# Verificar instalação
docker --version
docker compose version

# Instalar ferramentas úteis
apt install git ufw fail2ban -y
```

### 3.2 Configurar firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (para Let's Encrypt)
ufw allow 443/tcp   # HTTPS
ufw enable
ufw status
```

### 3.3 Configurar Fail2Ban (proteção contra brute-force SSH)

```bash
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Passo 4: Clonar e configurar o projeto

```bash
# Clonar repositório
cd /opt
git clone https://github.com/SEU_USUARIO/tatica-gestap.git
cd tatica-gestap

# Criar arquivo .env.production com suas credenciais REAIS
# (NUNCA commite este arquivo!)
cp .env.production .env.production.bak

# Editar com suas credenciais reais:
nano .env.production
```

No editor, substitua os valores:

```env
# Chaves geradas no Passo 1:
JWT_SECRET_KEY=SUA_CHAVE_JWT_GERADA_AQUI
SUPER_ADMIN_SECRET_KEY=SUA_CHAVE_ADMIN_GERADA_AQUI

# Credenciais Supabase (novas, geradas no Passo 1):
SUPABASE_FINANCEIRO_URL=https://onobornmnzemgsduscug.supabase.co
SUPABASE_FINANCEIRO_SERVICE_KEY=SUA_NOVA_CHAVE_SUPABASE

# Credenciais Google (novas):
GOOGLE_CLIENT_ID=SEU_NOVO_CLIENT_ID
GOOGLE_CLIENT_SECRET=SEU_NOVO_CLIENT_SECRET
```

Salve: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Passo 5: Obter certificado SSL

```bash
# Criar diretórios necessários
mkdir -p certbot_etc certbot_var

# Iniciar apenas o nginx com config inicial (HTTP only)
docker compose -f docker-compose.prod.yml up -d nginx

# Obter certificado Let's Encrypt
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email izabelvier@outlook.com \
  --agree-tos \
  --no-eff-email \
  -d meutatico.com \
  -d www.meutatico.com

# Parar tudo
docker compose -f docker-compose.prod.yml down
```

---

## Passo 6: Deploy completo

```bash
# Subir todos os serviços
docker compose -f docker-compose.prod.yml up -d --build

# Verificar se tudo subiu
docker compose -f docker-compose.prod.yml ps

# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Testar
curl -I https://meutatico.com
```

Você deve ver `HTTP/2 200` na resposta.

---

## Passo 7: Configurar backups automáticos

```bash
# Criar script de backup
cat > /opt/tatica-gestap/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/tatica-gestap/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup do banco SQLite
docker compose -f /opt/tatica-gestap/docker-compose.prod.yml exec -T backend \
  cp /app/data/tatica_gestap.db /app/data/backup_temp.db 2>/dev/null

docker cp $(docker compose -f /opt/tatica-gestap/docker-compose.prod.yml ps -q backend):/app/data/backup_temp.db \
  "$BACKUP_DIR/db_$TIMESTAMP.db" 2>/dev/null

# Manter apenas últimos 7 dias
find "$BACKUP_DIR" -name "db_*.db" -mtime +7 -delete

echo "[$(date)] Backup concluído: db_$TIMESTAMP.db"
SCRIPT

chmod +x /opt/tatica-gestap/backup.sh

# Agendar backup diário às 3h da manhã
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/tatica-gestap/backup.sh >> /var/log/tatica-backup.log 2>&1") | crontab -

# Testar
/opt/tatica-gestap/backup.sh
```

---

## Passo 8: Configurar monitoramento básico

```bash
# Criar script de health check
cat > /opt/tatica-gestap/healthcheck.sh << 'SCRIPT'
#!/bin/bash
DOMAIN="meutatico.com"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://$DOMAIN/health)

if [ "$STATUS" != "200" ]; then
    echo "[$(date)] ALERTA: Site retornou status $STATUS. Reiniciando..."
    cd /opt/tatica-gestap
    docker compose -f docker-compose.prod.yml restart
fi
SCRIPT

chmod +x /opt/tatica-gestap/healthcheck.sh

# Verificar a cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/tatica-gestap/healthcheck.sh >> /var/log/tatica-health.log 2>&1") | crontab -
```

---

## Comandos úteis para manutenção

```bash
# Ver status dos containers
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx

# Reiniciar tudo
docker compose -f docker-compose.prod.yml restart

# Atualizar código (novo deploy)
cd /opt/tatica-gestap
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Ver uso de recursos
docker stats
```

---

## Checklist final

- [ ] Credenciais antigas revogadas
- [ ] Novas credenciais geradas e salvas em local seguro
- [ ] DNS configurado e propagado
- [ ] Firewall ativo (UFW)
- [ ] Fail2Ban protegendo SSH
- [ ] SSL/HTTPS funcionando
- [ ] Site acessível em https://meutatico.com
- [ ] Login funcionando
- [ ] Backup automático configurado
- [ ] Health check configurado
- [ ] .env.production NÃO está no git
