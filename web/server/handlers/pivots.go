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
	"sync"
	"time"

	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
	"github.com/gin-gonic/gin"
)

// PortForward represents a port forward configuration
type PortForward struct {
	ID            int    `json:"id"`
	SessionID     string `json:"sessionId"`
	BindAddress   string `json:"bindAddress"`
	RemoteAddress string `json:"remoteAddress"`
}

// ReversePortForward represents a reverse port forward configuration
type ReversePortForward struct {
	ID             uint32 `json:"id"`
	SessionID      string `json:"sessionId"`
	BindAddress    string `json:"bindAddress"`
	BindPort       uint32 `json:"bindPort"`
	ForwardAddress string `json:"forwardAddress"`
	ForwardPort    uint32 `json:"forwardPort"`
}

// SocksProxy represents a SOCKS proxy configuration
type SocksProxy struct {
	ID          uint64 `json:"id"`
	SessionID   string `json:"sessionId"`
	BindAddress string `json:"bindAddress"`
	Username    string `json:"username,omitempty"`
}

// PortForwardRequest is the request to create a port forward
type PortForwardRequest struct {
	BindAddress   string `json:"bindAddress"`
	RemoteAddress string `json:"remoteAddress"`
	RemotePort    uint32 `json:"remotePort"`
	RemoteHost    string `json:"remoteHost"`
}

// ReversePortForwardRequest is the request to create a reverse port forward
type ReversePortForwardRequest struct {
	BindAddress    string `json:"bindAddress"`
	BindPort       uint32 `json:"bindPort"`
	ForwardAddress string `json:"forwardAddress"`
	ForwardPort    uint32 `json:"forwardPort"`
}

// SocksProxyRequest is the request to create a SOCKS proxy
type SocksProxyRequest struct {
	BindAddress string `json:"bindAddress"`
	Username    string `json:"username,omitempty"`
	Password    string `json:"password,omitempty"`
}

// In-memory storage for mock data (used when not connected)
var (
	portForwards        = make(map[string][]PortForward)
	reversePortForwards = make(map[string][]ReversePortForward)
	socksProxies        = make(map[string][]SocksProxy)
	pfMutex             sync.RWMutex
	rpfMutex            sync.RWMutex
	socksMutex          sync.RWMutex
	pfCounter           = 1
	socksCounter        uint64 = 1
)

// GetPortForwards returns all port forwards for a session
func (h *Handler) GetPortForwards(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		pfMutex.RLock()
		pfs := portForwards[sessionID]
		pfMutex.RUnlock()
		if pfs == nil {
			pfs = []PortForward{}
		}
		c.JSON(http.StatusOK, gin.H{"portForwards": pfs})
		return
	}

	// Note: Sliver doesn't have a direct "list port forwards" RPC
	// Port forwards are managed through tunnels which are session-specific
	// For now, we return the local tracking
	pfMutex.RLock()
	pfs := portForwards[sessionID]
	pfMutex.RUnlock()
	if pfs == nil {
		pfs = []PortForward{}
	}
	c.JSON(http.StatusOK, gin.H{"portForwards": pfs})
}

// CreatePortForward creates a new port forward
func (h *Handler) CreatePortForward(c *gin.Context) {
	sessionID := c.Param("id")

	var req PortForwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		pfMutex.Lock()
		pf := PortForward{
			ID:            pfCounter,
			SessionID:     sessionID,
			BindAddress:   req.BindAddress,
			RemoteAddress: req.RemoteAddress,
		}
		pfCounter++
		portForwards[sessionID] = append(portForwards[sessionID], pf)
		pfMutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"portForward": pf})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.Portfwd(ctx, &sliverpb.PortfwdReq{
		Host:    req.RemoteHost,
		Port:    req.RemotePort,
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

	// Track locally
	pfMutex.Lock()
	pf := PortForward{
		ID:            int(resp.Port),
		SessionID:     sessionID,
		BindAddress:   req.BindAddress,
		RemoteAddress: req.RemoteAddress,
	}
	portForwards[sessionID] = append(portForwards[sessionID], pf)
	pfMutex.Unlock()

	c.JSON(http.StatusOK, gin.H{"portForward": pf})
}

// DeletePortForward deletes a port forward
func (h *Handler) DeletePortForward(c *gin.Context) {
	sessionID := c.Param("id")
	pfID, err := strconv.Atoi(c.Param("pfId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid port forward ID"})
		return
	}

	// Remove from local tracking
	pfMutex.Lock()
	pfs := portForwards[sessionID]
	for i, pf := range pfs {
		if pf.ID == pfID {
			portForwards[sessionID] = append(pfs[:i], pfs[i+1:]...)
			break
		}
	}
	pfMutex.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "Port forward deleted"})
}

// GetReversePortForwards returns all reverse port forwards for a session
func (h *Handler) GetReversePortForwards(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		rpfMutex.RLock()
		rpfs := reversePortForwards[sessionID]
		rpfMutex.RUnlock()
		if rpfs == nil {
			rpfs = []ReversePortForward{}
		}
		c.JSON(http.StatusOK, gin.H{"reversePortForwards": rpfs})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.GetRportFwdListeners(ctx, &sliverpb.RportFwdListenersReq{
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

	result := make([]ReversePortForward, 0, len(resp.Listeners))
	for _, l := range resp.Listeners {
		result = append(result, ReversePortForward{
			ID:             l.ID,
			SessionID:      sessionID,
			BindAddress:    l.BindAddress,
			BindPort:       l.BindPort,
			ForwardAddress: l.ForwardAddress,
			ForwardPort:    l.ForwardPort,
		})
	}

	c.JSON(http.StatusOK, gin.H{"reversePortForwards": result})
}

// CreateReversePortForward creates a new reverse port forward
func (h *Handler) CreateReversePortForward(c *gin.Context) {
	sessionID := c.Param("id")

	var req ReversePortForwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		rpfMutex.Lock()
		rpf := ReversePortForward{
			ID:             uint32(len(reversePortForwards[sessionID]) + 1),
			SessionID:      sessionID,
			BindAddress:    req.BindAddress,
			BindPort:       req.BindPort,
			ForwardAddress: req.ForwardAddress,
			ForwardPort:    req.ForwardPort,
		}
		reversePortForwards[sessionID] = append(reversePortForwards[sessionID], rpf)
		rpfMutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"reversePortForward": rpf})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.StartRportFwdListener(ctx, &sliverpb.RportFwdStartListenerReq{
		BindAddress:    req.BindAddress,
		BindPort:       req.BindPort,
		ForwardAddress: req.ForwardAddress,
		ForwardPort:    req.ForwardPort,
		Request:        &commonpb.Request{SessionID: sessionID, Timeout: 30},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.Response != nil && resp.Response.Err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": resp.Response.Err})
		return
	}

	rpf := ReversePortForward{
		ID:             resp.ID,
		SessionID:      sessionID,
		BindAddress:    resp.BindAddress,
		BindPort:       resp.BindPort,
		ForwardAddress: resp.ForwardAddress,
		ForwardPort:    resp.ForwardPort,
	}

	c.JSON(http.StatusOK, gin.H{"reversePortForward": rpf})
}

// DeleteReversePortForward deletes a reverse port forward
func (h *Handler) DeleteReversePortForward(c *gin.Context) {
	sessionID := c.Param("id")
	rpfID, err := strconv.ParseUint(c.Param("rpfId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reverse port forward ID"})
		return
	}

	if !h.IsConnected() {
		rpfMutex.Lock()
		rpfs := reversePortForwards[sessionID]
		for i, rpf := range rpfs {
			if rpf.ID == uint32(rpfID) {
				reversePortForwards[sessionID] = append(rpfs[:i], rpfs[i+1:]...)
				break
			}
		}
		rpfMutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"message": "Reverse port forward deleted"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.StopRportFwdListener(ctx, &sliverpb.RportFwdStopListenerReq{
		ID:      uint32(rpfID),
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

	c.JSON(http.StatusOK, gin.H{"message": "Reverse port forward deleted"})
}

// GetSocksProxies returns all SOCKS proxies for a session
func (h *Handler) GetSocksProxies(c *gin.Context) {
	sessionID := c.Param("id")

	if !h.IsConnected() {
		socksMutex.RLock()
		proxies := socksProxies[sessionID]
		socksMutex.RUnlock()
		if proxies == nil {
			proxies = []SocksProxy{}
		}
		c.JSON(http.StatusOK, gin.H{"socksProxies": proxies})
		return
	}

	// Return local tracking - SOCKS state is managed locally
	socksMutex.RLock()
	proxies := socksProxies[sessionID]
	socksMutex.RUnlock()
	if proxies == nil {
		proxies = []SocksProxy{}
	}
	c.JSON(http.StatusOK, gin.H{"socksProxies": proxies})
}

// CreateSocksProxy creates a new SOCKS proxy
func (h *Handler) CreateSocksProxy(c *gin.Context) {
	sessionID := c.Param("id")

	var req SocksProxyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		socksMutex.Lock()
		proxy := SocksProxy{
			ID:          socksCounter,
			SessionID:   sessionID,
			BindAddress: req.BindAddress,
			Username:    req.Username,
		}
		socksCounter++
		socksProxies[sessionID] = append(socksProxies[sessionID], proxy)
		socksMutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"socksProxy": proxy})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := h.rpc.Rpc.CreateSocks(ctx, &sliverpb.Socks{
		SessionID: sessionID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Track locally
	socksMutex.Lock()
	proxy := SocksProxy{
		ID:          resp.TunnelID,
		SessionID:   sessionID,
		BindAddress: req.BindAddress,
		Username:    req.Username,
	}
	socksProxies[sessionID] = append(socksProxies[sessionID], proxy)
	socksMutex.Unlock()

	c.JSON(http.StatusOK, gin.H{"socksProxy": proxy})
}

// DeleteSocksProxy deletes a SOCKS proxy
func (h *Handler) DeleteSocksProxy(c *gin.Context) {
	sessionID := c.Param("id")
	socksID, err := strconv.ParseUint(c.Param("socksId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid SOCKS proxy ID"})
		return
	}

	if !h.IsConnected() {
		socksMutex.Lock()
		proxies := socksProxies[sessionID]
		for i, proxy := range proxies {
			if proxy.ID == socksID {
				socksProxies[sessionID] = append(proxies[:i], proxies[i+1:]...)
				break
			}
		}
		socksMutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"message": "SOCKS proxy deleted"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err = h.rpc.Rpc.CloseSocks(ctx, &sliverpb.Socks{
		TunnelID:  socksID,
		SessionID: sessionID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Remove from local tracking
	socksMutex.Lock()
	proxies := socksProxies[sessionID]
	for i, proxy := range proxies {
		if proxy.ID == socksID {
			socksProxies[sessionID] = append(proxies[:i], proxies[i+1:]...)
			break
		}
	}
	socksMutex.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "SOCKS proxy deleted"})
}

// Legacy function wrappers for backward compatibility

func GetPortForwards(c *gin.Context) {
	sessionID := c.Param("id")
	pfMutex.RLock()
	pfs := portForwards[sessionID]
	pfMutex.RUnlock()
	if pfs == nil {
		pfs = []PortForward{}
	}
	c.JSON(http.StatusOK, gin.H{"portForwards": pfs})
}

func CreatePortForward(c *gin.Context) {
	sessionID := c.Param("id")
	var req PortForwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pfMutex.Lock()
	pf := PortForward{
		ID:            pfCounter,
		SessionID:     sessionID,
		BindAddress:   req.BindAddress,
		RemoteAddress: req.RemoteAddress,
	}
	pfCounter++
	portForwards[sessionID] = append(portForwards[sessionID], pf)
	pfMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"portForward": pf})
}

func DeletePortForward(c *gin.Context) {
	sessionID := c.Param("id")
	pfID, err := strconv.Atoi(c.Param("pfId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid port forward ID"})
		return
	}
	pfMutex.Lock()
	pfs := portForwards[sessionID]
	for i, pf := range pfs {
		if pf.ID == pfID {
			portForwards[sessionID] = append(pfs[:i], pfs[i+1:]...)
			break
		}
	}
	pfMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "Port forward deleted"})
}

func GetReversePortForwards(c *gin.Context) {
	sessionID := c.Param("id")
	rpfMutex.RLock()
	rpfs := reversePortForwards[sessionID]
	rpfMutex.RUnlock()
	if rpfs == nil {
		rpfs = []ReversePortForward{}
	}
	c.JSON(http.StatusOK, gin.H{"reversePortForwards": rpfs})
}

func CreateReversePortForward(c *gin.Context) {
	sessionID := c.Param("id")
	var req ReversePortForwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rpfMutex.Lock()
	rpf := ReversePortForward{
		ID:             uint32(len(reversePortForwards[sessionID]) + 1),
		SessionID:      sessionID,
		BindAddress:    req.BindAddress,
		BindPort:       req.BindPort,
		ForwardAddress: req.ForwardAddress,
		ForwardPort:    req.ForwardPort,
	}
	reversePortForwards[sessionID] = append(reversePortForwards[sessionID], rpf)
	rpfMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"reversePortForward": rpf})
}

func DeleteReversePortForward(c *gin.Context) {
	sessionID := c.Param("id")
	rpfID, err := strconv.Atoi(c.Param("rpfId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reverse port forward ID"})
		return
	}
	rpfMutex.Lock()
	rpfs := reversePortForwards[sessionID]
	for i, rpf := range rpfs {
		if rpf.ID == uint32(rpfID) {
			reversePortForwards[sessionID] = append(rpfs[:i], rpfs[i+1:]...)
			break
		}
	}
	rpfMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "Reverse port forward deleted"})
}

func GetSocksProxies(c *gin.Context) {
	sessionID := c.Param("id")
	socksMutex.RLock()
	proxies := socksProxies[sessionID]
	socksMutex.RUnlock()
	if proxies == nil {
		proxies = []SocksProxy{}
	}
	c.JSON(http.StatusOK, gin.H{"socksProxies": proxies})
}

func CreateSocksProxy(c *gin.Context) {
	sessionID := c.Param("id")
	var req SocksProxyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	socksMutex.Lock()
	proxy := SocksProxy{
		ID:          socksCounter,
		SessionID:   sessionID,
		BindAddress: req.BindAddress,
		Username:    req.Username,
	}
	socksCounter++
	socksProxies[sessionID] = append(socksProxies[sessionID], proxy)
	socksMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"socksProxy": proxy})
}

func DeleteSocksProxy(c *gin.Context) {
	sessionID := c.Param("id")
	socksID, err := strconv.ParseUint(c.Param("socksId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid SOCKS proxy ID"})
		return
	}
	socksMutex.Lock()
	proxies := socksProxies[sessionID]
	for i, proxy := range proxies {
		if proxy.ID == socksID {
			socksProxies[sessionID] = append(proxies[:i], proxies[i+1:]...)
			break
		}
	}
	socksMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "SOCKS proxy deleted"})
}
