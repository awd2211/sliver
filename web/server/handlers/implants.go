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

// ImplantBuildResponse represents an implant build in the API response
type ImplantBuildResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	MD5      string `json:"md5"`
	SHA1     string `json:"sha1"`
	SHA256   string `json:"sha256"`
	Burned   bool   `json:"burned"`
	Stage    bool   `json:"stage"`
}

// ImplantConfigResponse represents an implant config in the API response
type ImplantConfigResponse struct {
	ID               string                 `json:"id"`
	Name             string                 `json:"name"`
	OS               string                 `json:"os"`
	Arch             string                 `json:"arch"`
	Format           string                 `json:"format"`
	IsBeacon         bool                   `json:"isBeacon"`
	BeaconInterval   int64                  `json:"beaconInterval"`
	BeaconJitter     int64                  `json:"beaconJitter"`
	Debug            bool                   `json:"debug"`
	Evasion          bool                   `json:"evasion"`
	ObfuscateSymbols bool                   `json:"obfuscateSymbols"`
	C2               []string               `json:"c2"`
	Builds           []ImplantBuildResponse `json:"builds"`
}

func formatToString(format clientpb.OutputFormat) string {
	switch format {
	case clientpb.OutputFormat_SHARED_LIB:
		return "SHARED_LIB"
	case clientpb.OutputFormat_SHELLCODE:
		return "SHELLCODE"
	case clientpb.OutputFormat_EXECUTABLE:
		return "EXECUTABLE"
	case clientpb.OutputFormat_SERVICE:
		return "SERVICE"
	default:
		return "EXECUTABLE"
	}
}

// implantConfigToResponse converts a protobuf ImplantConfig to API response
func implantConfigToResponse(name string, cfg *clientpb.ImplantConfig) ImplantConfigResponse {
	c2URLs := make([]string, 0, len(cfg.C2))
	for _, c2 := range cfg.C2 {
		c2URLs = append(c2URLs, c2.URL)
	}

	builds := make([]ImplantBuildResponse, 0, len(cfg.ImplantBuilds))
	for _, b := range cfg.ImplantBuilds {
		builds = append(builds, ImplantBuildResponse{
			ID:     b.ID,
			Name:   b.Name,
			MD5:    b.MD5,
			SHA1:   b.SHA1,
			SHA256: b.SHA256,
			Burned: b.Burned,
			Stage:  b.Stage,
		})
	}

	return ImplantConfigResponse{
		ID:               cfg.ID,
		Name:             name,
		OS:               cfg.GOOS,
		Arch:             cfg.GOARCH,
		Format:           formatToString(cfg.Format),
		IsBeacon:         cfg.IsBeacon,
		BeaconInterval:   cfg.BeaconInterval,
		BeaconJitter:     cfg.BeaconJitter,
		Debug:            cfg.Debug,
		Evasion:          cfg.Evasion,
		ObfuscateSymbols: cfg.ObfuscateSymbols,
		C2:               c2URLs,
		Builds:           builds,
	}
}

// ListImplants returns all implant builds
func (h *Handler) ListImplants(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"implants": []ImplantConfigResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	builds, err := h.rpc.Rpc.ImplantBuilds(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]ImplantConfigResponse, 0, len(builds.Configs))
	for name, cfg := range builds.Configs {
		result = append(result, implantConfigToResponse(name, cfg))
	}

	c.JSON(http.StatusOK, gin.H{"implants": result})
}

// GetImplant returns a specific implant by name
func (h *Handler) GetImplant(c *gin.Context) {
	name := c.Param("name")

	if !h.IsConnected() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Implant not found: " + name})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	builds, err := h.rpc.Rpc.ImplantBuilds(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if cfg, ok := builds.Configs[name]; ok {
		c.JSON(http.StatusOK, gin.H{"implant": implantConfigToResponse(name, cfg)})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Implant not found: " + name})
}

// C2Config represents a C2 endpoint configuration
type C2Config struct {
	Priority int    `json:"priority"`
	URL      string `json:"url"`
}

// GenerateImplantRequest represents a request to generate an implant
type GenerateImplantRequest struct {
	Name     string `json:"name"`
	OS       string `json:"os" binding:"required"`
	Arch     string `json:"arch" binding:"required"`
	Format   string `json:"format"`
	IsBeacon bool   `json:"isBeacon"`

	// C2 Configuration
	MTLSC2      []C2Config `json:"mtlsC2"`
	HTTPC2      []C2Config `json:"httpC2"`
	DNSC2       []C2Config `json:"dnsC2"`
	WGC2        []C2Config `json:"wgC2"`
	TCPPivotC2  []C2Config `json:"tcpPivotC2"`
	NamedPipeC2 []C2Config `json:"namedPipeC2"`

	// Beacon-specific settings
	BeaconInterval int64 `json:"beaconInterval"`
	BeaconJitter   int64 `json:"beaconJitter"`

	// Connection settings
	ReconnectInterval   int64  `json:"reconnectInterval"`
	MaxConnectionErrors uint32 `json:"maxConnectionErrors"`
	PollTimeout         int64  `json:"pollTimeout"`
	ConnectionStrategy  string `json:"connectionStrategy"`

	// WireGuard settings
	WGPeerTunIP       string `json:"wgPeerTunIP"`
	WGKeyExchangePort uint32 `json:"wgKeyExchangePort"`
	WGTcpCommsPort    uint32 `json:"wgTcpCommsPort"`

	// Evasion options
	Debug            bool `json:"debug"`
	Evasion          bool `json:"evasion"`
	ObfuscateSymbols bool `json:"obfuscateSymbols"`
	SGN              bool `json:"sgn"`

	// Limits
	LimitDomainJoined bool   `json:"limitDomainJoined"`
	LimitHostname     string `json:"limitHostname"`
	LimitUsername     string `json:"limitUsername"`
	LimitDatetime     string `json:"limitDatetime"`
	LimitFileExists   string `json:"limitFileExists"`
	LimitLocale       string `json:"limitLocale"`

	// Output format options
	IsService bool `json:"isService"`
	RunAtLoad bool `json:"runAtLoad"`

	// Advanced options
	TemplateName           string   `json:"templateName"`
	CanaryDomains          []string `json:"canaryDomains"`
	HTTPC2ConfigName       string   `json:"httpC2ConfigName"`
	NetGoEnabled           bool     `json:"netGoEnabled"`
	TrafficEncodersEnabled bool     `json:"trafficEncodersEnabled"`
	TrafficEncoders        []string `json:"trafficEncoders"`
}

// GenerateImplant generates a new implant
func (h *Handler) GenerateImplant(c *gin.Context) {
	var req GenerateImplantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	// Build C2 configuration from all C2 types
	c2Config := make([]*clientpb.ImplantC2, 0)

	// MTLS C2
	for _, c2 := range req.MTLSC2 {
		c2Config = append(c2Config, &clientpb.ImplantC2{
			URL:      c2.URL,
			Priority: uint32(c2.Priority),
		})
	}

	// HTTP(S) C2
	for _, c2 := range req.HTTPC2 {
		c2Config = append(c2Config, &clientpb.ImplantC2{
			URL:      c2.URL,
			Priority: uint32(c2.Priority),
		})
	}

	// DNS C2
	for _, c2 := range req.DNSC2 {
		c2Config = append(c2Config, &clientpb.ImplantC2{
			URL:      c2.URL,
			Priority: uint32(c2.Priority),
		})
	}

	// WireGuard C2
	for _, c2 := range req.WGC2 {
		c2Config = append(c2Config, &clientpb.ImplantC2{
			URL:      c2.URL,
			Priority: uint32(c2.Priority),
		})
	}

	// TCP Pivot C2
	for _, c2 := range req.TCPPivotC2 {
		c2Config = append(c2Config, &clientpb.ImplantC2{
			URL:      c2.URL,
			Priority: uint32(c2.Priority),
		})
	}

	// Named Pipe C2
	for _, c2 := range req.NamedPipeC2 {
		c2Config = append(c2Config, &clientpb.ImplantC2{
			URL:      c2.URL,
			Priority: uint32(c2.Priority),
		})
	}

	// Parse format
	var format clientpb.OutputFormat
	switch req.Format {
	case "dll", "SHARED_LIB", "shared":
		format = clientpb.OutputFormat_SHARED_LIB
	case "shellcode", "SHELLCODE":
		format = clientpb.OutputFormat_SHELLCODE
	case "service", "SERVICE":
		format = clientpb.OutputFormat_SERVICE
	default:
		format = clientpb.OutputFormat_EXECUTABLE
	}

	// Override format if isService is set
	if req.IsService {
		format = clientpb.OutputFormat_SERVICE
	}

	implantConfig := &clientpb.ImplantConfig{
		GOOS:   req.OS,
		GOARCH: req.Arch,
		Format: format,

		// Mode
		IsBeacon:       req.IsBeacon,
		BeaconInterval: req.BeaconInterval,
		BeaconJitter:   req.BeaconJitter,

		// Connection settings
		ReconnectInterval:   req.ReconnectInterval,
		MaxConnectionErrors: req.MaxConnectionErrors,
		PollTimeout:         req.PollTimeout,
		ConnectionStrategy:  req.ConnectionStrategy,

		// WireGuard settings
		WGPeerTunIP:       req.WGPeerTunIP,
		WGKeyExchangePort: req.WGKeyExchangePort,
		WGTcpCommsPort:    req.WGTcpCommsPort,

		// Evasion
		Debug:            req.Debug,
		Evasion:          req.Evasion,
		ObfuscateSymbols: req.ObfuscateSymbols,
		SGNEnabled:       req.SGN,

		// C2 configuration
		C2:            c2Config,
		CanaryDomains: req.CanaryDomains,

		// Limits
		LimitDomainJoined: req.LimitDomainJoined,
		LimitHostname:     req.LimitHostname,
		LimitUsername:     req.LimitUsername,
		LimitDatetime:     req.LimitDatetime,
		LimitFileExists:   req.LimitFileExists,
		LimitLocale:       req.LimitLocale,

		// Output format options
		IsService: req.IsService,
		RunAtLoad: req.RunAtLoad,

		// Advanced
		TemplateName:           req.TemplateName,
		HTTPC2ConfigName:       req.HTTPC2ConfigName,
		NetGoEnabled:           req.NetGoEnabled,
		TrafficEncodersEnabled: req.TrafficEncodersEnabled,
		TrafficEncoders:        req.TrafficEncoders,

		// Protocol flags
		IncludeMTLS:     len(req.MTLSC2) > 0,
		IncludeHTTP:     len(req.HTTPC2) > 0,
		IncludeDNS:      len(req.DNSC2) > 0,
		IncludeWG:       len(req.WGC2) > 0,
		IncludeTCP:      len(req.TCPPivotC2) > 0,
		IncludeNamePipe: len(req.NamedPipeC2) > 0,
	}

	// Use a longer timeout for implant generation (can take several minutes)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Generate uses the same RPC for both session and beacon implants
	// The IsBeacon flag in the config determines which type is generated
	generated, err := h.rpc.Rpc.Generate(ctx, &clientpb.GenerateReq{
		Config: implantConfig,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Implant generated successfully",
		"name":    generated.File.Name,
		"size":    len(generated.File.Data),
	})
}

// DeleteImplant deletes an implant build
func (h *Handler) DeleteImplant(c *gin.Context) {
	name := c.Param("name")

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := h.rpc.Rpc.DeleteImplantBuild(ctx, &clientpb.DeleteReq{
		Name: name,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Implant deleted: " + name})
}

// Legacy function wrappers for backward compatibility

func ListImplants(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"implants": []ImplantConfigResponse{}})
}

func GetImplant(c *gin.Context) {
	name := c.Param("name")
	c.JSON(http.StatusNotFound, gin.H{"error": "Implant not found: " + name})
}

func GenerateImplant(c *gin.Context) {
	var req GenerateImplantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func DeleteImplant(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}
