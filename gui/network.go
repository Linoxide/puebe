// Network-related information for the GUI
package gui

import (
	"net/http"

	"github.com/Linoxide/puebe/server"
)

func connectionHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if addr := r.FormValue("addr"); addr == "" {
			Error404(w)
		} else {
			gateway.SSHClientConfig.Host = addr
			SendOr404(w, gateway.Connect())
		}
	}
}

func connectionsHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		SendOr404(w, gateway.Connect())
	}
}

func defaultConnectionsHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		SendOr404(w, gateway.Connect())
	}
}

func RegisterNetworkHandlers(mux *http.ServeMux, gateway *server.SSHClient) {
	mux.HandleFunc("/load", connectionHandler(gateway))
	mux.HandleFunc("/load", connectionsHandler(gateway))
	mux.HandleFunc("/", defaultConnectionsHandler(gateway))
}
