package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"queuesmart/internal/websocket"
)

type WSHandler struct {
	hub *websocket.Hub
}

func NewWSHandler(hub *websocket.Hub) *WSHandler {
	return &WSHandler{hub: hub}
}

func (h *WSHandler) QueueWS(c *gin.Context) {
	id := c.Param("id")
	room := fmt.Sprintf("queue:%s", id)
	websocket.ServeWS(h.hub, c, room)
}

func (h *WSHandler) TokenWS(c *gin.Context) {
	id := c.Param("id")
	room := fmt.Sprintf("token:%s", id)
	websocket.ServeWS(h.hub, c, room)
}
