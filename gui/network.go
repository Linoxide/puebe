// Network-related information for the GUI
package gui

import (
	"net/http"
)

func connectionHandler(gateway *Gateway) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if addr := r.FormValue("addr"); addr == "" {
			Error404(w)
		} else {
			SendOr404(w, gateway.GetNode(addr))
		}
	}
}

func connectionsHandler(gateway *Gateway) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		SendOr404(w, gateway.GetNodes())
	}
}

func RegisterNetworkHandlers(mux *http.ServeMux, gateway *Gateway) {
	mux.HandleFunc("/load", connectionHandler(gateway))
	mux.HandleFunc("/load", connectionsHandler(gateway))
}
