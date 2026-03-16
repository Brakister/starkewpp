# Starkewpp

Este repositório contém o serviço `whatsapp-baileys.ts`.

## Deploy no Ubuntu (via terminal)

Abaixo está um passo a passo simples para você **transferir e rodar** o projeto no servidor Ubuntu.

### 1) Commit e push no PC

No Windows:

```bash
# dentro da pasta onde você clonou o repo
git add .
git commit -m "init whatsapp-baileys"
git push -u origin main
```

### 2) Acessar o servidor

```bash
ssh SEU_USUARIO@192.168.15.137
```

### 3) Preparar a pasta `/chat`

```bash
sudo mkdir -p /chat
sudo chown -R $USER:$USER /chat
cd /chat
```

### 4) Baixar o projeto no servidor

```bash
git clone https://github.com/Brakister/starkewpp.git .
```

Se já existir e quiser atualizar:

```bash
git pull
```

### 5) Instalar Node.js e dependências

Exemplo com Node 18:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Depois:

```bash
npm install
```

### 6) Configurar variáveis de ambiente

Crie um `.env` com o que o app precisa (DB, chaves, etc):

```bash
nano .env
```

### 7) Rodar o app

Se for um backend Node:

```bash
npm run build
npm start
```

Ou com PM2 (recomendado):

```bash
sudo npm i -g pm2
pm2 start npm --name starkewpp -- start
pm2 save
pm2 startup
```

### 8) (Opcional) Nginx para rodar na porta 80/443

Se o app roda na porta 3000, crie um proxy:

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/chat
```

Conteúdo sugerido:

```nginx
server {
  listen 80;
  server_name 192.168.15.137;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Ativar:

```bash
sudo ln -s /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9) Acessar

```text
http://192.168.15.137/
```