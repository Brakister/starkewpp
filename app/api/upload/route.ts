import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getWhatsAppService } from '@/services/whatsapp'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'image/gif': 'IMAGE',
  'audio/mpeg': 'AUDIO',
  'audio/ogg': 'AUDIO',
  'audio/wav': 'AUDIO',
  'video/mp4': 'VIDEO',
  'video/3gpp': 'VIDEO',
  'application/pdf': 'DOCUMENT',
  'application/msword': 'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
  'application/vnd.ms-excel': 'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'DOCUMENT',
}

const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16MB (WhatsApp limit)

export async function POST(req: NextRequest) {
  try {
    await requireAuth()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const conversationId = formData.get('conversationId') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 })
    }

    // Validate type
    const messageType = ALLOWED_MIME_TYPES[file.type]
    if (!messageType) {
      return NextResponse.json({ success: false, error: 'Tipo de arquivo não suportado' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Try uploading to WhatsApp first (if configured)
    const waService = await getWhatsAppService()
    let mediaUrl: string | undefined
    let whatsappMediaId: string | undefined

    if (waService) {
      try {
        whatsappMediaId = await waService.uploadMedia(buffer, file.type)
        mediaUrl = `wa-media://${whatsappMediaId}` // placeholder until resolved
      } catch (err) {
        console.error('[Upload] WhatsApp media upload failed:', err)
      }
    }

    // Fallback: save locally
    if (!mediaUrl) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadDir, { recursive: true })

      const ext = file.name.split('.').pop() || 'bin'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      await writeFile(path.join(uploadDir, filename), buffer)
      mediaUrl = `/uploads/${filename}`
    }

    return NextResponse.json({
      success: true,
      data: {
        url: mediaUrl,
        whatsappMediaId,
        type: messageType,
        filename: file.name,
        size: file.size,
        mimeType: file.type
      }
    })
  } catch (err) {
    console.error('[Upload]', err)
    return NextResponse.json({ success: false, error: 'Erro no upload' }, { status: 500 })
  }
}
