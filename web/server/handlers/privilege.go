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

// PrivilegeInfo represents a Windows privilege
type PrivilegeInfo struct {
	Name             string `json:"name"`
	Description      string `json:"description"`
	Enabled          bool   `json:"enabled"`
	EnabledByDefault bool   `json:"enabledByDefault"`
	Removed          bool   `json:"removed"`
	UsedForAccess    bool   `json:"usedForAccess"`
}

// GetSystemResult represents the result of GetSystem operation
type GetSystemResult struct {
	Success bool   `json:"success"`
	Output  string `json:"output"`
}

// ImpersonateRequest represents a request to impersonate a user
type ImpersonateRequest struct {
	Username string `json:"username"`
}

// RunAsRequest represents a request to run a command as another user
type RunAsRequest struct {
	Username    string   `json:"username"`
	ProcessName string   `json:"processName"`
	Args        string   `json:"args"`
	Domain      string   `json:"domain"`
	Password    string   `json:"password"`
	HideWindow  bool     `json:"hideWindow"`
	NetOnly     bool     `json:"netOnly"`
}

// GetPrivileges returns the current process privileges (Windows only)
func (h *Handler) GetPrivileges(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"privileges": []PrivilegeInfo{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.GetPrivs(ctx, &sliverpb.GetPrivsReq{
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 30},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	result := make([]PrivilegeInfo, 0, len(resp.PrivInfo))
	for _, p := range resp.PrivInfo {
		result = append(result, PrivilegeInfo{
			Name:             p.Name,
			Description:      p.Description,
			Enabled:          p.Enabled,
			EnabledByDefault: p.EnabledByDefault,
			Removed:          p.Removed,
			UsedForAccess:    p.UsedForAccess,
		})
	}

	c.JSON(http.StatusOK, gin.H{"privileges": result})
}

// GetSystem attempts to escalate to SYSTEM privileges
func (h *Handler) GetSystem(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.GetSystem(ctx, &clientpb.GetSystemReq{
		HostingProcess: "spoolsv.exe", // Default hosting process
		Request:        &commonpb.Request{SessionID: sessionID, Timeout: 120},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusOK, GetSystemResult{
			Success: false,
			Output:  resp.Response.Err,
		})
		return
	}

	c.JSON(http.StatusOK, GetSystemResult{
		Success: true,
		Output:  "Successfully obtained SYSTEM privileges",
	})
}

// Impersonate attempts to impersonate a user
func (h *Handler) Impersonate(c *gin.Context) {
	sessionID := c.Param("id")

	var req ImpersonateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.Impersonate(ctx, &sliverpb.ImpersonateReq{
		Username: req.Username,
		Request:  &commonpb.Request{SessionID: sessionID, Timeout: 30},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusOK, gin.H{
			"message": resp.Response.Err,
			"success": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully impersonated " + req.Username,
		"success": true,
	})
}

// RevToSelf reverts impersonation to original token
func (h *Handler) RevToSelf(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.RevToSelf(ctx, &sliverpb.RevToSelfReq{
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 30},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusOK, gin.H{
			"message": resp.Response.Err,
			"success": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully reverted to self",
		"success": true,
	})
}

// RunAs executes a command as another user
func (h *Handler) RunAs(c *gin.Context) {
	sessionID := c.Param("id")

	var req RunAsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.RunAs(ctx, &sliverpb.RunAsReq{
		Username:    req.Username,
		ProcessName: req.ProcessName,
		Args:        req.Args,
		Domain:      req.Domain,
		Password:    req.Password,
		HideWindow:  req.HideWindow,
		NetOnly:     req.NetOnly,
		Request:     &commonpb.Request{SessionID: sessionID, Timeout: 60},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusOK, gin.H{
			"message": resp.Response.Err,
			"success": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Command executed as " + req.Domain + "\\" + req.Username,
		"success": true,
		"output":  string(resp.Output),
	})
}

// Legacy function wrappers for backward compatibility

func GetPrivileges(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"privileges": []PrivilegeInfo{}})
}

func GetSystem(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func Impersonate(c *gin.Context) {
	var req ImpersonateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func RevToSelf(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func RunAs(c *gin.Context) {
	var req RunAsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}
