package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/Linoxide/puebe/gui"
	"github.com/Linoxide/puebe/server"
	_ "github.com/go-sql-driver/mysql"
	logging "github.com/op/go-logging"
	"github.com/scottkiss/gomagic/dbmagic"
	"github.com/toqueteos/webbrowser"

	"golang.org/x/crypto/ssh"
)

type rpcHandler struct {
	workerNum uint
	ops       chan operation // request channel
	// reqChan chan
	close    chan struct{}
	mux      *http.ServeMux
	handlers map[string]jobHandler
}

const maxThroughPut = 6553600

type Config struct {
	Address string
	//gnet uses this for TCP incoming and outgoing
	Port int
	//max connections to maintain

	//AddressVersion string
	// Remote web interface
	WebInterface      bool
	WebInterfacePort  int
	WebInterfaceAddr  string
	WebInterfaceUser  string
	WebInterfacePass  string
	WebInterfaceHTTPS bool

	// Launch System Default Browser after client startup
	LaunchBrowser bool

	// If true, print the configured client web interface address and exit
	PrintWebInterfaceAddress bool

	// Data directory holds app data -- defaults to ~/.skycoin
	DataDirectory string
	// GUI directory contains assets for the html gui
	GUIDirectory string
	// This is the value registered with flag, it is converted to LogLevel after parsing
	LogLevel logging.Level
	logLevel string

	// Will force it to connect to this ip:port, instead of waiting for it
	// to show up as a peer
	ConnectTo string
}

func (c *Config) register() {

	flag.StringVar(&c.Address, "address", c.Address,
		"IP Address to run application on. Leave empty to default to a public interface")
	flag.IntVar(&c.Port, "port", c.Port, "Port to run application on")
	flag.BoolVar(&c.WebInterface, "web-interface", c.WebInterface,
		"enable the web interface")
	flag.IntVar(&c.WebInterfacePort, "web-interface-port",
		c.WebInterfacePort, "port to serve web interface on")
	flag.StringVar(&c.WebInterfaceAddr, "web-interface-addr",
		c.WebInterfaceAddr, "addr to serve web interface on")
	flag.StringVar(&c.WebInterfaceUser, "web-interface-user-name",
		c.WebInterfaceUser, "default user for web interface HTTPS. "+
			"If not provided, will use User name in -data-directory")
	flag.StringVar(&c.WebInterfacePass, "web-interface-key",
		c.WebInterfacePass, "Password for web interface HTTPS. "+
			"If not provided, will use key.pem in -data-directory")
	flag.BoolVar(&c.WebInterfaceHTTPS, "web-interface-https",
		c.WebInterfaceHTTPS, "enable HTTPS for web interface")
	flag.BoolVar(&c.LaunchBrowser, "launch-browser", c.LaunchBrowser,
		"launch system default webbrowser at client startup")
	flag.BoolVar(&c.PrintWebInterfaceAddress, "print-web-interface-address",
		c.PrintWebInterfaceAddress, "print configured web interface address and exit")
	flag.StringVar(&c.DataDirectory, "data-dir", c.DataDirectory,
		"directory to store app data (defaults to ~/.skycoin)")
	flag.StringVar(&c.ConnectTo, "connect-to", c.ConnectTo,
		"connect to this ip only")
	flag.StringVar(&c.GUIDirectory, "gui-dir", c.GUIDirectory,
		"static content directory for the html gui")

}

var devConfig Config = Config{

	// Which address to serve on. Leave blank to automatically assign to a
	// public interface
	Address: "",
	//gnet uses this for TCP incoming and outgoing
	Port: 9000,

	//AddressVersion: "test",
	// Remote web interface
	WebInterface:             true,
	WebInterfacePort:         9000,
	WebInterfaceAddr:         "127.0.0.1",
	WebInterfaceUser:         "root",
	WebInterfacePass:         "root",
	WebInterfaceHTTPS:        false,
	PrintWebInterfaceAddress: false,
	LaunchBrowser:            true,
	// Data directory holds app data -- defaults to ~/.puebe
	DataDirectory: ".puebe",
	// Web GUI static resources
	GUIDirectory: "./src/gui/static/",

	ConnectTo: "",
}

func (c *Config) Parse() {
	c.register()
	flag.Parse()
	c.postProcess()
}

func (c *Config) postProcess() {

	c.DataDirectory = util.InitDataDir(c.DataDirectory)

	if c.NodeDirectory == "" {
		c.NodeDirectory = filepath.Join(c.DataDirectory, "nodes/")
	}
}

func configureDaemon(c *Config) server.SSHClientConfig {

	var dc server.SSHClientConfig
	dc.dataDir = c.DataDirectory
	dc.Port = c.Port
	dc.Host = c.Address
	dc.User = c.WebInterfaceUser
	dc.Pass = c.WebInterfacePass

	return dc
}

func Run(c *Config) {

	scheme := "http"
	if c.WebInterfaceHTTPS {
		scheme = "https"
	}
	host := fmt.Sprintf("%s:%d", c.WebInterfaceAddr, c.WebInterfacePort)
	fullAddress := fmt.Sprintf("%s://%s", scheme, host)
	logger.Critical("Full address: %s", fullAddress)

	if c.PrintWebInterfaceAddress {
		fmt.Println(fullAddress)
		return
	}

	// If the user Ctrl-C's, shutdown properly
	quit := make(chan int)
	go catchInterrupt(quit)
	// Watch for SIGUSR1
	go catchDebug()

	dconf := configureDaemon(c)
	node := server.NewSessionWithChannel(dconf, quit, nil, 0)
	go node.Connect()

	if c.WebInterface {
		var err error
		if c.WebInterfaceHTTPS {

			err = gui.LaunchWebInterfaceHTTPS(host, c.GUIDirectory, node, c.WebInterfaceUser, c.WebInterfacePass)
		} else {
			err = gui.LaunchWebInterface(c.Address, c.GUIDirectory, node)
		}

		if err != nil {
			logger.Error(err.Error())
			logger.Error("Failed to start web GUI")
			os.Exit(1)
		}

		if c.LaunchBrowser {
			go func() {
				// Wait a moment just to make sure the http interface is up
				time.Sleep(time.Millisecond * 100)

				logger.Info("Launching System Browser with %s", fullAddress)
				if err := OpenBrowser(fullAddress); err != nil {
					logger.Error(err.Error())
				}
			}()
		}
	}

	<-quit
	close(node.connect)

	logger.Info("Shutting down")
	logger.Info("Goodbye")
}

func OpenBrowser(url string) error {
	return webbrowser.Open(url)
}

func main() {

	devConfig.Parse()
	Run(&devConfig)
}

func catchInterrupt(quit chan<- int) {
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, os.Interrupt)
	<-sigchan
	signal.Stop(sigchan)
	quit <- 1
}

// Catches SIGUSR1 and prints internal program state
func catchDebug() {
	sigchan := make(chan os.Signal, 1)
	//signal.Notify(sigchan, syscall.SIGUSR1)
	signal.Notify(sigchan, syscall.Signal(0xa)) // SIGUSR1 = Signal(0xa)
	for {
		select {
		case <-sigchan:
			printProgramStatus()
		}
	}
}
