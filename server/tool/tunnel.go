package server

import (
	"golang.org/x/crypto/ssh"
)

type Tunnel struct {
	Client *ssh.Client
}
