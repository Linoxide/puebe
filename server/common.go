package server

import (
	"io"
	"log"

	"golang.org/x/crypto/ssh"
)

type PtyInfo struct {
	Term  string
	H     int
	W     int
	Modes ssh.TerminalModes
}

type ReadWriteCloser interface {
	io.Reader
	io.WriteCloser
}

type ForwardConfig struct {
	LocalBindAddress string
	RemoteAddress    string
	SshServerAddress string
	SshUserName      string
	SshUserPassword  string
	SshPrivateKey    string
}

func makeConfig(user string, password string, privateKey string) (config *ssh.ClientConfig) {

	if password == "" && user == "" {
		user = "root"
		password = "root"
	}

	config = &ssh.ClientConfig{
		User: user,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
	}
	if privateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(privateKey))
		if err != nil {
			log.Print("ssh.ParsePrivateKey error:%v", err)
		}
		clientkey := ssh.PublicKeys(signer)
		config = &ssh.ClientConfig{
			User: user,
			Auth: []ssh.AuthMethod{
				clientkey,
			},
		}
	}
	return
}
