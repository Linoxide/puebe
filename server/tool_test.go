package server

import (
	"testing"
)

func Test_newSSHClient(t *testing.T) {

	config := &SSHClientConfig{
		User:     "s",
		Password: "1223",
		Host:     "127.0.0.1",
	}
	sshclient := NewSSHClient(config)
	stdout, stderr, session, err := sshclient.Cmd("pwd", nil, nil, 0)
	if err != nil {
		t.Error(err)
	}
	t.Log(stdout)
	t.Log(stderr)
	stdout, stderr, session, err = sshclient.Cmd("ls", nil, nil, 0)
	t.Log(stdout)
	t.Log("test")
}

func Test_mutiCmd(t *testing.T) {

	config := &SSHClientConfig{
		User:     "dummy",
		Password: "login",
		Host:     "192.24.2.11.10",
	}
	NewSSHClient(config)

	config2 := &SSHClientConfig{
		User:     "hello",
		Password: "server",
		Host:     "8.8.8.8",
	}
	NewSSHClient(config2)
	stdout, _, _, err := ExecuteCmd("pwd", "8.8.8.8")
	if err != nil {
		t.Error(err)
	}
	t.Log(stdout)

	stdout, _, _, err = ExecuteCmd("pwd", "114.215.151.48")
	if err != nil {
		t.Error(err)
	}
	t.Log(stdout)
	t.Log("test")
}
