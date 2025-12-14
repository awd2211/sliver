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
	"strconv"
	"strings"
	"time"

	"github.com/bishopfox/sliver/protobuf/clientpb"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/gin-gonic/gin"
)

// JobResponse represents a Sliver job (listener) in the API response
type JobResponse struct {
	ID          uint32 `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Protocol    string `json:"protocol"`
	Port        uint32 `json:"port"`
	Domains     string `json:"domains,omitempty"`
}

// jobToResponse converts a protobuf Job to API response
func jobToResponse(j *clientpb.Job) JobResponse {
	return JobResponse{
		ID:          j.ID,
		Name:        j.Name,
		Description: j.Description,
		Protocol:    j.Protocol,
		Port:        j.Port,
		Domains:     strings.Join(j.Domains, ", "),
	}
}

// MTLSListenerRequest represents a request to start an mTLS listener
type MTLSListenerRequest struct {
	Host       string `json:"host"`
	Port       uint32 `json:"port" binding:"required"`
	Persistent bool   `json:"persistent"`
}

// HTTPListenerRequest represents a request to start an HTTP listener
type HTTPListenerRequest struct {
	Domain     string `json:"domain"`
	Host       string `json:"host"`
	Port       uint32 `json:"port" binding:"required"`
	Secure     bool   `json:"secure"`
	Website    string `json:"website"`
	LongPoll   int64  `json:"longPollTimeout"`
	LongJitter int64  `json:"longPollJitter"`
	Persistent bool   `json:"persistent"`
}

// DNSListenerRequest represents a request to start a DNS listener
type DNSListenerRequest struct {
	Domains    []string `json:"domains" binding:"required"`
	Canaries   bool     `json:"canaries"`
	Host       string   `json:"host"`
	Port       uint32   `json:"port"`
	Persistent bool     `json:"persistent"`
}

// ListJobs returns all active jobs
func (h *Handler) ListJobs(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"jobs": []JobResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	jobs, err := h.rpc.Rpc.GetJobs(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]JobResponse, 0, len(jobs.Active))
	for _, j := range jobs.Active {
		result = append(result, jobToResponse(j))
	}

	c.JSON(http.StatusOK, gin.H{"jobs": result})
}

// StartMTLSListener starts a new mTLS listener
func (h *Handler) StartMTLSListener(c *gin.Context) {
	var req MTLSListenerRequest
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

	listener, err := h.rpc.Rpc.StartMTLSListener(ctx, &clientpb.MTLSListenerReq{
		Host: req.Host,
		Port: req.Port,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "mTLS listener started",
		"job": JobResponse{
			ID:       listener.JobID,
			Name:     "mtls",
			Protocol: "tcp",
			Port:     req.Port,
		},
	})
}

// StartHTTPListener starts a new HTTP listener
func (h *Handler) StartHTTPListener(c *gin.Context) {
	var req HTTPListenerRequest
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

	listener, err := h.rpc.Rpc.StartHTTPListener(ctx, &clientpb.HTTPListenerReq{
		Domain:          req.Domain,
		Host:            req.Host,
		Port:            req.Port,
		Website:         req.Website,
		LongPollTimeout: req.LongPoll,
		LongPollJitter:  req.LongJitter,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "HTTP listener started",
		"job": JobResponse{
			ID:       listener.JobID,
			Name:     "http",
			Protocol: "tcp",
			Port:     req.Port,
			Domains:  req.Domain,
		},
	})
}

// StartHTTPSListener starts a new HTTPS listener
func (h *Handler) StartHTTPSListener(c *gin.Context) {
	var req HTTPListenerRequest
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

	listener, err := h.rpc.Rpc.StartHTTPSListener(ctx, &clientpb.HTTPListenerReq{
		Domain:          req.Domain,
		Host:            req.Host,
		Port:            req.Port,
		Secure:          true,
		Website:         req.Website,
		LongPollTimeout: req.LongPoll,
		LongPollJitter:  req.LongJitter,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "HTTPS listener started",
		"job": JobResponse{
			ID:       listener.JobID,
			Name:     "https",
			Protocol: "tcp",
			Port:     req.Port,
			Domains:  req.Domain,
		},
	})
}

// StartDNSListener starts a new DNS listener
func (h *Handler) StartDNSListener(c *gin.Context) {
	var req DNSListenerRequest
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

	listener, err := h.rpc.Rpc.StartDNSListener(ctx, &clientpb.DNSListenerReq{
		Domains:    req.Domains,
		Canaries:   req.Canaries,
		Host:       req.Host,
		Port:       req.Port,
		EnforceOTP: true,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "DNS listener started",
		"job": JobResponse{
			ID:       listener.JobID,
			Name:     "dns",
			Protocol: "udp",
			Port:     req.Port,
			Domains:  strings.Join(req.Domains, ", "),
		},
	})
}

// KillJob stops a running job
func (h *Handler) KillJob(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err = h.rpc.Rpc.KillJob(ctx, &clientpb.KillJobReq{
		ID: uint32(id),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Job killed: " + idStr})
}

// Legacy function wrappers for backward compatibility

func ListJobs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"jobs": []JobResponse{}})
}

func StartMTLSListener(c *gin.Context) {
	var req MTLSListenerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func StartHTTPListener(c *gin.Context) {
	var req HTTPListenerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func StartHTTPSListener(c *gin.Context) {
	var req HTTPListenerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func StartDNSListener(c *gin.Context) {
	var req DNSListenerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func KillJob(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}
