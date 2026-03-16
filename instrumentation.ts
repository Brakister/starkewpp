/**
 * Next.js Instrumentation Hook
 * Roda UMA VEZ quando o servidor Next.js inicializa.
 * Aqui iniciamos o Socket.io e reconectamos o Baileys se houver sessão salva.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Só roda no servidor Node.js (não no Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSocketIO } = await import('./lib/socketio-server')
    initSocketIO()
  }
}
