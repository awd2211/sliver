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

// WebContentResponse represents content in a Sliver website
type WebContentResponse struct {
	ID          string `json:"id"`
	WebsiteID   string `json:"websiteId"`
	Path        string `json:"path"`
	ContentType string `json:"contentType"`
	Size        uint64 `json:"size"`
}

// WebsiteResponse represents a Sliver website in the API response
type WebsiteResponse struct {
	ID       string               `json:"id"`
	Name     string               `json:"name"`
	Contents []WebContentResponse `json:"contents"`
}

// websiteToResponse converts a protobuf Website to API response
func websiteToResponse(w *clientpb.Website) WebsiteResponse {
	contents := make([]WebContentResponse, 0, len(w.Contents))
	for path, content := range w.Contents {
		contents = append(contents, WebContentResponse{
			ID:          content.ID,
			WebsiteID:   content.WebsiteID,
			Path:        path,
			ContentType: content.ContentType,
			Size:        content.Size,
		})
	}

	return WebsiteResponse{
		ID:       w.ID,
		Name:     w.Name,
		Contents: contents,
	}
}

// ListWebsites returns all websites
func (h *Handler) ListWebsites(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"websites": []WebsiteResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	websites, err := h.rpc.Rpc.Websites(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]WebsiteResponse, 0, len(websites.Websites))
	for _, w := range websites.Websites {
		result = append(result, websiteToResponse(w))
	}

	c.JSON(http.StatusOK, gin.H{"websites": result})
}

// GetWebsite returns a specific website by name
func (h *Handler) GetWebsite(c *gin.Context) {
	name := c.Param("name")

	if !h.IsConnected() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Website not found: " + name})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	website, err := h.rpc.Rpc.Website(ctx, &clientpb.Website{Name: name})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if website == nil || website.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Website not found: " + name})
		return
	}

	c.JSON(http.StatusOK, gin.H{"website": websiteToResponse(website)})
}

// AddWebsiteRequest represents a request to add a website
type AddWebsiteRequest struct {
	Name string `json:"name" binding:"required"`
}

// AddWebsite creates a new website
func (h *Handler) AddWebsite(c *gin.Context) {
	var req AddWebsiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create website by adding empty content (this creates the website)
	website, err := h.rpc.Rpc.WebsiteAddContent(ctx, &clientpb.WebsiteAddContent{
		Name:     req.Name,
		Contents: make(map[string]*clientpb.WebContent),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Website created",
		"website": websiteToResponse(website),
	})
}

// DeleteWebsite removes a website
func (h *Handler) DeleteWebsite(c *gin.Context) {
	name := c.Param("name")

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := h.rpc.Rpc.WebsiteRemove(ctx, &clientpb.Website{Name: name})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Website deleted: " + name})
}

// Legacy function wrappers for backward compatibility

func ListWebsites(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"websites": []WebsiteResponse{}})
}

func GetWebsite(c *gin.Context) {
	name := c.Param("name")
	c.JSON(http.StatusNotFound, gin.H{"error": "Website not found: " + name})
}

func AddWebsite(c *gin.Context) {
	var req AddWebsiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func DeleteWebsite(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}
