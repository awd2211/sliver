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
	"github.com/BishopFox/sliver/web/server/rpc"
)

// Handler holds the gRPC client and provides methods for handling API requests
type Handler struct {
	rpc *rpc.SliverClient
}

// NewHandler creates a new Handler with the given Sliver gRPC client
func NewHandler(client *rpc.SliverClient) *Handler {
	return &Handler{
		rpc: client,
	}
}

// GetRPC returns the underlying Sliver RPC client
// This can be used by handlers that need direct access to the gRPC client
func (h *Handler) GetRPC() *rpc.SliverClient {
	return h.rpc
}

// IsConnected returns true if the handler has a valid gRPC connection
func (h *Handler) IsConnected() bool {
	return h.rpc != nil && h.rpc.Rpc != nil
}
