# ZapFlow 噫
### Plataforma Profissional de Atendimento via WhatsApp

Sistema completo multiagente para centralizar e gerenciar atendimentos WhatsApp 窶・similar ao Umbler Talk.

---

## 笨ｨ Funcionalidades

| Mﾃｳdulo | Descriﾃｧﾃ｣o |
|--------|-----------|
| 町 **Multi-atendentes** | Mﾃｺltiplos agentes atendendo pelo mesmo nﾃｺmero |
| 召 **Times/Departamentos** | Vendas, Suporte, Financeiro 窶・com roteamento |
| 売 **Status de conversas** | Aberta 竊・Em atendimento 竊・Aguardando 竊・Finalizada |
| ､・**Bot com fluxos** | Bot configurﾃ｡vel com transferﾃｪncia automﾃ｡tica |
| 討 **Disparo em massa** | Campanhas com rate limiting e CSV import |
| 投 **Relatﾃｳrios** | Dashboard com mﾃｩtricas e ranking de atendentes |
| 迫 **Webhooks** | Integraﾃｧﾃｵes com CRM, ERP e automaﾃｧﾃｵes |
| 白 **Permissﾃｵes** | Agente / Gestor / Administrador |
| 笞｡ **Tempo real** | WebSocket com Socket.io |
| 梼 **Mﾃｭdia** | Imagens, ﾃ｡udio, vﾃｭdeo, documentos |
| 捷・・**Etiquetas** | Tags coloridas em contatos e conversas |
| 統 **Notas privadas** | Anotaﾃｧﾃｵes internas visﾃｭveis sﾃｳ para agentes |
| 笞｡ **Respostas rﾃ｡pidas** | Templates de mensagens personalizﾃ｡veis |

---

## 屏・・Stack Tecnolﾃｳgica

- **Framework:** Next.js 14 (App Router)
- **Runtime:** Node.js 20+
- **Linguagem:** TypeScript
- **Banco de dados:** SQLite (dev) / PostgreSQL (prod)
- **ORM:** Prisma
- **Estilizaﾃｧﾃ｣o:** TailwindCSS
- **Tempo real:** Socket.io
- **Auth:** JWT (jose) + cookies httpOnly
- **WhatsApp:** WhatsApp Cloud API (Meta)

---

## 噫 Instalaﾃｧﾃ｣o Rﾃ｡pida

### 1. Clone e instale dependﾃｪncias

```bash
git clone <repo>
cd zapflow
npm install
```

### 2. Configure variﾃ｡veis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Configure o banco de dados

```bash
npm run db:generate   # Gera o Prisma Client
npm run db:push       # Cria as tabelas
npm run db:seed       # Popula com dados de exemplo
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

**Credenciais padrﾃ｣o:**
- Admin: `admin@zapflow.com` / `admin123`
- Gestor: `gestor@zapflow.com` / `agent123`
- Agente: `maria@zapflow.com` / `agent123`

---

## 導 Integraﾃｧﾃ｣o WhatsApp Cloud API

### Prﾃｩ-requisitos

1. Conta de desenvolvedor Meta: https://developers.facebook.com
2. App do tipo "Business" criado
3. Nﾃｺmero de WhatsApp Business configurado
4. Token de acesso permanente gerado

### Configuraﾃｧﾃ｣o

Adicione no `.env`:

```env
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_ACCESS_TOKEN="EAABsbCS..."
WHATSAPP_APP_SECRET="abc123..."
WHATSAPP_WEBHOOK_VERIFY_TOKEN="meu-token-secreto"
```

### Configurar Webhook no Meta

Na dashboard do app Meta:
- **URL do Webhook:** `https://seudominio.com/api/webhooks/whatsapp`
- **Verify Token:** valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- **Campos:** `messages`

> Para desenvolvimento local, use [ngrok](https://ngrok.com):
> ```bash
> ngrok http 3000
> # Use a URL gerada como webhook no Meta
> ```

---

## 女・・Estrutura do Projeto

```
zapflow/
笏懌楳笏 app/
笏・  笏懌楳笏 (auth)/login/          # Pﾃ｡gina de login
笏・  笏懌楳笏 (dashboard)/           # Layout principal autenticado
笏・  笏・  笏懌楳笏 conversations/     # Interface de chat principal
笏・  笏・  笏懌楳笏 contacts/          # Gestﾃ｣o de contatos
笏・  笏・  笏懌楳笏 teams/             # Times e departamentos
笏・  笏・  笏懌楳笏 users/             # Gestﾃ｣o de usuﾃ｡rios
笏・  笏・  笏懌楳笏 reports/           # Dashboard de mﾃｩtricas
笏・  笏・  笏懌楳笏 bulk-send/         # Disparos em massa
笏・  笏・  笏懌楳笏 bot/               # Configuraﾃｧﾃ｣o do bot
笏・  笏・  笏懌楳笏 webhooks/          # Gestﾃ｣o de webhooks
笏・  笏・  笏披楳笏 settings/          # Configuraﾃｧﾃｵes do sistema
笏・  笏披楳笏 api/
笏・      笏懌楳笏 auth/              # Login, logout, session
笏・      笏懌楳笏 conversations/     # CRUD conversas
笏・      笏懌楳笏 messages/          # Envio e listagem de msgs
笏・      笏懌楳笏 contacts/          # CRUD contatos
笏・      笏懌楳笏 teams/             # CRUD times
笏・      笏懌楳笏 users/             # CRUD usuﾃ｡rios
笏・      笏懌楳笏 reports/           # Mﾃｩtricas e relatﾃｳrios
笏・      笏懌楳笏 bulk-send/         # Campanhas de disparo
笏・      笏懌楳笏 webhooks/
笏・      笏・  笏披楳笏 whatsapp/      # Webhook Meta (recebe msgs)
笏・      笏披楳笏 socket/            # Socket.io endpoint
笏・笏懌楳笏 components/
笏・  笏懌楳笏 chat/
笏・  笏・  笏懌楳笏 ConversationList   # Lista lateral de conversas
笏・  笏・  笏懌楳笏 ChatWindow         # Janela de mensagens
笏・  笏・  笏披楳笏 ContactPanel       # Info do contato (lateral dir.)
笏・  笏懌楳笏 layout/
笏・  笏・  笏懌楳笏 Sidebar            # Menu lateral
笏・  笏・  笏懌楳笏 TopBar             # Barra superior
笏・  笏・  笏披楳笏 SocketProvider     # Contexto Socket.io
笏・  笏披楳笏 shared/                # Componentes reutilizﾃ｡veis
笏・笏懌楳笏 services/
笏・  笏懌楳笏 whatsapp.ts            # WhatsApp Cloud API
笏・  笏懌楳笏 socket.ts              # Socket.io server
笏・  笏懌楳笏 webhook-dispatcher.ts  # Disparo de webhooks externos
笏・  笏披楳笏 bulk-send.ts           # Campanhas em massa
笏・笏懌楳笏 lib/
笏・  笏懌楳笏 prisma.ts              # Prisma client singleton
笏・  笏懌楳笏 auth.ts                # JWT + session helpers
笏・  笏披楳笏 utils.ts               # Utilitﾃ｡rios gerais
笏・笏懌楳笏 types/
笏・  笏披楳笏 index.ts               # TypeScript types globais
笏・笏披楳笏 prisma/
    笏懌楳笏 schema.prisma          # Modelos do banco de dados
    笏披楳笏 seed.ts                # Dados iniciais
```

---

## 伯 Webhooks Externos

O sistema dispara eventos para integraﾃｧﾃｵes externas:

| Evento | Descriﾃｧﾃ｣o |
|--------|-----------|
| `new_message` | Nova mensagem recebida ou enviada |
| `conversation_started` | Nova conversa iniciada |
| `conversation_closed` | Conversa finalizada |
| `conversation_assigned` | Atribuiﾃｧﾃ｣o de atendente |
| `contact_assigned` | Cliente atribuﾃｭdo a vendedor |

**Payload exemplo:**
```json
{
  "event": "new_message",
  "timestamp": "2024-03-15T10:30:00.000Z",
  "data": {
    "message": { "id": "...", "content": "Olﾃ｡!", "type": "TEXT" },
    "conversation": { "id": "...", "status": "IN_PROGRESS" },
    "contact": { "phone": "5511999990001", "name": "Joﾃ｣o" }
  }
}
```

**Verificaﾃｧﾃ｣o de autenticidade (HMAC SHA-256):**
```javascript
const signature = req.headers['x-zapflow-signature']
const expected = `sha256=${hmac('sha256', secret, body)}`
if (signature !== expected) throw new Error('Invalid signature')
```

---

## ､・Configuraﾃｧﾃ｣o do Bot

O bot suporta:
- **Mensagem de boas-vindas** automﾃ｡tica
- **Fluxos por gatilho** (palavra-chave ou regex)
- **Aﾃｧﾃｵes:** transferir para time, fechar conversa
- **IA opcional** via OpenAI/Anthropic

---

## 噫 Deploy em Produﾃｧﾃ｣o

### Com PostgreSQL

```env
DATABASE_URL="postgresql://user:pass@host:5432/zapflow"
```

### Recomendaﾃｧﾃｵes

- **Hosting:** Vercel, Railway, Render, ou VPS
- **Banco:** Supabase, Neon, ou PostgreSQL prﾃｳprio
- **SSL:** Obrigatﾃｳrio para o webhook do WhatsApp
- **PM2** para gerenciar o processo Node

---

## 統 Licenﾃｧa

MIT 窶・Use livremente em projetos comerciais.

---

## Deploy no Ubuntu (via terminal)

Passo a passo simples para subir no servidor `192.168.15.137` usando a pasta `/chat`.

### 1) Acessar o servidor

```bash
ssh SEU_USUARIO@192.168.15.137
```

### 2) Preparar a pasta `/chat`

```bash
sudo mkdir -p /chat
sudo chown -R $USER:$USER /chat
cd /chat
```

### 3) Baixar o projeto

```bash
git clone https://github.com/Brakister/starkewpp.git .
```

Se já existir e quiser atualizar:

```bash
git pull
```

### 4) Instalar Node.js e dependências

Exemplo com Node 18:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Depois:

```bash
npm install
```

### 5) Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

### 6) Build e start

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

### 7) (Opcional) Nginx para porta 80

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

### 8) Acessar

```text
http://192.168.15.137/
```