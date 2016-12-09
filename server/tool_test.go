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
	t.Log(session)
	t.Log("test")
}

func Test_mutiCmd(t *testing.T) {

	config := &SSHClientConfig{
		User:     "dummy",
		Password: "login",
		Host:     "192.168.1.1",
	}
	NewSSHClient(config)

	config2 := &SSHClientConfig{
		User:     "hello",
		Password: "server",
		Host:     "10.10.0.1",
	}
	NewSSHClient(config2)
	stdout, _, _, err := ExecuteCmd("pwd", "10.10.0.1")
	if err != nil {
		t.Error(err)
	}
	t.Log(stdout)

	stdout, _, _, err = ExecuteCmd("pwd", "127.0.0.1")
	if err != nil {
		t.Error(err)
	}
	t.Log(stdout)
	t.Log("test")
}
