package server

import (
	"testing"
)

func Test_Cmd(t *testing.T) {
	sshconfig := &SSHClientConfig{
		User:     "user",
		Password: "user",
		Host:     "192.168.1.1",
	}

	sshclient := NewSSHClient(sshconfig)
	t.Log(sshclient.Host)

	stdout, stderr, session, err := sshclient.Cmd("pwd", nil, nil, 0)
	if err != nil {
		t.Error(err)
	}

	t.Log(stdout)
	t.Log(stderr)
	t.Log(session)
	t.Log("test")
}
