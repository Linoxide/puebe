package gui

import (
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"path/filepath"

	logging "github.com/op/go-logging"

	"golang.org/x/crypto/ssh"
)

var (
	logger = logging.MustGetLogger("gui")
)

const (
	resourceDir = "dist/"
	devDir      = "dev/"
	indexPage   = "index.html"
)

// Begins listening on http://$host, for enabling remote web access
// Does NOT use HTTPS
func LaunchWebInterface(host, staticDir string, daemon *ssh.Client) error {
	logger.Info("Starting web interface on http://%s", host)
	logger.Warning("HTTPS not in use!")
	logger.Info("Web resources directory: %s", staticDir)

	appLoc, err := DetermineResourcePath(staticDir, devDir, resourceDir)
	if err != nil {
		return err
	}

	listener, err := net.Listen("tcp", host)
	if err != nil {
		return err
	}

	// Runs http.Serve() in a goroutine
	serve(listener, NewGUIMux(appLoc, daemon))
	return nil
}

// Begins listening on https://$host, for enabling remote web access
// Uses HTTPS
func LaunchWebInterfaceHTTPS(host, staticDir string, daemon *ssh.Client, userName, Password string) error {
	logger.Info("Starting web interface on https://%s", host)
	logger.Info("Using %s for the default user name", userName)
	logger.Info("Using %s for the default password", Password)
	logger.Info("Web resources directory: %s", staticDir)

	appLoc, err := DetermineResourcePath(staticDir, devDir, resourceDir)
	if err != nil {
		return err
	}

	daemon.User = userName
	daemon.Password = Password

	config := makeConfig(daemon.User, daemon.Password, daemon.Privatekey)

	if err != nil {
		return err
	}

	// Runs http.Serve() in a goroutine
	serve(listener, NewGUIMux(appLoc, daemon))

	return nil
}

func serve(listener net.Listener, mux *http.ServeMux) {
	// http.Serve() blocks
	// Minimize the chance of http.Serve() not being ready before the
	// function returns and the browser opens
	ready := make(chan struct{})
	go func() {
		ready <- struct{}{}
		if err := http.Serve(listener, mux); err != nil {
			log.Panic(err)
		}
	}()
	<-ready
}

// Creates an http.ServeMux with handlers registered
func NewGUIMux(appLoc string, daemon *ssh.Client) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/", newIndexHandler(appLoc))

	fileInfos, _ := ioutil.ReadDir(appLoc)
	for _, fileInfo := range fileInfos {
		route := fmt.Sprintf("/%s", fileInfo.Name())
		if fileInfo.IsDir() {
			route = route + "/"
		}
		mux.Handle(route, http.FileServer(http.Dir(appLoc)))
	}

	// Node interface
	RegisterNodeHandlers(mux, daemon)
	// Network stats interface
	RegisterNetworkHandlers(mux, daemon)
	// Network API handler
	RegisterApiHandlers(mux, daemon)

	return mux
}

// Returns a http.HandlerFunc for index.html, where index.html is in appLoc
func newIndexHandler(appLoc string) http.HandlerFunc {
	// Serves the main page
	return func(w http.ResponseWriter, r *http.Request) {
		page := filepath.Join(appLoc, indexPage)
		logger.Debug("Serving index page: %s", page)
		if r.URL.Path == "/" {
			http.ServeFile(w, r, page)
		} else {
			Error404(w)
		}
	}
}