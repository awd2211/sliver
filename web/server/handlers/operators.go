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

	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/gin-gonic/gin"
)

// OperatorResponse represents a Sliver operator in the API response
type OperatorResponse struct {
	Name   string `json:"name"`
	Online bool   `json:"online"`
}

// ListOperators returns all operators
func (h *Handler) ListOperators(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"operators": []OperatorResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	operators, err := h.rpc.Rpc.GetOperators(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]OperatorResponse, 0, len(operators.Operators))
	for _, op := range operators.Operators {
		result = append(result, OperatorResponse{
			Name:   op.Name,
			Online: op.Online,
		})
	}

	c.JSON(http.StatusOK, gin.H{"operators": result})
}

// Legacy function wrapper for backward compatibility

func ListOperators(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"operators": []OperatorResponse{}})
}
