package handlers

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
	"net/http"
	"time"

	"github.com/bishopfox/sliver/protobuf/clientpb"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
	"github.com/gin-gonic/gin"
)

// SessionResponse represents a Sliver session in the API response
type SessionResponse struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Hostname          string   `json:"hostname"`
	UUID              string   `json:"uuid"`
	Username          string   `json:"username"`
	UID               string   `json:"uid"`
	GID               string   `json:"gid"`
	OS                string   `json:"os"`
	Arch              string   `json:"arch"`
	Transport         string   `json:"transport"`
	RemoteAddress     string   `json:"remoteAddress"`
	PID               int32    `json:"pid"`
	Filename          string   `json:"filename"`
	LastCheckin       string   `json:"lastCheckin"`
	ActiveC2          string   `json:"activeC2"`
	Version           string   `json:"version"`
	Evasion           bool     `json:"evasion"`
	IsDead            bool     `json:"isDead"`
	ReconnectInterval int64    `json:"reconnectInterval"`
	ProxyURL          string   `json:"proxyURL"`
	Burned            bool     `json:"burned"`
	Extensions        []string `json:"extensions"`
	PeerID            int64    `json:"peerID"`
	Locale            string   `json:"locale"`
	FirstContact      string   `json:"firstContact"`
	Integrity         string   `json:"integrity"`
}

// sessionToResponse converts a protobuf Session to API response
func sessionToResponse(s *clientpb.Session) SessionResponse {
	return SessionResponse{
		ID:                s.ID,
		Name:              s.Name,
		Hostname:          s.Hostname,
		UUID:              s.UUID,
		Username:          s.Username,
		UID:               s.UID,
		GID:               s.GID,
		OS:                s.OS,
		Arch:              s.Arch,
		Transport:         s.Transport,
		RemoteAddress:     s.RemoteAddress,
		PID:               s.PID,
		Filename:          s.Filename,
		LastCheckin:       time.Unix(s.LastCheckin, 0).Format(time.RFC3339),
		ActiveC2:          s.ActiveC2,
		Version:           s.Version,
		Evasion:           s.Evasion,
		IsDead:            s.IsDead,
		ReconnectInterval: s.ReconnectInterval,
		ProxyURL:          s.ProxyURL,
		Burned:            s.Burned,
		Extensions:        s.Extensions,
		PeerID:            s.PeerID,
		Locale:            s.Locale,
		FirstContact:      time.Unix(s.FirstContact, 0).Format(time.RFC3339),
		Integrity:         s.Integrity,
	}
}

// ListSessions returns all active sessions
func (h *Handler) ListSessions(c *gin.Context) {
	if !h.IsConnected() {
		// Return empty list in mock mode
		c.JSON(http.StatusOK, gin.H{"sessions": []SessionResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	sessions, err := h.rpc.Rpc.GetSessions(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]SessionResponse, 0, len(sessions.Sessions))
	for _, s := range sessions.Sessions {
		result = append(result, sessionToResponse(s))
	}

	c.JSON(http.StatusOK, gin.H{"sessions": result})
}

// GetSession returns a specific session by ID
func (h *Handler) GetSession(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found: " + sessionID})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	sessions, err := h.rpc.Rpc.GetSessions(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, s := range sessions.Sessions {
		if s.ID == sessionID {
			c.JSON(http.StatusOK, gin.H{"session": sessionToResponse(s)})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Session not found: " + sessionID})
}

// KillSession terminates a session
func (h *Handler) KillSession(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"message": "Session killed: " + sessionID})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := h.rpc.Rpc.Kill(ctx, &sliverpb.KillReq{
		Force: false,
		Request: &commonpb.Request{
			SessionID: sessionID,
			Timeout:   30,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session killed: " + sessionID})
}

// Legacy function wrappers for backward compatibility
// These are used when no Handler instance is available

func ListSessions(c *gin.Context) {
	// Mock mode - return empty list
	c.JSON(http.StatusOK, gin.H{"sessions": []SessionResponse{}})
}

func GetSession(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusNotFound, gin.H{"error": "Session not found: " + id})
}

func KillSession(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Session killed: " + id})
}
