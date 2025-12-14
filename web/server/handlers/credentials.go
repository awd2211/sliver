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

// CredentialResponse represents a Sliver credential in the API response
type CredentialResponse struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	Plaintext      string `json:"plaintext,omitempty"`
	Hash           string `json:"hash,omitempty"`
	HashType       string `json:"hashType,omitempty"`
	IsCracked      bool   `json:"isCracked"`
	OriginHostUUID string `json:"originHostUUID,omitempty"`
	Collection     string `json:"collection,omitempty"`
}

// hashTypeToString converts HashType enum to string
func hashTypeToString(ht clientpb.HashType) string {
	if name, ok := clientpb.HashType_name[int32(ht)]; ok {
		return name
	}
	return "UNKNOWN"
}

// stringToHashType converts string to HashType enum
func stringToHashType(s string) clientpb.HashType {
	if val, ok := clientpb.HashType_value[s]; ok {
		return clientpb.HashType(val)
	}
	return clientpb.HashType_MD5
}

// credentialToResponse converts a protobuf Credential to API response
func credentialToResponse(c *clientpb.Credential) CredentialResponse {
	return CredentialResponse{
		ID:             c.ID,
		Username:       c.Username,
		Plaintext:      c.Plaintext,
		Hash:           c.Hash,
		HashType:       hashTypeToString(c.HashType),
		IsCracked:      c.IsCracked,
		OriginHostUUID: c.OriginHostUUID,
		Collection:     c.Collection,
	}
}

// ListCredentials returns all credentials
func (h *Handler) ListCredentials(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"credentials": []CredentialResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	creds, err := h.rpc.Rpc.Creds(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]CredentialResponse, 0, len(creds.Credentials))
	for _, cred := range creds.Credentials {
		result = append(result, credentialToResponse(cred))
	}

	c.JSON(http.StatusOK, gin.H{"credentials": result})
}

// AddCredentialRequest represents a request to add a credential
type AddCredentialRequest struct {
	Username       string `json:"username" binding:"required"`
	Plaintext      string `json:"plaintext"`
	Hash           string `json:"hash"`
	HashType       string `json:"hashType"`
	OriginHostUUID string `json:"originHostUUID"`
	Collection     string `json:"collection"`
}

// AddCredential adds a new credential
func (h *Handler) AddCredential(c *gin.Context) {
	var req AddCredentialRequest
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

	cred := &clientpb.Credential{
		Username:       req.Username,
		Plaintext:      req.Plaintext,
		Hash:           req.Hash,
		HashType:       stringToHashType(req.HashType),
		OriginHostUUID: req.OriginHostUUID,
		Collection:     req.Collection,
	}

	// Set IsCracked if plaintext is provided
	if req.Plaintext != "" {
		cred.IsCracked = true
	}

	_, err := h.rpc.Rpc.CredsAdd(ctx, &clientpb.Credentials{
		Credentials: []*clientpb.Credential{cred},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Credential added",
		"username": req.Username,
	})
}

// DeleteCredential removes a credential
func (h *Handler) DeleteCredential(c *gin.Context) {
	id := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := h.rpc.Rpc.CredsRm(ctx, &clientpb.Credentials{
		Credentials: []*clientpb.Credential{{ID: id}},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Credential deleted: " + id})
}

// Legacy function wrappers for backward compatibility

func ListCredentials(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"credentials": []CredentialResponse{}})
}

func AddCredential(c *gin.Context) {
	var req AddCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}

func DeleteCredential(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Not connected to Sliver server"})
}
