package gui

import (
	"time"
	
	"github.com/Linoxide/puebe/server"
	
)

// Exposes a read-only api for use by the gui node rpc interface

// GatewayConfig configuration set of gateway.
type GatewayConfig struct {
	BufferSize int
}

// NewGatewayConfig create and init an GatewayConfig
func NewGatewayConfig() GatewayConfig {
	return GatewayConfig{
		BufferSize: 32,
	}
}

// Gateway RPC interface wrapper for daemon state
type Gateway struct {
	Config GatewayConfig
	Daemon NodeRPC

	// Backref to Daemon
	D *NodeRPC
	
	// Requests are queued on this channel
	Requests chan func()
	// When a request is done processing, it is placed on this channel
	// Responses chan interface{}
}

// NewGateway create and init an Gateway instance.
func NewGateway(c GatewayConfig, D *NodeRPC) *Gateway {
	return &Gateway{
		Config:   c,
		Daemon:   NodeRPC{},
		D:        D,
		Requests: make(chan func(), c.BufferSize),
	}
}


// Get all connections to addresses
func (gw *Gateway) GetNodes() interface{} {
	conns := make(chan interface{})
	gw.Requests <- func() {
		conns <- gw.Daemon.ReloadNodes()
	}
	return <-conns
}

// Get Node returns the connection to a specific address
func (gw *Gateway) GetNode(id string) interface{} {
	conn := make(chan interface{})
	gw.Requests <- func() {
		conn <- gw.Daemon.GetNode(id)
	}
	return <-conn
}


// GetTimeNow returns the current Unix time
func (gw *Gateway) GetTimeNow() uint64 {
	return uint64(time.Now().Unix())
}
