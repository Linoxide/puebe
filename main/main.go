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
	
	_ "github.com/go-sql-driver/mysql"
	"github.com/scottkiss/gomagic/dbmagic"
	"github.com/Linoxide/puebe/server"
	
	"golang.org/x/crypto/ssh"
)

//Variables to start ssh server client
var (
	exitCode bool
	hostName string
	userName string
	passWord string
	fileName string
	dbname   string
	dbuser	 string
	dbpass	 string
	dbquery  string
	fileLocation string
	port int
)

var help string = "puebe OPTION [sh ssh login] [-cp file transfer] [-pf ssh server forward] [-lf local port forward]"
const BUFFER_SIZE = 1024 * 4
const MAXTHROUGHPUT = 6553600

var buf = make([]byte, BUFFER_SIZE) //holds buffer variable

//ssh server structure.
type hostServer struct {
	Host string
}


func main() {

	var option string
	
	fmt.Printf("\nPUEBE SSH TOOL")
	fmt.Printf("\nUsage: puebe [OPTION].")
	fmt.Printf("\npuebe [-sh ssh login] [-cp file transfer] [-pf ssh server forward] [-lf local port forward]")
	fmt.Printf("\npuebe --help [To view options] ")
	fmt.Printf("\nEnter option: ")
	 _, err := fmt.Scanf("%s", &option)
	 
	switch(option) {
		case "-sh"://ssh login
			fmt.Printf("\nEnter Host name, User name and Password: ")
			_, err = fmt.Scanf("%s, %s, %s", &hostName, &userName, &passWord)
			if err != nil {
				fmt.Println(err)
			}
			
			server := &server {
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
				if quit {
					break
				}
				inputReader := bufio.NewReader(os.Stdin)
				input, err := inputReader.ReadString('\n')
				if err != nil {
					fmt.Println("Errors reading connection.")
					return
				}
				b := []byte(input)
				conn.Write(b)
			}
			break
		
		case "-cp"://ssh copy
			fmt.Printf("\nEnter Host name, User name and Password: ")
			_, err = fmt.Scanf("%s, %s, %s", &hostName, &userName, &passWord)
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
				Host:	  hostName,
			}
			sshclient := server.NewSSHClient(config)
			sshclient.MaxDataThroughput = MAXTHROUGHPUT
			stdout, stderr, err := server.UploadFile(hostName, fileLocation, fileName)
			if err != nil {
				log.Panicln(err)
			}
	
			if stderr != "" {
				log.Panicln(stderr)
			}
			
			log.Println("File sent" + stdout)
			break
		
		case "-pf": //ssh server forwarding
			fmt.Printf("\nEnter Local BindAddress, Remote addr, ssh server addr, username, password")
			_, err = fmt.Scanf("%s, %s, %s, %s, %s", &bindaddr, &remoteaddr,&hostName, &userName, &passWord)
			server := new(server.LocalForwardServer)
			server.LocalBindAddress = bindaddr
			server.RemoteAddress = remoteaddr
			server.SshServerAddress = hostName
			server.SshUserPassword = userName
			server.SshUserName = passWord
			server.Start()
			defer server.Stop()
		
		case "-lf"://ssh local port forwarding
			fmt.Printf("\nEnter Host Name, DB name, DB password and Port")
			_, err := fmt.Scanf("%s, %s, %s, %d", &hostName, &dbname, &dbpass, &port)
			ds := new(dbmagic.DataSource)
			ds.Charset = "utf8"
			ds.Host = hostName
			ds.Port = port
			ds.DatabaseName = dbname
			ds.User = dbuser
			ds.Password = dbpass
			dbm, err := dbmagic.Open("mysql", ds)
			if err != nil {
				log.Fatal(err)
			}
		
			fmt.Printf("\nEnter Database query: ")
			fmt.Scanf("%s", &dbquery)
			results, err := dbm.Db.Query(dbquery)
			defer dbmagic.Close()
			if err != nil {
				log.Fatal(err)
			}
		
			log.Println(results)
			break
		
		case "--help":
			fmt.Println(help)
			break
		default: 
			fmt.Printf("\nInvalid option.\n")
			break
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
