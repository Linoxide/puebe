package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"strings"
	"time"
	
	"github.com/Linoxide/puebe/client"
	"github.com/Linoxide/puebe/server/filesytem"
	"github.com/Linoxide/puebe/server/session"
	"github.com/Linoxide/puebe/server/tool"
	_ "github.com/go-sql-driver/mysql"
	"github.com/scottkiss/gomagic/dbmagic"
	
	"golang.org/x/crypto/ssh"
)

//Variables to start ssh server client
var (
	exitCode bool
	hostName string
	userName string
	passWord string
)

const BUFFER_SIZE = 1024 * 4

var buf = make([]byte, BUFFER_SIZE) //holds buffer variable

//ssh server structure.
type server struct {
	Host string
}

/**
 * SSH Forward config.
 */
type ForwardConfig struct {
	LocalBindAddress string
	RemoteAddress    string
	SshServerAddress string
	SshUserName      string
	SshUserPassword  string
	SshPrivateKey    string
}

func startServer() {
	
	//collects ssh arguments.
	flag.Stringvar(&hostName, "h", "", "Host Name")
	flag.StringVar(&userName, "u", "", "User Name")
	flag.StringVar(&passWord, "p", "", "Password")
	
	flag.Parse()
	hostsp := strings.Split(hostName, "@")
	userName = hostsp[0]
	hostName = hostsp[1]
	server := &server {
		Host: "9000",
	}
	
	go server.Start()
	time.Sleep(time.Second)
	conn, err := net.Dial("tcp", ":9000")
	if err != nil {
		fmt.Println(err)
	}
	
	defer conn.Close()
	fmt.Println("connected to ssh server!")
	go onMessageReceived(conn)
	for {
		if quit {
			break
		}
		inputReader := bufio.NewReader(os.Stdin)
		input, err := inputReader.ReadString('\n')
		if err != nil {
			fmt.Println("There were errors reading.")
			return
		}
		b := []byte(input)
		conn.Write(b)
	}
}

func onMessageReceived(conn net.Conn) {
	buffer = make([]byte, BUFFER_SIZE)
	for {
		n, err := conn.Read(buffer)
		if err == io.EOF {
			fmt.Printf("The RemoteAddr: %s is closed!\n", conn.RemoteAddr().String())
			return
		}
		if err != nil {
			break
		}
		if n > 0 {
			str := string(buffer[:n])
			fmt.Printf("%s", str)
			if strings.Contains(str, "logout") {
				quit = true
			}
		} else {
			break
		}
	}
}



func handleConn(conn net.Conn) {
	config := &gosshtool.SSHClientConfig{
		User:     userName,
		Password: passWord,
		Host:     hostName,
	}
	sshclient := gosshtool.NewSSHClient(config)
	_, err := sshclient.Connect()
	if err == nil {
		fmt.Println("ssh connect success")
	} else {
		fmt.Println("ssh connect failure")
	}
	modes := ssh.TerminalModes{
		ssh.ECHO:          0,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	pty := &gosshtool.PtyInfo{
		Term:  "xterm-256color",
		H:     80,
		W:     40,
		Modes: modes,
	}
	session, err := sshclient.Pipe(conn, pty, nil, 30)
	if err != nil {
		fmt.Println(err)
	}
	defer session.Close()
}

func (s *server) Start() {
	ln, err := net.Listen("tcp", s.Host)
	if err != nil {
		fmt.Println(err)
	}
	defer ln.Close()
	for {
		conn, err := ln.Accept()
		if err != nil {
			fmt.Println(err)
		}
		go handleConn(conn)
	}
}

/**
 * Local Port Forwarding.
 */
func localPortForward() {
	ds := new(dbmagic.DataSource)
	ds.Charset = "utf8"
	ds.Host = "127.0.0.1"
	ds.Port = 9999
	ds.DatabaseName = "test"
	ds.User = "root"
	ds.Password = "password"
	dbm, err := dbmagic.Open("mysql", ds)
	if err != nil {
		log.Fatal(err)
	}
	row := dbm.Db.QueryRow("select name from provinces where id=?", 1)
	var name string
	err = row.Scan(&name)
	if err != nil {
		log.Fatal(err)
	}
	log.Println(name)
	dbm.Close()
}





func main() {
	server := new(gosshtool.LocalForwardServer)
	server.LocalBindAddress = ":9999"
	server.RemoteAddress = "remote.com:3306"
	server.SshServerAddress = "112.224.38.111"
	server.SshUserPassword = "passwd"
	server.SshUserName = "sirk"
	server.Start(dbop)
	defer server.Stop()
}



/***
 * SSH File transfer.
 */
func main() {
	config := &gosshtool.SSHClientConfig{
	User:     USER,
	Password: PASSWORD,
		Host:     HOST,
	}
	sshclient := gosshtool.NewSSHClient(config)
	sshclient.MaxDataThroughput = 6553600
	stdout, stderr, err := gosshtool.UploadFile(HOST, "./test", "/root/test/test.txt")
	if err != nil {
		log.Panicln(err)
	}
	
	if stderr != "" {
		log.Panicln(stderr)
	}
	
	log.Println("upload succeeded " + stdout)
}
