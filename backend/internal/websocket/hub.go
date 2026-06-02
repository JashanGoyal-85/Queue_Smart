package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/redis/go-redis/v9"
)

type Hub struct {
	clients    map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan *RoomMessage
	mu         sync.RWMutex
	redis      *redis.Client
}

type RoomMessage struct {
	Room    string
	Message []byte
}

func NewHub(redisClient *redis.Client) *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *RoomMessage, 256),
		redis:      redisClient,
	}
}

func (h *Hub) Run() {
	go h.subscribeRedis()
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.room] == nil {
				h.clients[client.room] = make(map[*Client]bool)
			}
			h.clients[client.room][client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.room]; ok {
				delete(h.clients[client.room], client)
				close(client.send)
				if len(h.clients[client.room]) == 0 {
					delete(h.clients, client.room)
				}
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.mu.RLock()
			if clients, ok := h.clients[msg.Room]; ok {
				for client := range clients {
					select {
					case client.send <- msg.Message:
					default:
						close(client.send)
						delete(h.clients[msg.Room], client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) subscribeRedis() {
	ctx := context.Background()
	pubsub := h.redis.PSubscribe(ctx, "queue:*", "token:*")
	defer pubsub.Close()
	ch := pubsub.Channel()
	for msg := range ch {
		h.broadcast <- &RoomMessage{
			Room:    msg.Channel,
			Message: []byte(msg.Payload),
		}
	}
}

func (h *Hub) Broadcast(room string, event string, data interface{}) {
	payload, err := json.Marshal(map[string]interface{}{
		"event": event,
		"data":  data,
	})
	if err != nil {
		log.Printf("ws broadcast marshal error: %v", err)
		return
	}
	ctx := context.Background()
	if err := h.redis.Publish(ctx, room, string(payload)).Err(); err != nil {
		log.Printf("redis publish error: %v", err)
	}
}

func (h *Hub) Register(c *Client)   { h.register <- c }
func (h *Hub) Unregister(c *Client) { h.unregister <- c }
