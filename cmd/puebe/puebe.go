package main

import (
	"flag"
	"fmt"
	"log"
	_ "net/http/pprof"
	"os"
	"os/signal"
	"path/filepath"
	"runtime/pprof"
	//"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/Linoxide/puebe/gui"
	"github.com/Linoxide/puebe/server"
	_ "github.com/go-sql-driver/mysql"
	logging "github.com/op/go-logging"
	"github.com/toqueteos/webbrowser"
)

var (
	logger     = logging.MustGetLogger("main")
	logFormat  = "[puebe].%{module}:%{level}] %{message}"
	logModules = []string{
		"main",
		"gui",
		"server",
	}
	Nd = &gui.NodeRPC{}
)

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

	// Data directory holds app data -- defaults to ~/.puebe
	DataDirectory string
	// GUI directory contains assets for the html gui
	GUIDirectory string
	// This is the value registered with flag, it is converted to LogLevel after parsing
	LogLevel logging.Level
	ColorLog bool
	// This is the value registered with flag, it is converted to LogLevel after parsing
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
		"directory to store app data (defaults to ~/.dist)")
	flag.StringVar(&c.ConnectTo, "connect-to", c.ConnectTo,
		"connect to this ip only")
	flag.StringVar(&c.GUIDirectory, "gui-dir", c.GUIDirectory,
		"static content directory for the html gui")

	flag.StringVar(&c.logLevel, "log-level", c.logLevel,
		"Choices are: debug, info, notice, warning, error, critical")
	flag.BoolVar(&c.ColorLog, "color-log", c.ColorLog,
		"Add terminal colors to log output")
}

var devConfig Config = Config{

	// Which address to serve on. Leave blank to automatically assign to a
	// public interface
	Address: "127.0.0.1",
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
	// Data directory holds app data -- defaults to ~/puebe
	DataDirectory: "./puebe",
	// Web GUI static resources
	GUIDirectory: "./gui/static/",

	ConnectTo: "",

	LogLevel: logging.DEBUG,
	ColorLog: true,
	logLevel: "DEBUG",
}

func (c *Config) Parse() {
	c.register()
	flag.Parse()
	c.postProcess()
}

func (c *Config) postProcess() {

	c.DataDirectory = gui.InitDataDir(c.DataDirectory)
	Nd.InitNodeRPC(c.DataDirectory)

	if Nd.NodeDirectory == "" {
		fp := filepath.Join(c.DataDirectory, "/")
		Nd.NodeDirectory = filepath.Join(fp, c.GUIDirectory)
	}

	ll, err := logging.LogLevel(c.logLevel)
	panicIfError(err, "Invalid -log-level %s", c.logLevel)
	c.LogLevel = ll
}

func panicIfError(err error, msg string, args ...interface{}) {
	if err != nil {
		log.Panicf(msg+": %v", append(args, err)...)
	}
}

func printProgramStatus() {
	fn := "goroutine.prof"
	logger.Debug("Writing goroutine profile to %s", fn)
	p := pprof.Lookup("goroutine")
	f, err := os.Create(fn)
	defer f.Close()
	if err != nil {
		logger.Error("%v", err)
		return
	}
	err = p.WriteTo(f, 2)
	if err != nil {
		logger.Error("%v", err)
		return
	}
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

func initLogging(level logging.Level, color bool) {
	format := logging.MustStringFormatter(logFormat)
	logging.SetFormatter(format)
	for _, s := range logModules {
		logging.SetLevel(level, s)
	}
	stdout := logging.NewLogBackend(os.Stdout, "", 0)
	stdout.Color = color
	logging.SetBackend(stdout)
}

func configureDaemon(c *Config) gui.NodeRPC { //issues may pop up here.

	Nd.CreateNode(c.WebInterfaceUser, c.WebInterfacePass, c.Address, c.Port, "Base Node")

	return *Nd
}

func Run(c *Config) {
	var wg sync.WaitGroup
	wg.Add(1)

	scheme := "http"
	if c.WebInterfaceHTTPS {
		scheme = "https"
	}
	host := fmt.Sprintf("%s:%d", c.WebInterfaceAddr, c.WebInterfacePort)
	fullAddress := fmt.Sprintf("%s://%s ", scheme, host)
	fmt.Printf("Full address: %s", fullAddress)

	if c.PrintWebInterfaceAddress {
		fmt.Println(fullAddress)
		return
	}

	// If the user Ctrl-C's, shutdown properly
	quit := make(chan int)
	go catchInterrupt(quit)
	// Watch for SIGUSR1
	go catchDebug()

	dconf := configureDaemon(c)                //issues may pop up here too
	if dconf.Nodes[0].Connection.IsConnected { //to check if this part is really necessary.
		currSession, _ := server.NewSession(&dconf.Nodes[0].Connection.RemoteConn, nil, 0)
		defer currSession.Close()

	} else {
		log.Print("Could not create new ssh session")
	}

	if c.WebInterface {
		var err error
		if c.WebInterfaceHTTPS {
			err = gui.LaunchWebInterfaceHTTPS(host, c.GUIDirectory, &dconf.Nodes[0].Connection, c.WebInterfaceUser, c.WebInterfacePass)
		} else {
			err = gui.LaunchWebInterface(host, c.GUIDirectory, &dconf.Nodes[0].Connection)
		}

		if err != nil {
			log.Print(err.Error())
			log.Print("Failed to start web GUI")
			os.Exit(1)
		}

		if c.LaunchBrowser {
			go func() {
				// Wait a moment just to make sure the http interface is up
				time.Sleep(time.Millisecond * 100)

				fmt.Printf("Launching System Browser with %s", fullAddress)
				if err := OpenBrowser(fullAddress); err != nil {
					log.Print(err.Error())
				}
			}()
		}
	}

	fmt.Printf("Shutting down")
	fmt.Printf("Goodbye")
	wg.Wait()
}

func OpenBrowser(url string) error {
	return webbrowser.Open(url)
}

func main() {

	devConfig.Parse()
	Run(&devConfig)
}
