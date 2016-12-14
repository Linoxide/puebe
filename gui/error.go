// HTTP Error Response Helpers
package gui

import (
	"encoding/json"
	"net/http"
	"strings"
)

func HttpError(w http.ResponseWriter, status int, default_message string,
	messages []string) {
	message := default_message
	if len(messages) != 0 {
		message = strings.Join(messages, "<br>")
	}
	http.Error(w, message, status)
}

func Error400(w http.ResponseWriter, messages ...string) {
	HttpError(w, http.StatusBadRequest, "Bad request", messages)
}

func Error404(w http.ResponseWriter, messages ...string) {
	HttpError(w, http.StatusNotFound, "Not found", messages)
}

func Error405(w http.ResponseWriter, messages ...string) {
	HttpError(w, http.StatusMethodNotAllowed, "Method not allowed", messages)
}

func Error501(w http.ResponseWriter, messages ...string) {
	HttpError(w, http.StatusNotImplemented, "Not implemented", messages)
}

func Error500(w http.ResponseWriter, messages ...string) {
	HttpError(w, http.StatusInternalServerError, "Internal server error",
		messages)
}

type JSONMessage interface{}

// Simple JSON response wrapper
type JSONResponse struct {
	Message string
}

// Returns a JSONResponse conforming to JSONMessage
func NewJSONResponse(message string) JSONMessage {
	return &JSONResponse{Message: message}
}

// Emits JSON to an http response
func SendJSON(w http.ResponseWriter, message JSONMessage) error {
	out, err := json.MarshalIndent(message, "", "    ")
	if err == nil {
		_, err := w.Write(out)
		if err != nil {
			return err
		}
	}
	return err
}

// Sends an interface as JSON if its not nil (404) or fails (500)
func SendOr404(w http.ResponseWriter, m interface{}) {
	if m == nil {
		Error404(w)
	} else if SendJSON(w, m) != nil {
		Error500(w)
	}
}

// Sends an interface as JSON if its not nil (500) or fails (500)
func SendOr500(w http.ResponseWriter, m interface{}) {
	if m == nil {
		Error500(w)
	} else if SendJSON(w, m) != nil {
		Error500(w)
	}
}
