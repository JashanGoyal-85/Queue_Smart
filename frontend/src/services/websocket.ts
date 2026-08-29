type WSEventHandler = (data: unknown) => void

class WebSocketService {
  private connections: Map<string, WebSocket> = new Map()
  private handlers: Map<string, Map<string, WSEventHandler[]>> = new Map()

  connect(room: string, type: 'queue' | 'token' | 'user'): WebSocket {
    const existing = this.connections.get(room)
    if (existing && existing.readyState === WebSocket.OPEN) return existing

    const backendHost = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('https://', '').replace('http://', '')
      : 'queue-smart-ssw9.onrender.com'
    const protocol = 'wss:'
    const url = `${protocol}//${backendHost}/ws/${type}/${room}`
    const ws = new WebSocket(url)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const roomHandlers = this.handlers.get(room)
        if (!roomHandlers) return
        const eventHandlers = roomHandlers.get(msg.event) || []
        const allHandlers = roomHandlers.get('*') || []
        ;[...eventHandlers, ...allHandlers].forEach((h) => h(msg.data))
      } catch {}
    }

    ws.onclose = () => {
      this.connections.delete(room)
      setTimeout(() => {
        if (this.handlers.has(room)) this.connect(room, type)
      }, 3000)
    }

    this.connections.set(room, ws)
    return ws
  }

  on(room: string, event: string, handler: WSEventHandler) {
    if (!this.handlers.has(room)) this.handlers.set(room, new Map())
    const roomHandlers = this.handlers.get(room)!
    if (!roomHandlers.has(event)) roomHandlers.set(event, [])
    roomHandlers.get(event)!.push(handler)
  }

  off(room: string, event: string, handler: WSEventHandler) {
    const roomHandlers = this.handlers.get(room)
    if (!roomHandlers) return
    const handlers = roomHandlers.get(event) || []
    roomHandlers.set(event, handlers.filter((h) => h !== handler))
  }

  disconnect(room: string) {
    const ws = this.connections.get(room)
    if (ws) { ws.close(); this.connections.delete(room) }
    this.handlers.delete(room)
  }

  disconnectAll() {
    this.connections.forEach((ws) => ws.close())
    this.connections.clear()
    this.handlers.clear()
  }
}

export const wsService = new WebSocketService()
