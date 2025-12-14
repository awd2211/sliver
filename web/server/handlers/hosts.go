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

// IOCResponse represents an Indicator of Compromise in the API response
type IOCResponse struct {
	ID       string `json:"id"`
	Path     string `json:"path"`
	FileHash string `json:"fileHash"`
}

// HostResponse represents a Sliver host in the API response
type HostResponse struct {
	ID           string        `json:"id"`
	Hostname     string        `json:"hostname"`
	HostUUID     string        `json:"hostUUID"`
	OSVersion    string        `json:"osVersion"`
	IOCs         []IOCResponse `json:"iocs"`
	Extensions   []string      `json:"extensions"`
	Locale       string        `json:"locale"`
	FirstContact string        `json:"firstContact"`
}

// hostToResponse converts a protobuf Host to API response
func hostToResponse(h *clientpb.Host) HostResponse {
	iocs := make([]IOCResponse, 0, len(h.IOCs))
	for _, ioc := range h.IOCs {
		iocs = append(iocs, IOCResponse{
			ID:       ioc.ID,
			Path:     ioc.Path,
			FileHash: ioc.FileHash,
		})
	}

	extensions := make([]string, 0, len(h.ExtensionData))
	for name := range h.ExtensionData {
		extensions = append(extensions, name)
	}

	return HostResponse{
		ID:           h.ID,
		Hostname:     h.Hostname,
		HostUUID:     h.HostUUID,
		OSVersion:    h.OSVersion,
		IOCs:         iocs,
		Extensions:   extensions,
		Locale:       h.Locale,
		FirstContact: time.Unix(h.FirstContact, 0).Format(time.RFC3339),
	}
}

// ListHosts returns all hosts
func (h *Handler) ListHosts(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"hosts": []HostResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	allHosts, err := h.rpc.Rpc.Hosts(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]HostResponse, 0, len(allHosts.Hosts))
	for _, host := range allHosts.Hosts {
		result = append(result, hostToResponse(host))
	}

	c.JSON(http.StatusOK, gin.H{"hosts": result})
}

// GetHost returns a specific host by ID
func (h *Handler) GetHost(c *gin.Context) {
	id := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host not found: " + id})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	host, err := h.rpc.Rpc.Host(ctx, &clientpb.Host{HostUUID: id})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if host == nil || host.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host not found: " + id})
		return
	}

	c.JSON(http.StatusOK, gin.H{"host": hostToResponse(host)})
}

// Legacy function wrappers for backward compatibility

func ListHosts(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"hosts": []HostResponse{}})
}

func GetHost(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusNotFound, gin.H{"error": "Host not found: " + id})
}
