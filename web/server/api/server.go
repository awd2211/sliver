package api

import (
	"log"

	"github.com/BishopFox/sliver/web/server/config"
	"github.com/BishopFox/sliver/web/server/handlers"
	"github.com/BishopFox/sliver/web/server/middleware"
	"github.com/BishopFox/sliver/web/server/rpc"
	"github.com/BishopFox/sliver/web/server/ws"
	"github.com/gin-gonic/gin"
	"github.com/rs/cors"
)

type Server struct {
	config    *config.Config
	router    *gin.Engine
	rpcClient *rpc.SliverClient
	handler   *handlers.Handler
}

func NewServer(cfg *config.Config) *Server {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	server := &Server{
		config: cfg,
		router: router,
	}

	// Initialize gRPC client if config path is provided
	if cfg.SliverConfigPath != "" {
		client, err := rpc.NewClientFromFile(cfg.SliverConfigPath)
		if err != nil {
			log.Printf("Warning: Failed to connect to Sliver server: %v", err)
			log.Printf("Web server will start but API calls will return mock data")
		} else {
			server.rpcClient = client
			server.handler = handlers.NewHandler(client)
			// Inject RPC client into WebSocket hub for shell functionality
			ws.SetRPCClient(client)
			log.Printf("Connected to Sliver server at %s:%d", client.Config.LHost, client.Config.LPort)
		}
	} else {
		log.Printf("Warning: SLIVER_CONFIG_PATH not set, running in mock mode")
	}

	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   s.config.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})
	s.router.Use(func(ctx *gin.Context) {
		c.HandlerFunc(ctx.Writer, ctx.Request)
		if ctx.Request.Method == "OPTIONS" {
			ctx.AbortWithStatus(204)
			return
		}
		ctx.Next()
	})

	// Health check
	s.router.GET("/health", handlers.HealthCheck)

	// API routes
	api := s.router.Group("/api")
	{
		// Auth routes (no auth required)
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login(s.config))
			auth.POST("/logout", handlers.Logout)
			auth.GET("/me", middleware.AuthMiddleware(s.config), handlers.GetCurrentUser)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(s.config))
		{
			// Sessions - use Handler methods if connected for real gRPC
			sessions := protected.Group("/sessions")
			{
				if s.handler != nil {
					sessions.GET("", s.handler.ListSessions)
					sessions.GET("/:id", s.handler.GetSession)
					sessions.DELETE("/:id", s.handler.KillSession)
				} else {
					sessions.GET("", handlers.ListSessions)
					sessions.GET("/:id", handlers.GetSession)
					sessions.DELETE("/:id", handlers.KillSession)
				}

				// Interactive commands - use Handler methods if connected for real gRPC
				if s.handler != nil {
					sessions.GET("/:id/ps", s.handler.GetProcesses)
					sessions.POST("/:id/kill-process", s.handler.KillProcess)
					sessions.POST("/:id/migrate", s.handler.MigrateProcess)
					sessions.POST("/:id/ls", s.handler.ListFiles)
					sessions.POST("/:id/mkdir", s.handler.MakeDirectory)
					sessions.POST("/:id/rm", s.handler.RemoveFile)
					sessions.POST("/:id/download", s.handler.DownloadFile)
					sessions.POST("/:id/upload", s.handler.UploadFile)
					sessions.GET("/:id/env", s.handler.GetEnvironmentVariables)
					sessions.GET("/:id/ifconfig", s.handler.GetNetworkInterfaces)
					sessions.GET("/:id/netstat", s.handler.GetNetstat)
					sessions.GET("/:id/info", s.handler.GetSystemInfo)
					sessions.POST("/:id/execute", s.handler.ExecuteCommand)
					sessions.POST("/:id/screenshot", s.handler.TakeScreenshot)
				} else {
					sessions.GET("/:id/ps", handlers.GetProcesses)
					sessions.POST("/:id/kill-process", handlers.KillProcess)
					sessions.POST("/:id/migrate", handlers.MigrateProcess)
					sessions.POST("/:id/ls", handlers.ListFiles)
					sessions.POST("/:id/mkdir", handlers.MakeDirectory)
					sessions.POST("/:id/rm", handlers.RemoveFile)
					sessions.POST("/:id/download", handlers.DownloadFile)
					sessions.POST("/:id/upload", handlers.UploadFile)
					sessions.GET("/:id/env", handlers.GetEnvironmentVariables)
					sessions.GET("/:id/ifconfig", handlers.GetNetworkInterfaces)
					sessions.GET("/:id/netstat", handlers.GetNetstat)
					sessions.GET("/:id/info", handlers.GetSystemInfo)
					sessions.POST("/:id/execute", handlers.ExecuteCommand)
					sessions.POST("/:id/screenshot", handlers.TakeScreenshot)
				}

				// Port forwarding - use Handler methods if connected for real gRPC
				if s.handler != nil {
					sessions.GET("/:id/portfwd", s.handler.GetPortForwards)
					sessions.POST("/:id/portfwd", s.handler.CreatePortForward)
					sessions.DELETE("/:id/portfwd/:pfId", s.handler.DeletePortForward)
				} else {
					sessions.GET("/:id/portfwd", handlers.GetPortForwards)
					sessions.POST("/:id/portfwd", handlers.CreatePortForward)
					sessions.DELETE("/:id/portfwd/:pfId", handlers.DeletePortForward)
				}

				// Reverse port forwarding - use Handler methods if connected for real gRPC
				if s.handler != nil {
					sessions.GET("/:id/rportfwd", s.handler.GetReversePortForwards)
					sessions.POST("/:id/rportfwd", s.handler.CreateReversePortForward)
					sessions.DELETE("/:id/rportfwd/:rpfId", s.handler.DeleteReversePortForward)
				} else {
					sessions.GET("/:id/rportfwd", handlers.GetReversePortForwards)
					sessions.POST("/:id/rportfwd", handlers.CreateReversePortForward)
					sessions.DELETE("/:id/rportfwd/:rpfId", handlers.DeleteReversePortForward)
				}

				// SOCKS proxy - use Handler methods if connected for real gRPC
				if s.handler != nil {
					sessions.GET("/:id/socks", s.handler.GetSocksProxies)
					sessions.POST("/:id/socks", s.handler.CreateSocksProxy)
					sessions.DELETE("/:id/socks/:socksId", s.handler.DeleteSocksProxy)
				} else {
					sessions.GET("/:id/socks", handlers.GetSocksProxies)
					sessions.POST("/:id/socks", handlers.CreateSocksProxy)
					sessions.DELETE("/:id/socks/:socksId", handlers.DeleteSocksProxy)
				}

				// Privilege escalation - use Handler methods if connected for real gRPC
				if s.handler != nil {
					sessions.GET("/:id/privs", s.handler.GetPrivileges)
					sessions.POST("/:id/getsystem", s.handler.GetSystem)
					sessions.POST("/:id/impersonate", s.handler.Impersonate)
					sessions.POST("/:id/rev2self", s.handler.RevToSelf)
				} else {
					sessions.GET("/:id/privs", handlers.GetPrivileges)
					sessions.POST("/:id/getsystem", handlers.GetSystem)
					sessions.POST("/:id/impersonate", handlers.Impersonate)
					sessions.POST("/:id/rev2self", handlers.RevToSelf)
				}
			}

			// Beacons - use Handler methods if connected for real gRPC
			beacons := protected.Group("/beacons")
			{
				if s.handler != nil {
					beacons.GET("", s.handler.ListBeacons)
					beacons.GET("/:id", s.handler.GetBeacon)
					beacons.DELETE("/:id", s.handler.KillBeacon)
					beacons.GET("/:id/tasks", s.handler.GetBeaconTasks)
				} else {
					beacons.GET("", handlers.ListBeacons)
					beacons.GET("/:id", handlers.GetBeacon)
					beacons.DELETE("/:id", handlers.KillBeacon)
					beacons.GET("/:id/tasks", handlers.GetBeaconTasks)
				}
			}

			// Jobs/Listeners - use Handler methods if connected for real gRPC
			jobs := protected.Group("/jobs")
			{
				if s.handler != nil {
					jobs.GET("", s.handler.ListJobs)
					jobs.POST("/mtls", s.handler.StartMTLSListener)
					jobs.POST("/http", s.handler.StartHTTPListener)
					jobs.POST("/https", s.handler.StartHTTPSListener)
					jobs.POST("/dns", s.handler.StartDNSListener)
					jobs.DELETE("/:id", s.handler.KillJob)
				} else {
					jobs.GET("", handlers.ListJobs)
					jobs.POST("/mtls", handlers.StartMTLSListener)
					jobs.POST("/http", handlers.StartHTTPListener)
					jobs.POST("/https", handlers.StartHTTPSListener)
					jobs.POST("/dns", handlers.StartDNSListener)
					jobs.DELETE("/:id", handlers.KillJob)
				}
			}

			// Implants - use Handler methods if connected for real gRPC
			implants := protected.Group("/implants")
			{
				if s.handler != nil {
					implants.GET("", s.handler.ListImplants)
					implants.GET("/:name", s.handler.GetImplant)
					implants.POST("/generate", s.handler.GenerateImplant)
					implants.DELETE("/:name", s.handler.DeleteImplant)
				} else {
					implants.GET("", handlers.ListImplants)
					implants.GET("/:name", handlers.GetImplant)
					implants.POST("/generate", handlers.GenerateImplant)
					implants.DELETE("/:name", handlers.DeleteImplant)
				}
			}

			// Builders - use Handler methods if connected for real gRPC
			builders := protected.Group("/builders")
			{
				if s.handler != nil {
					builders.GET("", s.handler.ListBuilders)
				} else {
					builders.GET("", handlers.ListBuilders)
				}
			}

			// Operators - use Handler methods if connected for real gRPC
			operators := protected.Group("/operators")
			{
				if s.handler != nil {
					operators.GET("", s.handler.ListOperators)
				} else {
					operators.GET("", handlers.ListOperators)
				}
			}

			// Loot - use Handler methods if connected for real gRPC
			loot := protected.Group("/loot")
			{
				if s.handler != nil {
					loot.GET("", s.handler.ListLoot)
					loot.GET("/:id", s.handler.GetLoot)
					loot.DELETE("/:id", s.handler.DeleteLoot)
				} else {
					loot.GET("", handlers.ListLoot)
					loot.GET("/:id", handlers.GetLoot)
					loot.DELETE("/:id", handlers.DeleteLoot)
				}
			}

			// Credentials - use Handler methods if connected for real gRPC
			credentials := protected.Group("/credentials")
			{
				if s.handler != nil {
					credentials.GET("", s.handler.ListCredentials)
					credentials.POST("", s.handler.AddCredential)
					credentials.DELETE("/:id", s.handler.DeleteCredential)
				} else {
					credentials.GET("", handlers.ListCredentials)
					credentials.POST("", handlers.AddCredential)
					credentials.DELETE("/:id", handlers.DeleteCredential)
				}
			}

			// Hosts - use Handler methods if connected for real gRPC
			hosts := protected.Group("/hosts")
			{
				if s.handler != nil {
					hosts.GET("", s.handler.ListHosts)
					hosts.GET("/:id", s.handler.GetHost)
				} else {
					hosts.GET("", handlers.ListHosts)
					hosts.GET("/:id", handlers.GetHost)
				}
			}

			// Websites - use Handler methods if connected for real gRPC
			websites := protected.Group("/websites")
			{
				if s.handler != nil {
					websites.GET("", s.handler.ListWebsites)
					websites.GET("/:name", s.handler.GetWebsite)
					websites.POST("", s.handler.AddWebsite)
					websites.DELETE("/:name", s.handler.DeleteWebsite)
				} else {
					websites.GET("", handlers.ListWebsites)
					websites.GET("/:name", handlers.GetWebsite)
					websites.POST("", handlers.AddWebsite)
					websites.DELETE("/:name", handlers.DeleteWebsite)
				}
			}

			// Armory - use Handler methods if connected for real gRPC
			armory := protected.Group("/armory")
			{
				if s.handler != nil {
					armory.GET("", s.handler.GetArmoryIndex)
					armory.POST("/install", s.handler.InstallArmoryPackage)
					armory.POST("/uninstall", s.handler.UninstallArmoryPackage)
					armory.POST("/refresh", s.handler.RefreshArmory)
				} else {
					armory.GET("", handlers.GetArmoryIndex)
					armory.POST("/install", handlers.InstallArmoryPackage)
					armory.POST("/uninstall", handlers.UninstallArmoryPackage)
					armory.POST("/refresh", handlers.RefreshArmory)
				}
			}

			// C2 Profiles - use Handler methods if connected for real gRPC
			c2profiles := protected.Group("/c2profiles")
			{
				if s.handler != nil {
					c2profiles.GET("", s.handler.GetC2Profiles)
					c2profiles.GET("/:name", s.handler.GetC2Profile)
					c2profiles.POST("", s.handler.CreateC2Profile)
					c2profiles.DELETE("/:name", s.handler.DeleteC2Profile)
				} else {
					c2profiles.GET("", handlers.GetC2Profiles)
					c2profiles.GET("/:name", handlers.GetC2Profile)
					c2profiles.POST("", handlers.CreateC2Profile)
					c2profiles.DELETE("/:name", handlers.DeleteC2Profile)
				}
			}

			// Certificates - use Handler methods if connected for real gRPC
			certificates := protected.Group("/certificates")
			{
				if s.handler != nil {
					certificates.GET("", s.handler.GetCertificates)
					certificates.POST("/generate", s.handler.GenerateCertificate)
					certificates.DELETE("/:id", s.handler.DeleteCertificate)
				} else {
					certificates.GET("", handlers.GetCertificates)
					certificates.POST("/generate", handlers.GenerateCertificate)
					certificates.DELETE("/:id", handlers.DeleteCertificate)
				}
			}

			// Canaries - use Handler methods if connected for real gRPC
			canaries := protected.Group("/canaries")
			{
				if s.handler != nil {
					canaries.GET("", s.handler.GetCanaries)
				} else {
					canaries.GET("", handlers.GetCanaries)
				}
			}

			// Dashboard - use Handler methods if connected for real gRPC
			dashboard := protected.Group("/dashboard")
			{
				if s.handler != nil {
					dashboard.GET("/stats", s.handler.GetDashboardStats)
					dashboard.GET("/activity", s.handler.GetActivityFeed)
				} else {
					dashboard.GET("/stats", handlers.GetDashboardStats)
					dashboard.GET("/activity", handlers.GetActivityFeed)
				}
			}

			// Profiles - use Handler methods if connected for real gRPC
			profiles := protected.Group("/profiles")
			{
				if s.handler != nil {
					profiles.GET("", s.handler.ListProfiles)
					profiles.GET("/:name", s.handler.GetProfile)
					profiles.POST("", s.handler.CreateProfile)
					profiles.DELETE("/:name", s.handler.DeleteProfile)
				} else {
					profiles.GET("", handlers.ListProfiles)
					profiles.GET("/:name", handlers.GetProfile)
					profiles.POST("", handlers.CreateProfile)
					profiles.DELETE("/:name", handlers.DeleteProfile)
				}
			}

			// Extensions - use Handler methods if connected for real gRPC
			extensions := protected.Group("/extensions")
			{
				if s.handler != nil {
					extensions.GET("", s.handler.ListExtensions)
					extensions.POST("/install", s.handler.InstallExtension)
					extensions.POST("/uninstall", s.handler.UninstallExtension)
				} else {
					extensions.GET("", handlers.ListExtensions)
					extensions.POST("/install", handlers.InstallExtension)
					extensions.POST("/uninstall", handlers.UninstallExtension)
				}
			}

			// Aliases - use Handler methods if connected for real gRPC
			aliases := protected.Group("/aliases")
			{
				if s.handler != nil {
					aliases.GET("", s.handler.ListAliases)
					aliases.POST("/install", s.handler.InstallAlias)
					aliases.POST("/uninstall", s.handler.UninstallAlias)
				} else {
					aliases.GET("", handlers.ListAliases)
					aliases.POST("/install", handlers.InstallAlias)
					aliases.POST("/uninstall", handlers.UninstallAlias)
				}
			}

			// Reactions - use Handler methods if connected for real gRPC
			reactions := protected.Group("/reactions")
			{
				if s.handler != nil {
					reactions.GET("", s.handler.ListReactions)
					reactions.POST("", s.handler.CreateReaction)
					reactions.DELETE("/:id", s.handler.DeleteReaction)
				} else {
					reactions.GET("", handlers.ListReactions)
					reactions.POST("", handlers.CreateReaction)
					reactions.DELETE("/:id", handlers.DeleteReaction)
				}
			}

			// Traffic Encoders - use Handler methods if connected for real gRPC
			trafficEncoders := protected.Group("/traffic-encoders")
			{
				if s.handler != nil {
					trafficEncoders.GET("", s.handler.ListTrafficEncoders)
					trafficEncoders.POST("", s.handler.AddTrafficEncoder)
					trafficEncoders.DELETE("/:id", s.handler.DeleteTrafficEncoder)
				} else {
					trafficEncoders.GET("", handlers.ListTrafficEncoders)
					trafficEncoders.POST("", handlers.AddTrafficEncoder)
					trafficEncoders.DELETE("/:id", handlers.DeleteTrafficEncoder)
				}
			}

			// Compiler Info - use Handler methods if connected for real gRPC
			compiler := protected.Group("/compiler")
			{
				if s.handler != nil {
					compiler.GET("/info", s.handler.GetCompilerInfo)
				} else {
					compiler.GET("/info", handlers.GetCompilerInfo)
				}
			}

			// Crack (hashcat) - use Handler methods if connected for real gRPC
			crack := protected.Group("/crack")
			{
				if s.handler != nil {
					crack.GET("/stations", s.handler.ListCrackStations)
					crack.GET("/jobs", s.handler.ListCrackJobs)
					crack.POST("/jobs", s.handler.CreateCrackJob)
					crack.GET("/wordlists", s.handler.ListWordlists)
					crack.POST("/wordlists", s.handler.AddWordlist)
					crack.DELETE("/wordlists/:id", s.handler.DeleteWordlist)
					crack.GET("/rules", s.handler.ListRules)
					crack.POST("/rules", s.handler.AddRule)
					crack.DELETE("/rules/:id", s.handler.DeleteRule)
					crack.GET("/hcstat2", s.handler.ListHcstat2)
					crack.POST("/hcstat2", s.handler.AddHcstat2)
					crack.DELETE("/hcstat2/:id", s.handler.DeleteHcstat2)
				} else {
					crack.GET("/stations", handlers.ListCrackStations)
					crack.GET("/jobs", handlers.ListCrackJobs)
					crack.POST("/jobs", handlers.CreateCrackJob)
					crack.GET("/wordlists", handlers.ListWordlists)
					crack.POST("/wordlists", handlers.AddWordlist)
					crack.DELETE("/wordlists/:id", handlers.DeleteWordlist)
					crack.GET("/rules", handlers.ListRules)
					crack.POST("/rules", handlers.AddRule)
					crack.DELETE("/rules/:id", handlers.DeleteRule)
					crack.GET("/hcstat2", handlers.ListHcstat2)
					crack.POST("/hcstat2", handlers.AddHcstat2)
					crack.DELETE("/hcstat2/:id", handlers.DeleteHcstat2)
				}
			}

			// Licenses - use Handler methods if connected for real gRPC
			licenses := protected.Group("/licenses")
			{
				if s.handler != nil {
					licenses.GET("", s.handler.ListLicenses)
				} else {
					licenses.GET("", handlers.ListLicenses)
				}
			}
		}
	}

	// WebSocket endpoint for interactive features
	s.router.GET("/ws", middleware.AuthMiddleware(s.config), ws.HandleWebSocket)
}

func (s *Server) Run() error {
	return s.router.Run(s.config.ServerAddr)
}
