package main

import (
	"log"
	"os"

	"github.com/BishopFox/sliver/web/server/api"
	"github.com/BishopFox/sliver/web/server/config"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Create and start the server
	server := api.NewServer(cfg)

	log.Printf("Starting Sliver Web BFF server on %s", cfg.ServerAddr)

	if err := server.Run(); err != nil {
		log.Printf("Server error: %v", err)
		os.Exit(1)
	}
}
