/**
 * ZapFlow - AI Service
 * Supports Anthropic Claude and OpenAI GPT for bot responses
 */

import { prisma } from '@/lib/prisma'

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIResponse {
  content: string
  tokensUsed?: number
  provider: 'anthropic' | 'openai' | 'none'
}

// ─── ANTHROPIC (CLAUDE) ───────────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  messages: AIMessage[]
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error: ${err}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

// ─── OPENAI (GPT) ─────────────────────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  messages: AIMessage[]
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error: ${err}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// ─── MAIN AI RESPONSE FUNCTION ────────────────────────────────────────────────

export async function getAIBotResponse(
  userMessage: string,
  conversationId: string,
  contactName?: string
): Promise<AIResponse> {
  // Get bot config with AI prompt
  const botConfig = await prisma.botConfig.findFirst({
    where: { isActive: true, aiEnabled: true },
  })

  if (!botConfig?.aiPrompt) {
    return { content: '', provider: 'none' }
  }

  // Build conversation history (last 10 messages for context)
  const history = await prisma.message.findMany({
    where: { conversationId, isPrivate: false },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { senderType: true, content: true },
  })

  const messages: AIMessage[] = history
    .reverse()
    .map(m => ({
      role: m.senderType === 'CONTACT' ? 'user' : 'assistant',
      content: m.content,
    }))

  // Add current message
  messages.push({ role: 'user', content: userMessage })

  // Build system prompt
  const systemPrompt = `${botConfig.aiPrompt}

${contactName ? `O cliente se chama: ${contactName}` : ''}

Regras importantes:
- Responda sempre em português brasileiro
- Seja conciso e objetivo (máximo 3 parágrafos)
- Se não souber a resposta, diga que vai verificar e transferir para um atendente
- Nunca invente informações ou promessas que não pode cumprir`

  // Try providers in order of priority
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const content = await callClaude(systemPrompt, messages)
      return { content, provider: 'anthropic' }
    }

    if (process.env.OPENAI_API_KEY) {
      const content = await callOpenAI(systemPrompt, messages)
      return { content, provider: 'openai' }
    }
  } catch (err) {
    console.error('[AI] Error generating response:', err)
  }

  return { content: '', provider: 'none' }
}

// ─── CONVERSATION CLASSIFIER ──────────────────────────────────────────────────

export async function classifyConversation(
  messages: string[]
): Promise<{
  category: 'sales' | 'support' | 'financial' | 'other'
  urgency: 'low' | 'medium' | 'high'
  sentiment: 'positive' | 'neutral' | 'negative'
  suggestedTeam?: string
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { category: 'other', urgency: 'low', sentiment: 'neutral' }
  }

  const prompt = `Analise as seguintes mensagens de atendimento ao cliente e classifique:

Mensagens:
${messages.slice(-5).join('\n---\n')}

Responda APENAS com JSON válido no formato:
{
  "category": "sales" | "support" | "financial" | "other",
  "urgency": "low" | "medium" | "high",
  "sentiment": "positive" | "neutral" | "negative",
  "suggestedTeam": "nome do time sugerido ou null"
}`

  try {
    let response: string
    if (process.env.ANTHROPIC_API_KEY) {
      response = await callClaude('Você é um classificador de conversas.', [{ role: 'user', content: prompt }])
    } else {
      response = await callOpenAI('Você é um classificador de conversas.', [{ role: 'user', content: prompt }])
    }

    const clean = response.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { category: 'other', urgency: 'low', sentiment: 'neutral' }
  }
}

// ─── RESPONSE SUGGESTIONS ────────────────────────────────────────────────────

export async function getSuggestedReplies(
  lastMessage: string,
  context: string
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return []

  const prompt = `Contexto da conversa: ${context}

Última mensagem do cliente: "${lastMessage}"

Sugira 3 respostas curtas e profissionais para um atendente usar.
Responda APENAS com JSON: ["resposta1", "resposta2", "resposta3"]`

  try {
    let response: string
    if (process.env.ANTHROPIC_API_KEY) {
      response = await callClaude('Você sugere respostas para atendentes.', [{ role: 'user', content: prompt }])
    } else {
      response = await callOpenAI('Você sugere respostas para atendentes.', [{ role: 'user', content: prompt }])
    }

    const clean = response.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return []
  }
}
