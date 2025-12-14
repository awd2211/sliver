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

// CompilerTargetResponse represents a compiler target in the API response
type CompilerTargetResponse struct {
	GOOS   string `json:"goos"`
	GOARCH string `json:"goarch"`
	Format string `json:"format"`
}

// CrossCompilerResponse represents a cross-compiler in the API response
type CrossCompilerResponse struct {
	TargetGOOS   string `json:"targetGoos"`
	TargetGOARCH string `json:"targetGoarch"`
	CCPath       string `json:"ccPath"`
	CXXPath      string `json:"cxxPath"`
}

// BuilderResponse represents a Sliver external builder in the API response
type BuilderResponse struct {
	Name           string                  `json:"name"`
	OperatorName   string                  `json:"operatorName"`
	GOOS           string                  `json:"goos"`
	GOARCH         string                  `json:"goarch"`
	Templates      []string                `json:"templates"`
	Targets        []CompilerTargetResponse `json:"targets"`
	CrossCompilers []CrossCompilerResponse `json:"crossCompilers"`
}

// formatToStringTarget converts OutputFormat enum to string
func formatToStringTarget(format clientpb.OutputFormat) string {
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

// builderToResponse converts a protobuf Builder to API response
func builderToResponse(b *clientpb.Builder) BuilderResponse {
	targets := make([]CompilerTargetResponse, 0, len(b.Targets))
	for _, t := range b.Targets {
		targets = append(targets, CompilerTargetResponse{
			GOOS:   t.GOOS,
			GOARCH: t.GOARCH,
			Format: formatToStringTarget(t.Format),
		})
	}

	crossCompilers := make([]CrossCompilerResponse, 0, len(b.CrossCompilers))
	for _, cc := range b.CrossCompilers {
		crossCompilers = append(crossCompilers, CrossCompilerResponse{
			TargetGOOS:   cc.TargetGOOS,
			TargetGOARCH: cc.TargetGOARCH,
			CCPath:       cc.CCPath,
			CXXPath:      cc.CXXPath,
		})
	}

	return BuilderResponse{
		Name:           b.Name,
		OperatorName:   b.OperatorName,
		GOOS:           b.GOOS,
		GOARCH:         b.GOARCH,
		Templates:      b.Templates,
		Targets:        targets,
		CrossCompilers: crossCompilers,
	}
}

// ListBuilders returns all external builders
func (h *Handler) ListBuilders(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"builders": []BuilderResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	builders, err := h.rpc.Rpc.Builders(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]BuilderResponse, 0, len(builders.Builders))
	for _, b := range builders.Builders {
		result = append(result, builderToResponse(b))
	}

	c.JSON(http.StatusOK, gin.H{"builders": result})
}

// Legacy function wrappers for backward compatibility

func ListBuilders(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"builders": []BuilderResponse{}})
}
