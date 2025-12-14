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
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/bishopfox/sliver/protobuf/clientpb"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
	"github.com/gin-gonic/gin"
)

// ProcessInfo represents process information
type ProcessInfo struct {
	PID          int32    `json:"pid"`
	PPID         int32    `json:"ppid"`
	Executable   string   `json:"executable"`
	Owner        string   `json:"owner"`
	Architecture string   `json:"architecture"`
	SessionID    int32    `json:"sessionId"`
	CmdLine      []string `json:"cmdLine"`
}

// FileInfo represents file/directory information
type FileInfo struct {
	Name    string `json:"name"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
	Mode    string `json:"mode"`
	Link    string `json:"link"`
}

// NetworkInterface represents a network interface
type NetworkInterface struct {
	Index       int32    `json:"index"`
	Name        string   `json:"name"`
	MAC         string   `json:"mac"`
	IPAddresses []string `json:"ipAddresses"`
}

// SockTabEntry represents a network socket entry
type SockTabEntry struct {
	LocalAddr  string `json:"localAddr"`
	RemoteAddr string `json:"remoteAddr"`
	Protocol   string `json:"protocol"`
	State      string `json:"state"`
	PID        int32  `json:"pid"`
	Process    string `json:"process"`
}

// SystemInfo represents system information
type SystemInfo struct {
	Hostname      string `json:"hostname"`
	Username      string `json:"username"`
	UID           string `json:"uid"`
	GID           string `json:"gid"`
	OS            string `json:"os"`
	Arch          string `json:"arch"`
	PID           int32  `json:"pid"`
	RemoteAddress string `json:"remoteAddress"`
}

// ExecuteResult represents command execution result
type ExecuteResult struct {
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
	Status int32  `json:"status"`
}

// PathRequest represents a path-based request
type PathRequest struct {
	Path string `json:"path"`
}

// ExecuteRequest represents a command execution request
type ExecuteRequest struct {
	Path   string   `json:"path"`
	Args   []string `json:"args"`
	Output bool     `json:"output"`
}

// PIDRequest represents a PID-based request
type PIDRequest struct {
	PID   int32 `json:"pid"`
	Force bool  `json:"force"`
}

// MigrateRequest represents a process migration request
type MigrateRequest struct {
	PID int32 `json:"pid"`
}

// EnvironmentVariable represents an environment variable
type EnvironmentVariable struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// GetProcesses returns the list of processes on the remote system
func (h *Handler) GetProcesses(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"processes": []ProcessInfo{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	ps, err := h.rpc.Rpc.Ps(ctx, &sliverpb.PsReq{
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 60},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if ps.Response != nil && ps.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": ps.Response.Err})
		return
	}

	result := make([]ProcessInfo, 0, len(ps.Processes))
	for _, p := range ps.Processes {
		result = append(result, ProcessInfo{
			PID:          p.Pid,
			PPID:         p.Ppid,
			Executable:   p.Executable,
			Owner:        p.Owner,
			Architecture: p.Architecture,
			SessionID:    p.SessionID,
			CmdLine:      p.CmdLine,
		})
	}

	c.JSON(http.StatusOK, gin.H{"processes": result})
}

// KillProcess kills a process on the remote system
func (h *Handler) KillProcess(c *gin.Context) {
	sessionID := c.Param("id")

	var req PIDRequest
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

	resp, err := h.rpc.Rpc.Terminate(ctx, &sliverpb.TerminateReq{
		Pid:     req.PID,
		Force:   req.Force,
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

	c.JSON(http.StatusOK, gin.H{"message": "Process terminated", "pid": req.PID})
}

// MigrateProcess migrates the implant to another process
func (h *Handler) MigrateProcess(c *gin.Context) {
	sessionID := c.Param("id")

	var req MigrateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.Migrate(ctx, &clientpb.MigrateReq{
		Pid:     uint32(req.PID),
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 120},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Migration successful", "pid": req.PID})
}

// ListFiles lists files in a directory on the remote system
func (h *Handler) ListFiles(c *gin.Context) {
	sessionID := c.Param("id")

	var req PathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"files": []FileInfo{}, "path": req.Path})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	ls, err := h.rpc.Rpc.Ls(ctx, &sliverpb.LsReq{
		Path:    req.Path,
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 60},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if ls.Response != nil && ls.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": ls.Response.Err})
		return
	}

	result := make([]FileInfo, 0, len(ls.Files))
	for _, f := range ls.Files {
		result = append(result, FileInfo{
			Name:    f.Name,
			IsDir:   f.IsDir,
			Size:    f.Size,
			ModTime: time.Unix(f.ModTime, 0).Format(time.RFC3339),
			Mode:    f.Mode,
			Link:    f.Link,
		})
	}

	c.JSON(http.StatusOK, gin.H{"files": result, "path": ls.Path})
}

// MakeDirectory creates a directory on the remote system
func (h *Handler) MakeDirectory(c *gin.Context) {
	sessionID := c.Param("id")

	var req PathRequest
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

	resp, err := h.rpc.Rpc.Mkdir(ctx, &sliverpb.MkdirReq{
		Path:    req.Path,
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

	c.JSON(http.StatusOK, gin.H{"message": "Directory created", "path": resp.Path})
}

// RemoveFile removes a file or directory on the remote system
func (h *Handler) RemoveFile(c *gin.Context) {
	sessionID := c.Param("id")

	var req PathRequest
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

	resp, err := h.rpc.Rpc.Rm(ctx, &sliverpb.RmReq{
		Path:    req.Path,
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

	c.JSON(http.StatusOK, gin.H{"message": "File removed", "path": resp.Path})
}

// DownloadFile initiates a file download from the remote system
func (h *Handler) DownloadFile(c *gin.Context) {
	sessionID := c.Param("id")

	var req PathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	resp, err := h.rpc.Rpc.Download(ctx, &sliverpb.DownloadReq{
		Path:    req.Path,
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 300},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	// Return file data as base64 in JSON (for web client)
	c.JSON(http.StatusOK, gin.H{
		"path":     resp.Path,
		"data":     base64.StdEncoding.EncodeToString(resp.Data),
		"size":     len(resp.Data),
		"encoder":  resp.Encoder,
		"exists":   resp.Exists,
		"isDir":    resp.IsDir,
		"readFiles": resp.ReadFiles,
	})
}

// UploadFile uploads a file to the remote system
func (h *Handler) UploadFile(c *gin.Context) {
	sessionID := c.Param("id")

	path := c.PostForm("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	// Read file content
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	resp, err := h.rpc.Rpc.Upload(ctx, &sliverpb.UploadReq{
		Path:    path,
		Data:    data,
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 300},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"path":    resp.Path,
		"size":    file.Size,
		"name":    file.Filename,
	})
}

// GetEnvironmentVariables returns environment variables from the remote system
func (h *Handler) GetEnvironmentVariables(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"variables": []EnvironmentVariable{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.GetEnv(ctx, &sliverpb.EnvReq{
		Name:    "", // Empty name returns all variables
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

	result := make([]EnvironmentVariable, 0, len(resp.Variables))
	for _, v := range resp.Variables {
		result = append(result, EnvironmentVariable{
			Name:  v.Key,
			Value: v.Value,
		})
	}

	c.JSON(http.StatusOK, gin.H{"variables": result})
}

// GetNetworkInterfaces returns network interfaces on the remote system
func (h *Handler) GetNetworkInterfaces(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"interfaces": []NetworkInterface{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.Ifconfig(ctx, &sliverpb.IfconfigReq{
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

	result := make([]NetworkInterface, 0, len(resp.NetInterfaces))
	for _, iface := range resp.NetInterfaces {
		ips := make([]string, 0, len(iface.IPAddresses))
		for _, ip := range iface.IPAddresses {
			ips = append(ips, ip)
		}
		result = append(result, NetworkInterface{
			Index:       iface.Index,
			Name:        iface.Name,
			MAC:         iface.MAC,
			IPAddresses: ips,
		})
	}

	c.JSON(http.StatusOK, gin.H{"interfaces": result})
}

// GetNetstat returns network connections on the remote system
func (h *Handler) GetNetstat(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"entries": []SockTabEntry{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.Netstat(ctx, &sliverpb.NetstatReq{
		TCP:     true,
		UDP:     true,
		IP4:     true,
		IP6:     true,
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 60},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	result := make([]SockTabEntry, 0, len(resp.Entries))
	for _, e := range resp.Entries {
		var pid int32
		var procName string
		if e.Process != nil {
			pid = e.Process.Pid
			procName = e.Process.Executable
		}
		result = append(result, SockTabEntry{
			LocalAddr:  fmt.Sprintf("%s:%d", e.LocalAddr.Ip, e.LocalAddr.Port),
			RemoteAddr: fmt.Sprintf("%s:%d", e.RemoteAddr.Ip, e.RemoteAddr.Port),
			Protocol:   e.Protocol,
			State:      e.SkState,
			PID:        pid,
			Process:    procName,
		})
	}

	c.JSON(http.StatusOK, gin.H{"entries": result})
}

// GetSystemInfo returns system information from the remote system
func (h *Handler) GetSystemInfo(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"info": SystemInfo{}})
		return
	}

	// Get session info which contains system info
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	sessions, err := h.rpc.Rpc.GetSessions(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, s := range sessions.Sessions {
		if s.ID == sessionID {
			c.JSON(http.StatusOK, gin.H{
				"info": SystemInfo{
					Hostname:      s.Hostname,
					Username:      s.Username,
					UID:           s.UID,
					GID:           s.GID,
					OS:            s.OS,
					Arch:          s.Arch,
					PID:           s.PID,
					RemoteAddress: s.RemoteAddress,
				},
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
}

// ExecuteCommand executes a command on the remote system
func (h *Handler) ExecuteCommand(c *gin.Context) {
	sessionID := c.Param("id")

	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	resp, err := h.rpc.Rpc.Execute(ctx, &sliverpb.ExecuteReq{
		Path:    req.Path,
		Args:    req.Args,
		Output:  req.Output,
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 300},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	c.JSON(http.StatusOK, ExecuteResult{
		Stdout: string(resp.Stdout),
		Stderr: string(resp.Stderr),
		Status: int32(resp.Status),
	})
}

// TakeScreenshot takes a screenshot on the remote system
func (h *Handler) TakeScreenshot(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.Screenshot(ctx, &sliverpb.ScreenshotReq{
		Request: &commonpb.Request{SessionID: sessionID, Timeout: 60},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	c.Header("Content-Type", "image/png")
	c.Writer.Write(resp.Data)
}

// Legacy function wrappers for backward compatibility

func GetProcesses(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"processes": []ProcessInfo{}})
}

func KillProcess(c *gin.Context) {
	var req PIDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func MigrateProcess(c *gin.Context) {
	var req MigrateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func ListFiles(c *gin.Context) {
	var req PathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": []FileInfo{}, "path": req.Path})
}

func MakeDirectory(c *gin.Context) {
	var req PathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func RemoveFile(c *gin.Context) {
	var req PathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func DownloadFile(c *gin.Context) {
	var req PathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func UploadFile(c *gin.Context) {
	path := c.PostForm("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}
	_, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func GetEnvironmentVariables(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"variables": []EnvironmentVariable{}})
}

func GetNetworkInterfaces(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"interfaces": []NetworkInterface{}})
}

func GetNetstat(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"entries": []SockTabEntry{}})
}

func GetSystemInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"info": SystemInfo{}})
}

func ExecuteCommand(c *gin.Context) {
	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func TakeScreenshot(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}
