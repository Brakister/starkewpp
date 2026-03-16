/**
 * ZapFlow — Seed inicial
 * Cria apenas usuários, times e configurações base.
 * Contatos e conversas vêm do WhatsApp real.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── USUÁRIOS ─────────────────────────────────────────────────────────────

  const adminPass  = await bcrypt.hash('admin123',  12)
  const agentPass  = await bcrypt.hash('agent123',  12)

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@zapflow.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@zapflow.com', password: adminPass, role: 'ADMIN',   status: 'OFFLINE', isActive: true },
  })

  const manager = await prisma.user.upsert({
    where:  { email: 'gestor@zapflow.com' },
    update: {},
    create: { name: 'Carlos Gestor',  email: 'gestor@zapflow.com', password: agentPass, role: 'MANAGER', status: 'OFFLINE', isActive: true },
  })

  const agent1 = await prisma.user.upsert({
    where:  { email: 'maria@zapflow.com' },
    update: {},
    create: { name: 'Maria Silva',    email: 'maria@zapflow.com',  password: agentPass, role: 'AGENT',   status: 'OFFLINE', isActive: true },
  })

  const agent2 = await prisma.user.upsert({
    where:  { email: 'joao@zapflow.com' },
    update: {},
    create: { name: 'João Santos',    email: 'joao@zapflow.com',   password: agentPass, role: 'AGENT',   status: 'OFFLINE', isActive: true },
  })

  // ─── TIMES ────────────────────────────────────────────────────────────────

  const vendas = await prisma.team.upsert({
    where:  { id: 'team-vendas' },
    update: {},
    create: { id: 'team-vendas',      name: 'Vendas',      description: 'Time de vendas',         color: '#10b981' },
  })

  const suporte = await prisma.team.upsert({
    where:  { id: 'team-suporte' },
    update: {},
    create: { id: 'team-suporte',     name: 'Suporte',     description: 'Suporte técnico',         color: '#6366f1' },
  })

  const financeiro = await prisma.team.upsert({
    where:  { id: 'team-financeiro' },
    update: {},
    create: { id: 'team-financeiro',  name: 'Financeiro',  description: 'Cobranças e pagamentos',  color: '#f59e0b' },
  })

  // Membros dos times
  for (const [teamId, userId] of [
    [vendas.id,     agent1.id],
    [vendas.id,     manager.id],
    [suporte.id,    agent2.id],
    [financeiro.id, agent2.id],
  ] as [string, string][]) {
    await prisma.teamMember.upsert({
      where:  { teamId_userId: { teamId, userId } },
      update: {},
      create: { teamId, userId },
    })
  }

  // ─── ETIQUETAS ────────────────────────────────────────────────────────────

  for (const tag of [
    { name: 'VIP',          color: '#f59e0b' },
    { name: 'Urgente',      color: '#ef4444' },
    { name: 'Novo Cliente', color: '#06b6d4' },
    { name: 'Reclamação',   color: '#f97316' },
    { name: 'Elogio',       color: '#8b5cf6' },
  ]) {
    await prisma.tag.upsert({ where: { name: tag.name }, update: {}, create: tag })
  }

  // ─── RESPOSTAS RÁPIDAS ────────────────────────────────────────────────────

  const quickReplies = [
    { title: '✋ Boas-vindas',         shortcut: 'oi',       content: 'Olá! Seja bem-vindo(a). Como posso ajudar?' },
    { title: '⏳ Aguarde',             shortcut: 'aguarde',  content: 'Por favor, aguarde um momento enquanto verifico as informações.' },
    { title: '✅ Encerramento',        shortcut: 'tchau',    content: 'Obrigado pelo contato! Ficamos à disposição. Tenha um ótimo dia! 😊' },
    { title: '📦 Prazo de entrega',    shortcut: 'prazo',    content: 'Nosso prazo de entrega é de 3 a 7 dias úteis.' },
    { title: '💳 Formas de pagamento', shortcut: 'pagto',    content: 'Aceitamos PIX, cartão de crédito (até 12x) e boleto bancário.' },
  ]

  for (const qr of quickReplies) {
    const exists = await prisma.quickReply.findFirst({ where: { title: qr.title } })
    if (!exists) {
      await prisma.quickReply.create({ data: qr })
    }
  }

  // ─── BOT ─────────────────────────────────────────────────────────────────

  const botExists = await prisma.botConfig.findFirst()
  if (!botExists) {
    await prisma.botConfig.create({
      data: {
        name:          'Bot Principal',
        isActive:      false, // desativado por padrão — ligue em Bot & IA
        welcomeMsg:    '👋 Olá! Seja bem-vindo(a). Como posso ajudar?\n\n1️⃣ Vendas\n2️⃣ Suporte\n3️⃣ Financeiro',
        fallbackMsg:   'Não entendi. Um atendente irá te ajudar em breve! 😊',
        transferMsg:   'Transferindo para um atendente... 👤',
        autoTransfer:  true,
        transferDelay: 60,
        flows: {
          createMany: {
            data: [
              { trigger: '^1$|vendas',                   response: 'Direcionando para Vendas... 🛒',       action: 'transfer_to_team', actionData: '{"teamId":"team-vendas"}',      order: 1 },
              { trigger: '^2$|suporte|problema|ajuda',   response: 'Conectando com Suporte... 🔧',         action: 'transfer_to_team', actionData: '{"teamId":"team-suporte"}',     order: 2 },
              { trigger: '^3$|financeiro|boleto|pagamento', response: 'Encaminhando para Financeiro... 💰', action: 'transfer_to_team', actionData: '{"teamId":"team-financeiro"}',  order: 3 },
            ],
          },
        },
      },
    })
  }

  console.log('')
  console.log('✅ Seed concluído!')
  console.log('')
  console.log('📧 Credenciais:')
  console.log('   admin@zapflow.com  →  admin123  (Administrador)')
  console.log('   gestor@zapflow.com →  agent123  (Gestor)')
  console.log('   maria@zapflow.com  →  agent123  (Atendente)')
  console.log('   joao@zapflow.com   →  agent123  (Atendente)')
  console.log('')
  console.log('📱 Para conectar o WhatsApp:')
  console.log('   npm run dev → http://localhost:3000/settings/whatsapp')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
