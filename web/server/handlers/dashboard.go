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
	"time"

	"github.com/bishopfox/sliver/protobuf/clientpb"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/gin-gonic/gin"
)

// DashboardStats represents the stats shown on the dashboard
type DashboardStats struct {
	Sessions    int `json:"sessions"`
	Beacons     int `json:"beacons"`
	Jobs        int `json:"jobs"`
	Implants    int `json:"implants"`
	Hosts       int `json:"hosts"`
	Credentials int `json:"credentials"`
	Loot        int `json:"loot"`
}

// ActivityEvent represents an event in the activity feed
type ActivityEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Message   string                 `json:"message"`
	Timestamp string                 `json:"timestamp"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// GetDashboardStats returns aggregated stats for the dashboard
func (h *Handler) GetDashboardStats(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"stats": DashboardStats{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	stats := DashboardStats{}

	// Get sessions count
	sessions, err := h.rpc.Rpc.GetSessions(ctx, &commonpb.Empty{})
	if err == nil && sessions != nil {
		stats.Sessions = len(sessions.Sessions)
	}

	// Get beacons count
	beacons, err := h.rpc.Rpc.GetBeacons(ctx, &commonpb.Empty{})
	if err == nil && beacons != nil {
		stats.Beacons = len(beacons.Beacons)
	}

	// Get jobs count
	jobs, err := h.rpc.Rpc.GetJobs(ctx, &commonpb.Empty{})
	if err == nil && jobs != nil {
		stats.Jobs = len(jobs.Active)
	}

	// Get implants count
	implants, err := h.rpc.Rpc.ImplantBuilds(ctx, &commonpb.Empty{})
	if err == nil && implants != nil {
		stats.Implants = len(implants.Configs)
	}

	// Get hosts count
	hosts, err := h.rpc.Rpc.Hosts(ctx, &commonpb.Empty{})
	if err == nil && hosts != nil {
		stats.Hosts = len(hosts.Hosts)
	}

	// Get credentials count
	credentials, err := h.rpc.Rpc.Creds(ctx, &commonpb.Empty{})
	if err == nil && credentials != nil {
		stats.Credentials = len(credentials.Credentials)
	}

	// Get loot count
	loot, err := h.rpc.Rpc.LootAll(ctx, &commonpb.Empty{})
	if err == nil && loot != nil {
		stats.Loot = len(loot.Loot)
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

// GetActivityFeed returns recent activity events
func (h *Handler) GetActivityFeed(c *gin.Context) {
	// Get limit from query param, default to 20
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"events": []ActivityEvent{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	events := make([]ActivityEvent, 0)

	// Get recent sessions and create events for them
	sessions, err := h.rpc.Rpc.GetSessions(ctx, &commonpb.Empty{})
	if err == nil && sessions != nil {
		for _, s := range sessions.Sessions {
			events = append(events, ActivityEvent{
				ID:        s.ID,
				Type:      "session_connect",
				Message:   "Session " + s.Name + " connected from " + s.RemoteAddress,
				Timestamp: time.Unix(s.LastCheckin, 0).Format(time.RFC3339),
				Details: map[string]interface{}{
					"sessionName": s.Name,
					"remoteIP":    s.RemoteAddress,
					"os":          s.OS,
					"arch":        s.Arch,
				},
			})
		}
	}

	// Get recent beacons and create events for them
	beacons, err := h.rpc.Rpc.GetBeacons(ctx, &commonpb.Empty{})
	if err == nil && beacons != nil {
		for _, b := range beacons.Beacons {
			events = append(events, ActivityEvent{
				ID:        b.ID,
				Type:      "beacon_connect",
				Message:   "Beacon " + b.Name + " checked in from " + b.RemoteAddress,
				Timestamp: time.Unix(b.LastCheckin, 0).Format(time.RFC3339),
				Details: map[string]interface{}{
					"beaconName": b.Name,
					"remoteIP":   b.RemoteAddress,
					"os":         b.OS,
					"arch":       b.Arch,
				},
			})
		}
	}

	// Get active jobs and create events
	jobs, err := h.rpc.Rpc.GetJobs(ctx, &commonpb.Empty{})
	if err == nil && jobs != nil {
		for _, j := range jobs.Active {
			events = append(events, ActivityEvent{
				ID:        strconv.FormatUint(uint64(j.ID), 10),
				Type:      "job_started",
				Message:   j.Name + " listener started on " + j.Domains[0] + ":" + strconv.FormatUint(uint64(j.Port), 10),
				Timestamp: time.Now().Format(time.RFC3339), // Jobs don't have start time
				Details: map[string]interface{}{
					"protocol": j.Name,
					"port":     j.Port,
				},
			})
		}
	}

	// Get recent implant builds
	implants, err := h.rpc.Rpc.ImplantBuilds(ctx, &commonpb.Empty{})
	if err == nil && implants != nil {
		for name, config := range implants.Configs {
			events = append(events, ActivityEvent{
				ID:        config.ID,
				Type:      "implant_built",
				Message:   "Implant '" + name + "' built (" + config.GOOS + "/" + config.GOARCH + ")",
				Timestamp: time.Now().Format(time.RFC3339),
				Details: map[string]interface{}{
					"name":   name,
					"os":     config.GOOS,
					"arch":   config.GOARCH,
					"format": outputFormatToString(config.Format),
				},
			})
		}
	}

	// Limit events
	if len(events) > limit {
		events = events[:limit]
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

// outputFormatToString converts OutputFormat to string (for dashboard use)
func outputFormatToString(format clientpb.OutputFormat) string {
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

// Legacy function wrappers for backward compatibility (when handler is nil)

func GetDashboardStats(c *gin.Context) {
	// Return empty stats when not connected
	stats := DashboardStats{
		Sessions:    0,
		Beacons:     0,
		Jobs:        0,
		Implants:    0,
		Hosts:       0,
		Credentials: 0,
		Loot:        0,
	}
	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

func GetActivityFeed(c *gin.Context) {
	// Return empty events when not connected
	c.JSON(http.StatusOK, gin.H{"events": []ActivityEvent{}})
}
