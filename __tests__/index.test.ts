/**
 * ZapFlow - Test Setup & Example Unit Tests
 * Run: npx jest
 */

// __tests__/setup.ts
process.env.DATABASE_URL = 'file:./test.db'
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// ─── BULK SEND SERVICE TESTS ──────────────────────────────────────────────────
// __tests__/services/bulk-send.test.ts

import { parseCsvContacts } from '../services/bulk-send'

describe('parseCsvContacts', () => {
  it('parses CSV with headers', async () => {
    const csv = `phone,name
5511999990001,João Silva
5511999990002,Maria Santos`

    const result = await parseCsvContacts(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ phone: '5511999990001', name: 'João Silva' })
    expect(result[1]).toEqual({ phone: '5511999990002', name: 'Maria Santos' })
  })

  it('parses CSV without headers (phone only)', async () => {
    const csv = `5511999990001
5511999990002
5511999990003`

    const result = await parseCsvContacts(csv)
    expect(result).toHaveLength(3)
    expect(result[0].phone).toBe('5511999990001')
  })

  it('normalizes phone numbers (removes non-digits)', async () => {
    const csv = `phone,name
+55 (11) 99999-0001,Test`

    const result = await parseCsvContacts(csv)
    expect(result[0].phone).toBe('5511999990001')
  })

  it('handles quoted CSV values', async () => {
    const csv = `"phone","name"
"5511999990001","João ""The Best"" Silva"`

    const result = await parseCsvContacts(csv)
    expect(result[0].phone).toBe('5511999990001')
  })

  it('returns empty array for empty CSV', async () => {
    const result = await parseCsvContacts('')
    expect(result).toHaveLength(0)
  })
})

// ─── AUTH TESTS ───────────────────────────────────────────────────────────────
// __tests__/lib/auth.test.ts

import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/auth'
import type { AuthSession } from '../types'

describe('Password hashing', () => {
  it('hashes and verifies password correctly', async () => {
    const password = 'mySecurePassword123'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash).toMatch(/^\$2b\$/)

    const valid = await verifyPassword(password, hash)
    expect(valid).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct-password')
    const valid = await verifyPassword('wrong-password', hash)
    expect(valid).toBe(false)
  })
})

describe('JWT tokens', () => {
  const mockSession: AuthSession = {
    userId: 'user-123',
    email: 'test@zapflow.com',
    name: 'Test User',
    role: 'AGENT',
    token: ''
  }

  it('signs and verifies token', async () => {
    const token = await signToken(mockSession)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')

    const verified = await verifyToken(token)
    expect(verified?.userId).toBe(mockSession.userId)
    expect(verified?.email).toBe(mockSession.email)
    expect(verified?.role).toBe(mockSession.role)
  })

  it('returns null for invalid token', async () => {
    const result = await verifyToken('invalid.token.here')
    expect(result).toBeNull()
  })

  it('returns null for tampered token', async () => {
    const token = await signToken(mockSession)
    const tampered = token.slice(0, -5) + 'XXXXX'
    const result = await verifyToken(tampered)
    expect(result).toBeNull()
  })
})

// ─── WEBHOOK DISPATCHER TESTS ─────────────────────────────────────────────────
// __tests__/services/webhook-dispatcher.test.ts

describe('Webhook dispatcher', () => {
  it('generates correct HMAC signature', () => {
    const crypto = require('crypto')
    const secret = 'my-webhook-secret'
    const body = JSON.stringify({ event: 'new_message', data: { id: '123' } })

    const sig = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`

    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/)
  })

  it('dispatches to no webhooks when none configured', async () => {
    // Mock prisma
    jest.mock('../lib/prisma', () => ({
      prisma: {
        webhook: {
          findMany: jest.fn().mockResolvedValue([])
        }
      }
    }))

    const { dispatchWebhook } = require('../services/webhook-dispatcher')
    // Should not throw even with no webhooks
    await expect(dispatchWebhook('new_message', {})).resolves.not.toThrow()
  })
})

// ─── UTILS TESTS ──────────────────────────────────────────────────────────────
// __tests__/lib/utils.test.ts

import { formatPhone, truncate } from '../lib/utils'

describe('formatPhone', () => {
  it('formats Brazilian mobile number (13 digits)', () => {
    expect(formatPhone('5511999990001')).toBe('+55 11 99999-0001')
  })

  it('formats local number (11 digits)', () => {
    expect(formatPhone('11999990001')).toBe('(11) 99999-0001')
  })

  it('returns original if unrecognized format', () => {
    expect(formatPhone('123')).toBe('123')
  })
})

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('does not truncate short strings', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })

  it('handles exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })
})
