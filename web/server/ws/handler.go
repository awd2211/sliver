package ws

/*
	Sliver Implant Framework
	Copyright (C) 2024  Bishop Fox

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/rpcpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
	"github.com/BishopFox/sliver/web/server/rpc"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Message types for WebSocket communication
const (
	TypeShellInput   = "shell_input"
	TypeShellOutput  = "shell_output"
	TypeShellStart   = "shell_start"
	TypeShellStop    = "shell_stop"
	TypeFileUpload   = "file_upload"
	TypeFileDownload = "file_download"
	TypeFileProgress = "file_progress"
	TypeEvent        = "event"
	TypePing         = "ping"
	TypePong         = "pong"
	TypeError        = "error"
)

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// ShellStartPayload represents payload for starting a shell
type ShellStartPayload struct {
	SessionID string `json:"sessionId"`
	Path      string `json:"path,omitempty"`
	Pty       bool   `json:"pty"`
}

// ShellInputPayload represents shell input
type ShellInputPayload struct {
	SessionID string `json:"sessionId"`
	TunnelID  uint64 `json:"tunnelId"`
	Data      string `json:"data"`
}

// ShellOutputPayload represents shell output
type ShellOutputPayload struct {
	SessionID string `json:"sessionId"`
	TunnelID  uint64 `json:"tunnelId"`
	Data      string `json:"data"`
}

// FileTransferPayload represents a file transfer request
type FileTransferPayload struct {
	SessionID  string `json:"sessionId"`
	Path       string `json:"path"`
	IsDownload bool   `json:"isDownload"`
	Data       []byte `json:"data,omitempty"`
}

// ShellSession represents an active shell session
type ShellSession struct {
	SessionID    string
	TunnelID     uint64
	tunnelStream rpcpb.SliverRPC_TunnelDataClient
	cancel       context.CancelFunc
}

// Client represents a WebSocket client
type Client struct {
	conn          *websocket.Conn
	send          chan []byte
	username      string
	rpcClient     *rpc.SliverClient
	mu            sync.Mutex
	shellSessions map[string]*ShellSession // sessionID -> ShellSession
	shellMu       sync.RWMutex
}

// Hub maintains the set of active clients
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	rpcClient  *rpc.SliverClient
}

var hub = &Hub{
	clients:    make(map[*Client]bool),
	broadcast:  make(chan []byte),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func init() {
	go hub.run()
}

// SetRPCClient sets the RPC client for the hub
func SetRPCClient(client *rpc.SliverClient) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	hub.rpcClient = client
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				// Clean up shell sessions
				client.cleanupShellSessions()
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(c *gin.Context) {
	username, _ := c.Get("username")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	hub.mu.RLock()
	rpcClient := hub.rpcClient
	hub.mu.RUnlock()

	client := &Client{
		conn:          conn,
		send:          make(chan []byte, 256),
		username:      username.(string),
		rpcClient:     rpcClient,
		shellSessions: make(map[string]*ShellSession),
	}

	hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) cleanupShellSessions() {
	c.shellMu.Lock()
	defer c.shellMu.Unlock()

	for _, session := range c.shellSessions {
		if session.cancel != nil {
			session.cancel()
		}
	}
	c.shellSessions = make(map[string]*ShellSession)
}

func (c *Client) readPump() {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			c.sendError("Invalid message format")
			continue
		}

		c.handleMessage(&msg)
	}
}

func (c *Client) writePump() {
	defer c.conn.Close()

	for {
		message, ok := <-c.send
		if !ok {
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		c.mu.Lock()
		err := c.conn.WriteMessage(websocket.TextMessage, message)
		c.mu.Unlock()

		if err != nil {
			return
		}
	}
}

func (c *Client) handleMessage(msg *WSMessage) {
	switch msg.Type {
	case TypePing:
		c.sendPong()
	case TypeShellStart:
		c.handleShellStart(msg.Payload)
	case TypeShellInput:
		c.handleShellInput(msg.Payload)
	case TypeShellStop:
		c.handleShellStop(msg.Payload)
	case TypeFileDownload:
		c.handleFileDownload(msg.Payload)
	case TypeFileUpload:
		c.handleFileUpload(msg.Payload)
	default:
		c.sendError("Unknown message type: " + msg.Type)
	}
}

func (c *Client) sendMessage(msgType string, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	msg := WSMessage{
		Type:    msgType,
		Payload: payloadBytes,
	}
	msgBytes, _ := json.Marshal(msg)
	c.send <- msgBytes
}

func (c *Client) sendError(errMsg string) {
	c.sendMessage(TypeError, map[string]string{"error": errMsg})
}

func (c *Client) sendPong() {
	c.sendMessage(TypePong, map[string]string{})
}

func (c *Client) handleShellStart(payload json.RawMessage) {
	var req ShellStartPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		c.sendError("Invalid shell start payload")
		return
	}

	// Check if RPC client is available
	if c.rpcClient == nil || !c.rpcClient.IsConnected() {
		c.sendError("Not connected to Sliver server")
		return
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Create tunnel first
	tunnel, err := c.rpcClient.Rpc.CreateTunnel(ctx, &sliverpb.Tunnel{
		SessionID: req.SessionID,
	})
	if err != nil {
		cancel()
		c.sendError("Failed to create tunnel: " + err.Error())
		return
	}

	// Start shell with the tunnel
	shellPath := req.Path
	if shellPath == "" {
		shellPath = "/bin/bash" // Default shell
	}

	shell, err := c.rpcClient.Rpc.Shell(ctx, &sliverpb.ShellReq{
		Path:      shellPath,
		EnablePTY: req.Pty,
		TunnelID:  tunnel.TunnelID,
		Request: &commonpb.Request{
			SessionID: req.SessionID,
			Timeout:   0, // No timeout for shell
		},
	})
	if err != nil {
		cancel()
		c.rpcClient.Rpc.CloseTunnel(context.Background(), &sliverpb.Tunnel{
			TunnelID:  tunnel.TunnelID,
			SessionID: req.SessionID,
		})
		c.sendError("Failed to start shell: " + err.Error())
		return
	}

	if shell.Response != nil && shell.Response.Err != "" {
		cancel()
		c.rpcClient.Rpc.CloseTunnel(context.Background(), &sliverpb.Tunnel{
			TunnelID:  tunnel.TunnelID,
			SessionID: req.SessionID,
		})
		c.sendError("Shell error: " + shell.Response.Err)
		return
	}

	// Start tunnel data stream
	tunnelStream, err := c.rpcClient.Rpc.TunnelData(ctx)
	if err != nil {
		cancel()
		c.rpcClient.Rpc.CloseTunnel(context.Background(), &sliverpb.Tunnel{
			TunnelID:  tunnel.TunnelID,
			SessionID: req.SessionID,
		})
		c.sendError("Failed to start tunnel stream: " + err.Error())
		return
	}

	// Store shell session
	shellSession := &ShellSession{
		SessionID:    req.SessionID,
		TunnelID:     tunnel.TunnelID,
		tunnelStream: tunnelStream,
		cancel:       cancel,
	}

	c.shellMu.Lock()
	c.shellSessions[req.SessionID] = shellSession
	c.shellMu.Unlock()

	// Start reading from tunnel stream
	go c.readTunnelData(shellSession)

	// Send acknowledgment
	c.sendMessage(TypeShellOutput, ShellOutputPayload{
		SessionID: req.SessionID,
		TunnelID:  tunnel.TunnelID,
		Data:      "", // Empty data indicates shell is ready
	})
}

func (c *Client) readTunnelData(session *ShellSession) {
	defer func() {
		c.shellMu.Lock()
		delete(c.shellSessions, session.SessionID)
		c.shellMu.Unlock()
	}()

	for {
		tunnelData, err := session.tunnelStream.Recv()
		if err != nil {
			if err == io.EOF {
				c.sendMessage(TypeShellOutput, ShellOutputPayload{
					SessionID: session.SessionID,
					TunnelID:  session.TunnelID,
					Data:      "\r\n[Shell closed]\r\n",
				})
				return
			}
			// Check if context was cancelled
			select {
			case <-session.tunnelStream.Context().Done():
				return
			default:
				log.Printf("Tunnel read error: %v", err)
				return
			}
		}

		if tunnelData.Closed {
			c.sendMessage(TypeShellOutput, ShellOutputPayload{
				SessionID: session.SessionID,
				TunnelID:  session.TunnelID,
				Data:      "\r\n[Shell closed]\r\n",
			})
			return
		}

		// Send output to client
		c.sendMessage(TypeShellOutput, ShellOutputPayload{
			SessionID: session.SessionID,
			TunnelID:  session.TunnelID,
			Data:      string(tunnelData.Data),
		})
	}
}

func (c *Client) handleShellInput(payload json.RawMessage) {
	var req ShellInputPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		c.sendError("Invalid shell input payload")
		return
	}

	c.shellMu.RLock()
	session, exists := c.shellSessions[req.SessionID]
	c.shellMu.RUnlock()

	if !exists {
		c.sendError("No active shell session for: " + req.SessionID)
		return
	}

	// Send input to tunnel
	err := session.tunnelStream.Send(&sliverpb.TunnelData{
		TunnelID:  session.TunnelID,
		SessionID: req.SessionID,
		Data:      []byte(req.Data),
	})
	if err != nil {
		c.sendError("Failed to send input: " + err.Error())
		return
	}
}

func (c *Client) handleShellStop(payload json.RawMessage) {
	var req ShellInputPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		c.sendError("Invalid shell stop payload")
		return
	}

	c.shellMu.Lock()
	session, exists := c.shellSessions[req.SessionID]
	if exists {
		// Cancel the context to stop the read loop
		if session.cancel != nil {
			session.cancel()
		}

		// Close the tunnel
		if c.rpcClient != nil && c.rpcClient.IsConnected() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			c.rpcClient.Rpc.CloseTunnel(ctx, &sliverpb.Tunnel{
				TunnelID:  session.TunnelID,
				SessionID: req.SessionID,
			})
		}

		delete(c.shellSessions, req.SessionID)
	}
	c.shellMu.Unlock()

	c.sendMessage(TypeShellOutput, ShellOutputPayload{
		SessionID: req.SessionID,
		TunnelID:  req.TunnelID,
		Data:      "\r\n[Shell closed]\r\n",
	})
}

func (c *Client) handleFileDownload(payload json.RawMessage) {
	var req FileTransferPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		c.sendError("Invalid file download payload")
		return
	}

	if c.rpcClient == nil || !c.rpcClient.IsConnected() {
		c.sendError("Not connected to Sliver server")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	resp, err := c.rpcClient.Rpc.Download(ctx, &sliverpb.DownloadReq{
		Path: req.Path,
		Request: &commonpb.Request{
			SessionID: req.SessionID,
			Timeout:   300,
		},
	})
	if err != nil {
		c.sendError("Download failed: " + err.Error())
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.sendError("Download error: " + resp.Response.Err)
		return
	}

	c.sendMessage(TypeFileProgress, map[string]interface{}{
		"sessionId": req.SessionID,
		"path":      req.Path,
		"progress":  100,
		"status":    "completed",
		"data":      resp.Data,
		"size":      len(resp.Data),
	})
}

func (c *Client) handleFileUpload(payload json.RawMessage) {
	var req FileTransferPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		c.sendError("Invalid file upload payload")
		return
	}

	if c.rpcClient == nil || !c.rpcClient.IsConnected() {
		c.sendError("Not connected to Sliver server")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	resp, err := c.rpcClient.Rpc.Upload(ctx, &sliverpb.UploadReq{
		Path: req.Path,
		Data: req.Data,
		Request: &commonpb.Request{
			SessionID: req.SessionID,
			Timeout:   300,
		},
	})
	if err != nil {
		c.sendError("Upload failed: " + err.Error())
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.sendError("Upload error: " + resp.Response.Err)
		return
	}

	c.sendMessage(TypeFileProgress, map[string]interface{}{
		"sessionId": req.SessionID,
		"path":      resp.Path,
		"progress":  100,
		"status":    "completed",
	})
}

// BroadcastEvent sends an event to all connected clients
func BroadcastEvent(eventType string, data interface{}) {
	payload, _ := json.Marshal(map[string]interface{}{
		"eventType": eventType,
		"data":      data,
	})
	msg := WSMessage{
		Type:    TypeEvent,
		Payload: payload,
	}
	msgBytes, _ := json.Marshal(msg)
	hub.broadcast <- msgBytes
}
