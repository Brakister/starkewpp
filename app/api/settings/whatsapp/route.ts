import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])
    const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } })
    if (!config) return NextResponse.json({ success: true, data: null })

    // Mask token for security
    return NextResponse.json({
      success: true,
      data: {
        ...config,
        accessToken: config.accessToken ? '••••••••' + config.accessToken.slice(-6) : ''
      }
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const body = await req.json()
    const { phoneNumberId, displayName, accessToken, webhookSecret, businessId, isActive } = body

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({ success: false, error: 'Phone Number ID e Access Token são obrigatórios' }, { status: 400 })
    }

    // Don't save if token is masked
    const tokenToSave = accessToken.startsWith('••') ? undefined : accessToken

    const existing = await prisma.whatsAppConfig.findFirst({ where: { phoneNumberId } })

    const config = existing
      ? await prisma.whatsAppConfig.update({
          where: { id: existing.id },
          data: {
            displayName, webhookSecret, businessId, isActive,
            ...(tokenToSave && { accessToken: tokenToSave })
          }
        })
      : await prisma.whatsAppConfig.create({
          data: { phoneNumberId, displayName, accessToken: tokenToSave!, webhookSecret, businessId, isActive }
        })

    return NextResponse.json({ success: true, data: config })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
