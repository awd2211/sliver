package config

import (
	"os"
	"time"
)

type Config struct {
	// Server settings
	ServerAddr string

	// Sliver gRPC connection
	// SliverConfigPath is the path to the Sliver operator config file (.cfg)
	// This file contains the certificates and connection info needed to connect to the Sliver server
	SliverConfigPath string

	// JWT settings
	JWTSecret     string
	JWTExpiration time.Duration

	// CORS settings
	AllowedOrigins []string
}

func Load() *Config {
	return &Config{
		ServerAddr:       getEnv("SERVER_ADDR", ":8080"),
		SliverConfigPath: getEnv("SLIVER_CONFIG_PATH", ""),
		JWTSecret:        getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiration:    24 * time.Hour,
		AllowedOrigins: []string{
			"http://localhost:3000",
			"http://localhost:5173",
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
