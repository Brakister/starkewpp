# ZapFlow — Instalação (Windows / macOS / Linux)

## Pré-requisitos
- Node.js 20+ → https://nodejs.org

---

## Passo 1 — Instalar dependências

```
npm install
```

---

## Passo 2 — Criar o arquivo .env

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

O `.env` padrão já funciona para desenvolvimento local (SQLite, sem WhatsApp).
Abra o arquivo e confira se está assim:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="zapflow-secret-troque-em-producao-minimo-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Passo 3 — Banco de dados

Execute **um por vez** (não use && no PowerShell):

```
npm run db:generate
npm run db:push
npm run db:seed
```

---

## Passo 4 — Iniciar

```
npm run dev
```

Acesse: **http://localhost:3000**

---

## Credenciais padrão

| Email | Senha | Perfil |
|-------|-------|--------|
| admin@zapflow.com | admin123 | Administrador |
| gestor@zapflow.com | agent123 | Gestor |
| maria@zapflow.com | agent123 | Atendente |
| joao@zapflow.com | agent123 | Atendente |

---

## Conectar WhatsApp (QR Code)

1. Com o servidor rodando, acesse **http://localhost:3000/settings/whatsapp**
2. Clique em **Conectar**
3. Escaneie o QR Code com o WhatsApp do celular
   - Abra o WhatsApp → 3 pontos → Aparelhos conectados → Conectar aparelho
4. Pronto! Mensagens chegam em tempo real no painel

A sessão fica salva na pasta `.baileys-auth/` — não precisa escanear novamente
toda vez que reiniciar.

---

## Problemas comuns

**`DATABASE_URL not found`**
→ O arquivo `.env` não foi criado. Execute o Passo 2 acima.

**`&&` não funciona no PowerShell**
→ Execute cada comando separadamente, sem `&&`.

**Porta 3000 em uso:**
```powershell
$env:PORT=3001; npm run dev
```

**Resetar banco:**
```
npm run db:reset
npm run db:seed
```
