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
	"github.com/gin-gonic/gin"
)

// LootResponse represents a piece of Sliver loot in the API response
type LootResponse struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	FileType       string `json:"fileType"`
	OriginHostUUID string `json:"originHostUUID,omitempty"`
	Size           int64  `json:"size"`
}

func fileTypeToString(ft clientpb.FileType) string {
	switch ft {
	case clientpb.FileType_BINARY:
		return "BINARY"
	case clientpb.FileType_TEXT:
		return "TEXT"
	default:
		return "NO_FILE"
	}
}

// lootToResponse converts a protobuf Loot to API response
func lootToResponse(l *clientpb.Loot) LootResponse {
	return LootResponse{
		ID:             l.ID,
		Name:           l.Name,
		FileType:       fileTypeToString(l.FileType),
		OriginHostUUID: l.OriginHostUUID,
		Size:           l.Size,
	}
}

// ListLoot returns all loot
func (h *Handler) ListLoot(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"loot": []LootResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	allLoot, err := h.rpc.Rpc.LootAll(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]LootResponse, 0, len(allLoot.Loot))
	for _, l := range allLoot.Loot {
		result = append(result, lootToResponse(l))
	}

	c.JSON(http.StatusOK, gin.H{"loot": result})
}

// LootContentResponse represents loot with content
type LootContentResponse struct {
	LootResponse
	Content string `json:"content,omitempty"` // Base64 encoded for binary
}

// GetLoot returns a specific loot item by ID with content
func (h *Handler) GetLoot(c *gin.Context) {
	id := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Loot not found: " + id})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	loot, err := h.rpc.Rpc.LootContent(ctx, &clientpb.Loot{ID: id})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if loot == nil || loot.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Loot not found: " + id})
		return
	}

	resp := LootContentResponse{
		LootResponse: lootToResponse(loot),
	}

	// Include file content if available
	if loot.File != nil && len(loot.File.Data) > 0 {
		// For text files, include as string; for binary, client will handle base64
		if loot.FileType == clientpb.FileType_TEXT {
			resp.Content = string(loot.File.Data)
		}
	}

	c.JSON(http.StatusOK, gin.H{"loot": resp})
}

// DeleteLoot removes a loot item
func (h *Handler) DeleteLoot(c *gin.Context) {
	id := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"message": "Loot deleted: " + id})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := h.rpc.Rpc.LootRm(ctx, &clientpb.Loot{ID: id})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Loot deleted: " + id})
}

// Legacy function wrappers for backward compatibility

func ListLoot(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"loot": []LootResponse{}})
}

func GetLoot(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusNotFound, gin.H{"error": "Loot not found: " + id})
}

func DeleteLoot(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Loot deleted: " + id})
}
