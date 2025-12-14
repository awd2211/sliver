package rpc

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
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	"github.com/bishopfox/sliver/protobuf/rpcpb"
)

const (
	kb = 1024
	mb = kb * 1024
	gb = mb * 1024

	// ClientMaxReceiveMessageSize - Max gRPC message size ~2Gb
	ClientMaxReceiveMessageSize = (2 * gb) - 1

	defaultTimeout = 10 * time.Second
)

// ClientConfig - Sliver operator config (from .cfg file)
type ClientConfig struct {
	Operator      string `json:"operator"`
	LHost         string `json:"lhost"`
	LPort         int    `json:"lport"`
	Token         string `json:"token"`
	CACertificate string `json:"ca_certificate"`
	PrivateKey    string `json:"private_key"`
	Certificate   string `json:"certificate"`
}

// TokenAuth implements credentials.PerRPCCredentials
type TokenAuth struct {
	token string
}

func (t TokenAuth) GetRequestMetadata(ctx context.Context, in ...string) (map[string]string, error) {
	return map[string]string{
		"Authorization": "Bearer " + t.token,
	}, nil
}

func (TokenAuth) RequireTransportSecurity() bool {
	return true
}

// SliverClient wraps the gRPC connection and client
type SliverClient struct {
	Conn   *grpc.ClientConn
	Rpc    rpcpb.SliverRPCClient
	Config *ClientConfig
}

// NewClientFromConfig creates a new SliverClient from a ClientConfig
func NewClientFromConfig(config *ClientConfig) (*SliverClient, error) {
	tlsConfig, err := getTLSConfig(config.CACertificate, config.Certificate, config.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create TLS config: %w", err)
	}

	transportCreds := credentials.NewTLS(tlsConfig)
	callCreds := credentials.PerRPCCredentials(TokenAuth{token: config.Token})

	options := []grpc.DialOption{
		grpc.WithTransportCredentials(transportCreds),
		grpc.WithPerRPCCredentials(callCreds),
		grpc.WithBlock(),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(ClientMaxReceiveMessageSize)),
	}

	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	addr := fmt.Sprintf("%s:%d", config.LHost, config.LPort)
	conn, err := grpc.DialContext(ctx, addr, options...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s: %w", addr, err)
	}

	return &SliverClient{
		Conn:   conn,
		Rpc:    rpcpb.NewSliverRPCClient(conn),
		Config: config,
	}, nil
}

// NewClientFromFile creates a new SliverClient from a config file path
func NewClientFromFile(configPath string) (*SliverClient, error) {
	config, err := ReadConfig(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}
	return NewClientFromConfig(config)
}

// ReadConfig reads a Sliver operator config from a file
func ReadConfig(configPath string) (*ClientConfig, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	config := &ClientConfig{}
	if err := json.Unmarshal(data, config); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	return config, nil
}

// Close closes the gRPC connection
func (c *SliverClient) Close() error {
	if c.Conn != nil {
		return c.Conn.Close()
	}
	return nil
}

// IsConnected checks if the client is connected to the server
func (c *SliverClient) IsConnected() bool {
	if c == nil || c.Conn == nil {
		return false
	}
	// Check connection state
	state := c.Conn.GetState()
	return state.String() == "READY" || state.String() == "IDLE"
}

func getTLSConfig(caCertificate, certificate, privateKey string) (*tls.Config, error) {
	certPEM, err := tls.X509KeyPair([]byte(certificate), []byte(privateKey))
	if err != nil {
		return nil, fmt.Errorf("cannot parse client certificate: %w", err)
	}

	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM([]byte(caCertificate)) {
		return nil, fmt.Errorf("failed to parse CA certificate")
	}

	tlsConfig := &tls.Config{
		Certificates:       []tls.Certificate{certPEM},
		RootCAs:            caCertPool,
		InsecureSkipVerify: true,
		VerifyPeerCertificate: func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
			return rootOnlyVerifyCertificate(caCertificate, rawCerts)
		},
	}

	return tlsConfig, nil
}

func rootOnlyVerifyCertificate(caCertificate string, rawCerts [][]byte) error {
	roots := x509.NewCertPool()
	if !roots.AppendCertsFromPEM([]byte(caCertificate)) {
		return fmt.Errorf("failed to parse root certificate")
	}

	if len(rawCerts) == 0 {
		return fmt.Errorf("no certificates provided")
	}

	cert, err := x509.ParseCertificate(rawCerts[0])
	if err != nil {
		return fmt.Errorf("failed to parse certificate: %w", err)
	}

	options := x509.VerifyOptions{
		Roots: roots,
	}

	if _, err := cert.Verify(options); err != nil {
		return fmt.Errorf("failed to verify certificate: %w", err)
	}

	return nil
}
