import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { parseCsvContacts } from '@/services/bulk-send'

// GET - list campaigns
export async function GET() {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const campaigns = await prisma.bulkCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return NextResponse.json({ success: true, data: campaigns })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// POST - create campaign
export async function POST(req: NextRequest) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const body = await req.json()
    const { name, message, contacts } = body

    if (!name || !message || !contacts?.length) {
      return NextResponse.json({ success: false, error: 'Dados incompletos' }, { status: 400 })
    }

    const campaign = await prisma.bulkCampaign.create({
      data: {
        name,
        message,
        totalCount: contacts.length,
        status: 'DRAFT',
        recipients: {
          createMany: {
            data: contacts.map((c: { phone: string; name?: string }) => ({
              phone: c.phone,
              name: c.name || null,
              status: 'PENDING'
            }))
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: campaign }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
