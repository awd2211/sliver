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

// ArmoryPackage represents an armory package
type ArmoryPackage struct {
	Name             string `json:"name"`
	CommandName      string `json:"commandName"`
	ManifestURL      string `json:"manifestUrl"`
	RepoURL          string `json:"repoUrl"`
	HelpText         string `json:"helpText"`
	Version          string `json:"version"`
	IsAlias          bool   `json:"isAlias"`
	IsExtension      bool   `json:"isExtension"`
	IsInstalled      bool   `json:"isInstalled"`
	InstalledVersion string `json:"installedVersion,omitempty"`
}

// ArmoryIndex represents the armory package index
type ArmoryIndex struct {
	Aliases    []ArmoryPackage `json:"aliases"`
	Extensions []ArmoryPackage `json:"extensions"`
}

// C2ProfileResponse represents a C2 communication profile in the API response
type C2ProfileResponse struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Created       int64                  `json:"created"`
	ServerConfig  map[string]interface{} `json:"serverConfig,omitempty"`
	ImplantConfig map[string]interface{} `json:"implantConfig,omitempty"`
}

// CanaryResponse represents a DNS canary in the API response
type CanaryResponse struct {
	ID              string `json:"id"`
	ImplantName     string `json:"implantName"`
	Domain          string `json:"domain"`
	Triggered       bool   `json:"triggered"`
	FirstTrigger    string `json:"firstTrigger,omitempty"`
	LatestTrigger   string `json:"latestTrigger,omitempty"`
	Count           uint32 `json:"count"`
}

// Certificate represents a TLS certificate
type Certificate struct {
	ID          string `json:"id"`
	CommonName  string `json:"commonName"`
	Type        string `json:"type"` // "ca", "server", "client"
	NotBefore   string `json:"notBefore"`
	NotAfter    string `json:"notAfter"`
	Fingerprint string `json:"fingerprint"`
}

// Note: Armory is client-side in Sliver CLI, no server RPC available
// Extensions/Aliases are managed locally on the operator's machine

// Handler methods for C2 Profiles

func (h *Handler) GetC2Profiles(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"profiles": []C2ProfileResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	configs, err := h.rpc.Rpc.GetHTTPC2Profiles(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]C2ProfileResponse, 0, len(configs.Configs))
	for _, cfg := range configs.Configs {
		result = append(result, C2ProfileResponse{
			ID:      cfg.ID,
			Name:    cfg.Name,
			Created: cfg.Created,
		})
	}

	c.JSON(http.StatusOK, gin.H{"profiles": result})
}

func (h *Handler) GetC2Profile(c *gin.Context) {
	name := c.Param("name")

	if !h.IsConnected() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cfg, err := h.rpc.Rpc.GetHTTPC2ProfileByName(ctx, &clientpb.C2ProfileReq{
		Name: name,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	serverConfig := map[string]interface{}{}
	if cfg.ServerConfig != nil {
		serverConfig = map[string]interface{}{
			"randomVersionHeaders": cfg.ServerConfig.RandomVersionHeaders,
		}
	}

	implantConfig := map[string]interface{}{}
	if cfg.ImplantConfig != nil {
		implantConfig = map[string]interface{}{
			"userAgent":         cfg.ImplantConfig.UserAgent,
			"chromeBaseVersion": cfg.ImplantConfig.ChromeBaseVersion,
			"macOSVersion":      cfg.ImplantConfig.MacOSVersion,
		}
	}

	c.JSON(http.StatusOK, gin.H{"profile": C2ProfileResponse{
		ID:            cfg.ID,
		Name:          cfg.Name,
		Created:       cfg.Created,
		ServerConfig:  serverConfig,
		ImplantConfig: implantConfig,
	}})
}

// CreateC2ProfileRequest represents a request to create a C2 profile
type CreateC2ProfileRequest struct {
	Name   string                 `json:"name"`
	Config map[string]interface{} `json:"config"`
}

func (h *Handler) CreateC2Profile(c *gin.Context) {
	var req CreateC2ProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"profile": nil, "message": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Build HTTPC2Config from request
	httpc2Config := &clientpb.HTTPC2Config{
		Name: req.Name,
	}

	_, err := h.rpc.Rpc.SaveHTTPC2Profile(ctx, &clientpb.HTTPC2ConfigReq{
		C2Config: httpc2Config,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"profile": C2ProfileResponse{
		Name: req.Name,
	}})
}

func (h *Handler) DeleteC2Profile(c *gin.Context) {
	// Note: There's no DeleteHTTPC2Profile RPC, so we can't actually delete
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "C2 Profile deletion not supported by server"})
}

// Handler methods for Canaries

func (h *Handler) GetCanaries(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"canaries": []CanaryResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	canaries, err := h.rpc.Rpc.Canaries(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]CanaryResponse, 0, len(canaries.Canaries))
	for _, can := range canaries.Canaries {
		result = append(result, CanaryResponse{
			ID:            can.ID,
			ImplantName:   can.ImplantName,
			Domain:        can.Domain,
			Triggered:     can.Triggered,
			FirstTrigger:  can.FirstTriggered,
			LatestTrigger: can.LatestTrigger,
			Count:         can.Count,
		})
	}

	c.JSON(http.StatusOK, gin.H{"canaries": result})
}

// Handler methods for Certificates

func (h *Handler) GetCertificates(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"certificates": []Certificate{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	certInfo, err := h.rpc.Rpc.GetCertificateInfo(ctx, &clientpb.CertificatesReq{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]Certificate, 0, len(certInfo.Info))
	for _, cert := range certInfo.Info {
		result = append(result, Certificate{
			ID:         cert.ID,
			CommonName: cert.CN,
			Type:       cert.Type,
			NotBefore:  cert.ValidityStart,
			NotAfter:   cert.ValidityExpiry,
		})
	}

	c.JSON(http.StatusOK, gin.H{"certificates": result})
}

func (h *Handler) GenerateCertificate(c *gin.Context) {
	var req struct {
		Type       string `json:"type"`
		CommonName string `json:"commonName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Certificate generation is handled server-side automatically
	// There's no direct RPC to generate certificates on demand
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Certificate generation is managed automatically by the server"})
}

func (h *Handler) DeleteCertificate(c *gin.Context) {
	// There's no RPC to delete certificates
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Certificate deletion not supported by server"})
}

// Handler methods for Armory (client-side, no server RPC)
// Note: Armory packages are managed locally on the operator's machine in the Sliver CLI
// The web interface cannot directly manage armory packages as there's no server-side RPC

func (h *Handler) GetArmoryIndex(c *gin.Context) {
	// Armory is client-side in Sliver - no server RPC available
	// Return empty armory index
	c.JSON(http.StatusOK, gin.H{
		"armory": ArmoryIndex{
			Aliases:    []ArmoryPackage{},
			Extensions: []ArmoryPackage{},
		},
		"message": "Armory is managed client-side. Use the Sliver CLI to manage armory packages.",
	})
}

func (h *Handler) InstallArmoryPackage(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Armory installation is client-side only
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "Armory package installation is managed client-side. Use the Sliver CLI.",
	})
}

func (h *Handler) UninstallArmoryPackage(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "Armory package uninstallation is managed client-side. Use the Sliver CLI.",
	})
}

func (h *Handler) RefreshArmory(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "Armory refresh is managed client-side. Use the Sliver CLI.",
	})
}

// Legacy function wrappers for backward compatibility

func GetArmoryIndex(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"armory": ArmoryIndex{
			Aliases:    []ArmoryPackage{},
			Extensions: []ArmoryPackage{},
		},
		"message": "Armory is managed client-side. Use the Sliver CLI to manage armory packages.",
	})
}

func InstallArmoryPackage(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Armory is managed client-side"})
}

func UninstallArmoryPackage(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Armory is managed client-side"})
}

func RefreshArmory(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Armory is managed client-side"})
}

func GetC2Profiles(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"profiles": []C2ProfileResponse{}})
}

func GetC2Profile(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
}

func CreateC2Profile(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"profile": nil})
}

func DeleteC2Profile(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": false})
}

func GetCertificates(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"certificates": []Certificate{}})
}

func GenerateCertificate(c *gin.Context) {
	var req struct {
		Type       string `json:"type"`
		CommonName string `json:"commonName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "Certificate generation is managed automatically by the server",
	})
}

func DeleteCertificate(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Certificate deletion not supported"})
}

func GetCanaries(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"canaries": []CanaryResponse{}})
}
