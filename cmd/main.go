package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"strings"
	"time"

	"github.com/Linoxide/puebe/server"
	_ "github.com/go-sql-driver/mysql"
	"github.com/scottkiss/gomagic/dbmagic"

	"golang.org/x/crypto/ssh"
)

//Variables to start ssh server client
var (
	exitCode     bool
	hostName     string
	userName     string
	passWord     string
	fileName     string
	dbname       string
	dbuser       string
	dbpass       string
	dbquery      string
	fileLocation string
	bindaddr     string
	remoteaddr   string
	port         int
)

var help string = "puebe OPTION [sh ssh login] [-cp file transfer] [-pf ssh server forward] [-lf local port forward]"

const BUFFER_SIZE = 1024 * 4
const MAXTHROUGHPUT = 6553600

var buf = make([]byte, BUFFER_SIZE) //holds buffer variable

//ssh server structure.
type hostServer struct {
	Host string
}

func (s *hostServer) Start() {
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

func onMessageReceived(conn net.Conn) {
	buffer := make([]byte, BUFFER_SIZE)
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
				exitCode = true
			}
		} else {
			break
		}
	}
}

func handleConn(conn net.Conn) {
	config := &server.SSHClientConfig{
		User:     userName,
		Password: passWord,
		Host:     hostName,
	}
	sshclient := server.NewSSHClient(config)
	_, err := sshclient.Connect()
	if err == nil {
		fmt.Println("SSH Connection success")
	} else {
		fmt.Println("SSH Connection failure")
	}
	modes := ssh.TerminalModes{
		ssh.ECHO:          0,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	pty := &server.PtyInfo{
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

func main() {

	var option string

	fmt.Printf("\nPUEBE SSH TOOL\n")

	for true {

		fmt.Printf("\nUsage: puebe [OPTION].")
		fmt.Printf("\nOPTIONS [-sh ssh login] [-cp file transfer] [-pf ssh server forward] [-lf local port forward]")
		fmt.Printf("\n --help [To view options] [-q Exit] \n\n")
		fmt.Printf("\nEnter option: ")
		_, er := fmt.Scanf("%s", &option)
		if er != nil {
			fmt.Println(er)
		}

		switch option {
		case "sh":
		case "-sh": //ssh login
			sshLogin()
			break

		case "-cp":
		case "cp": //ssh copy
			sshCopy()
			break

		case "pf":
		case "-pf": //ssh server forwarding
			sshForward()
			break

		case "lf":
		case "-lf": //ssh local port forwarding
			fmt.Printf("\nEnter Host Name, DB name, DB password and Port")
			_, err := fmt.Scanf("%s, %s, %s, %d", &hostName, &dbname, &dbpass, &port)
			if err != nil {
				fmt.Println(err)
			}
			dbWorker()
			break

		case "--help":
		case "help":
			fmt.Println(help)
			break
		case "q":
		case "Q":
		case "-q":
		case "-Q":
			os.Exit(1)
			break
		default:
			fmt.Printf("\nInvalid option.\n")
			break
		}
	} //end infinite loop
}

func sshForward() {
	fmt.Printf("\nEnter Local BindAddress, Remote addr, ssh server addr, username, password")
	_, err := fmt.Scanf("%s, %s, %s, %s, %s", &bindaddr, &remoteaddr, &hostName, &userName, &passWord)
	if err != nil {
		fmt.Println(err)
	}

	srv := new(server.LocalForwardServer)
	srv.LocalBindAddress = bindaddr
	srv.RemoteAddress = remoteaddr
	srv.SshServerAddress = hostName
	srv.SshUserPassword = userName
	srv.SshUserName = passWord
	go srv.Start(dbWorker)
	defer srv.Stop()
}

func sshCopy() {
	fmt.Printf("\nEnter Host name, User name and Password: ")
	_, err := fmt.Scanf("%s, %s, %s", &hostName, &userName, &passWord)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Printf("\nEnter File location, File name: ")
	_, err = fmt.Scanf("%s, %s", &fileLocation, &fileName)
	if err != nil {
		fmt.Println(err)
	}

	config := &server.SSHClientConfig{
		User:     userName,
		Password: passWord,
		Host:     hostName,
	}
	sshclient := server.NewSSHClient(config)
	sshclient.MaxDataThroughput = MAXTHROUGHPUT
	stdout, stderr, erru := server.UploadFile(hostName, fileLocation, fileName)
	if erru != nil {
		log.Panicln(erru)
	}

	if stderr != "" {
		log.Panicln(stderr)
	}

	log.Println("File sent" + stdout)
	return
}

func sshLogin() {
	fmt.Printf("\nEnter Host name, User name and Password: ")
	_, er := fmt.Scanf("%s, %s, %s", &hostName, &userName, &passWord)
	if er != nil {
		fmt.Println(er)
	}

	server := &hostServer{
		Host: hostName,
	}

	go server.Start()
	time.Sleep(time.Second)
	conn, err := net.Dial("tcp", ":8080")
	if err != nil {
		fmt.Println(err)
	}

	defer conn.Close()
	fmt.Println("Connected to ssh server!")
	go onMessageReceived(conn)
	for {
		if exitCode {
			break
		}
		inputReader := bufio.NewReader(os.Stdin)
		input, erro := inputReader.ReadString('\n')
		if erro != nil {
			fmt.Println("Errors reading connection.")
			return
		}
		b := []byte(input)
		conn.Write(b)
	}
	return
}

func dbWorker() {

	ds := new(dbmagic.DataSource)
	ds.Charset = "utf8"
	ds.Host = hostName
	ds.Port = port
	ds.DatabaseName = dbname
	ds.User = dbuser
	ds.Password = dbpass
	dbm, erm := dbmagic.Open("mysql", ds)
	if erm != nil {
		log.Fatal(erm)
	}

	fmt.Printf("\nEnter Database query: ")
	fmt.Scanf("%s", &dbquery)
	results, errm := dbm.Db.Query(dbquery)
	defer dbm.Db.Close()
	if errm != nil {
		log.Fatal(errm)
	}

	log.Println(results)
}
