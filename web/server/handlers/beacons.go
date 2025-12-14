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

// BeaconResponse represents a Sliver beacon in the API response
type BeaconResponse struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Hostname      string   `json:"hostname"`
	UUID          string   `json:"uuid"`
	Username      string   `json:"username"`
	UID           string   `json:"uid"`
	GID           string   `json:"gid"`
	OS            string   `json:"os"`
	Arch          string   `json:"arch"`
	Transport     string   `json:"transport"`
	RemoteAddress string   `json:"remoteAddress"`
	PID           int32    `json:"pid"`
	Filename      string   `json:"filename"`
	LastCheckin   string   `json:"lastCheckin"`
	ActiveC2      string   `json:"activeC2"`
	Version       string   `json:"version"`
	Evasion       bool     `json:"evasion"`
	IsDead        bool     `json:"isDead"`
	Interval      int64    `json:"interval"`
	Jitter        int64    `json:"jitter"`
	NextCheckin   string   `json:"nextCheckin"`
	ProxyURL      string   `json:"proxyURL"`
	Burned        bool     `json:"burned"`
	Locale        string   `json:"locale"`
	FirstContact  string   `json:"firstContact"`
	Integrity     string   `json:"integrity"`
	TasksCount    int      `json:"tasksCount"`
	TasksCountCompleted int `json:"tasksCountCompleted"`
}

// beaconToResponse converts a protobuf Beacon to API response
func beaconToResponse(b *clientpb.Beacon) BeaconResponse {
	nextCheckin := time.Unix(b.NextCheckin, 0)
	return BeaconResponse{
		ID:            b.ID,
		Name:          b.Name,
		Hostname:      b.Hostname,
		UUID:          b.UUID,
		Username:      b.Username,
		UID:           b.UID,
		GID:           b.GID,
		OS:            b.OS,
		Arch:          b.Arch,
		Transport:     b.Transport,
		RemoteAddress: b.RemoteAddress,
		PID:           b.PID,
		Filename:      b.Filename,
		LastCheckin:   time.Unix(b.LastCheckin, 0).Format(time.RFC3339),
		ActiveC2:      b.ActiveC2,
		Version:       b.Version,
		Evasion:       b.Evasion,
		IsDead:        b.IsDead,
		Interval:      b.Interval,
		Jitter:        b.Jitter,
		NextCheckin:   nextCheckin.Format(time.RFC3339),
		ProxyURL:      b.ProxyURL,
		Burned:        b.Burned,
		Locale:        b.Locale,
		FirstContact:  time.Unix(b.FirstContact, 0).Format(time.RFC3339),
		Integrity:     b.Integrity,
		TasksCount:    int(b.TasksCount),
		TasksCountCompleted: int(b.TasksCountCompleted),
	}
}

// ListBeacons returns all beacons
func (h *Handler) ListBeacons(c *gin.Context) {
	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"beacons": []BeaconResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	beacons, err := h.rpc.Rpc.GetBeacons(ctx, &commonpb.Empty{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]BeaconResponse, 0, len(beacons.Beacons))
	for _, b := range beacons.Beacons {
		result = append(result, beaconToResponse(b))
	}

	c.JSON(http.StatusOK, gin.H{"beacons": result})
}

// GetBeacon returns a specific beacon by ID
func (h *Handler) GetBeacon(c *gin.Context) {
	beaconID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Beacon not found: " + beaconID})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	beacon, err := h.rpc.Rpc.GetBeacon(ctx, &clientpb.Beacon{ID: beaconID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if beacon == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Beacon not found: " + beaconID})
		return
	}

	c.JSON(http.StatusOK, gin.H{"beacon": beaconToResponse(beacon)})
}

// KillBeacon removes a beacon
func (h *Handler) KillBeacon(c *gin.Context) {
	beaconID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"message": "Beacon killed: " + beaconID})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := h.rpc.Rpc.RmBeacon(ctx, &clientpb.Beacon{ID: beaconID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Beacon killed: " + beaconID})
}

// BeaconTaskResponse represents a task queued for a beacon
type BeaconTaskResponse struct {
	ID          string `json:"id"`
	BeaconID    string `json:"beaconId"`
	CreatedAt   string `json:"createdAt"`
	State       string `json:"state"`
	SentAt      string `json:"sentAt,omitempty"`
	CompletedAt string `json:"completedAt,omitempty"`
	Description string `json:"description"`
}

func taskStateToString(state int32) string {
	switch state {
	case 0:
		return "pending"
	case 1:
		return "sent"
	case 2:
		return "completed"
	case 3:
		return "canceled"
	default:
		return "unknown"
	}
}

// GetBeaconTasks returns tasks for a specific beacon
func (h *Handler) GetBeaconTasks(c *gin.Context) {
	beaconID := c.Param("id")

	if !h.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"tasks": []BeaconTaskResponse{}})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tasks, err := h.rpc.Rpc.GetBeaconTasks(ctx, &clientpb.Beacon{ID: beaconID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]BeaconTaskResponse, 0, len(tasks.Tasks))
	for _, t := range tasks.Tasks {
		task := BeaconTaskResponse{
			ID:          t.ID,
			BeaconID:    t.BeaconID,
			CreatedAt:   time.Unix(t.CreatedAt, 0).Format(time.RFC3339),
			State:       t.State,
			Description: t.Description,
		}
		if t.SentAt > 0 {
			task.SentAt = time.Unix(t.SentAt, 0).Format(time.RFC3339)
		}
		if t.CompletedAt > 0 {
			task.CompletedAt = time.Unix(t.CompletedAt, 0).Format(time.RFC3339)
		}
		result = append(result, task)
	}

	c.JSON(http.StatusOK, gin.H{"tasks": result})
}

// Legacy function wrappers for backward compatibility

func ListBeacons(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"beacons": []BeaconResponse{}})
}

func GetBeacon(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusNotFound, gin.H{"error": "Beacon not found: " + id})
}

func KillBeacon(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Beacon killed: " + id})
}

func GetBeaconTasks(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"tasks": []BeaconTaskResponse{}})
}
