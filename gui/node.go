// Node-related information for the GUI
package gui

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"

	"github.com/Linoxide/puebe/server"
)

type NodeRPC struct {
	Nodes         Node
	NodeDirectory string
}

//use a global for now
var Wg *NodeRPC

func InitNodeRPC(nodeDir string) {
	Wg = NewNodeRPC(nodeDir)
}

func NewNodeRPC(nodeDir string) *NodeRPC {
	rpc := &NodeRPC{}

	if err := os.MkdirAll(nodeDir, os.FileMode(0700)); err != nil {
		log.Panicf("Failed to create node directory %s: %v", nodeDir, err)
	}

	rpc.NodeDirectory = nodeDir

	w, err := node.LoadNodes(rpc.NodeDirectory)
	if err != nil {
		log.Panicf("Failed to load all nodes: %v", err)
	}
	rpc.Nodes = w

	if len(rpc.Nodes) == 0 {
		wltName := node.NewNodeFilename()
		rpc.CreateNode("", wltName, "")

		if err := rpc.SaveNode(wltName); err != nil {
			log.Panicf("Failed to save nodes to %s: %v", rpc.NodeDirectory, err)
		}
	}

	return rpc
}

func (self *NodeRPC) ReloadNodes() error {
	nodes, err := node.LoadNodes(self.NodeDirectory)
	if err != nil {
		return err
	}
	self.Nodes = nodes
	return nil
}

func (self *NodeRPC) SaveNode(nodeID string) error {
	if w, ok := self.Nodes.Get(nodeID); ok {
		return w.Save(self.NodeDirectory)
	}
	return fmt.Errorf("Unknown node %s", nodeID)
}

func (self *NodeRPC) SaveNodes() map[string]error {
	return self.Nodes.Save(self.NodeDirectory)
}

func (self *NodeRPC) CreateNode(user string, pass string, host string, port int, label string) (node.Node, error) {

	node := &NodeRPC{}
	node.Nodes.Meta.nodeName = label
	node.Nodes.Meta.nodeId = rand.Int()
	node.Nodes.Meta.nodeType = "SSH Connection"
	node.Nodes.Meta.nodeZone = "us-pacific-est"

	node.Nodes.Entries.Address = host
	node.Nodes.Entries.Port = port
	node.Nodes.Entries.userName = user
	node.Nodes.Entries.Password = pass

	_, err := node.Nodes.connection.Connect()
	if err != nil {
		node.Nodes.isConnected = false
		return node.Node{}, err
	} else {

		e := self.Nodes.Add(node)
		if e != nil {
			return node.Node{}, e
		}
	}

	return node, nil
}

func (self *NodeRPC) GetNodesReadable() []*node.ReadableNode {
	return self.Nodes.ToReadable()
}

func (self *NodeRPC) GetNodeReadable(nodeID string) *node.ReadableNode {
	if w, ok := self.Nodes.Get(nodeID); ok {
		return node.NewReadableNode(w)
	}
	return nil
}

func (self *NodeRPC) GetNode(nodeID string) *node.Node {
	if w, ok := self.Nodes.Get(nodeID); ok {
		return &w
	}
	return nil
}

// Create a node Name is set by creation date
func nodeCreate(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Info("API request made to Add a node")
		user := r.FormValue("userName")
		pass := r.FormValue("Password")
		host := r.FormValue("Address")
		port := r.FormValue("Port")
		label := r.FormValue("nodeName")
		wltName := node.NewNodeFilename()
		var wlt node.Node
		var err error
		// the node name may dup, rename it till no conflict.
		for {
			wlt, err = Wg.CreateNode(user, pass, host, port, label)
			if err != nil && strings.Contains(err.Error(), "renaming") {
				wltName = node.NewNodeFilename()
				continue
			}
			break
		}

		if err := Wg.SaveNode(wlt.GetID()); err != nil {
			Error400(w, err.Error())
			return
		}

		rlt := node.NewReadableNode(wlt)
		SendOr500(w, rlt)
	}
}

func nodeNewAddresses(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			Error405(w, "")
			return
		}

		wltID := r.FormValue("id")
		if wltID == "" {
			Error400(w, "node id not set")
			return
		}

		Rand.seed(wltId)
		addrs := Rand.Int()

		if err := Wg.SaveNode(wltID); err != nil {
			Error500(w, "")
			return
		}

		var rlt = struct {
			Address string `json:"address"`
		}{
			addrs,
		}
		SendOr404(w, rlt)
		return
	}
}

// Update node label
func nodeUpdateHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Update node
		id := r.FormValue("id")
		if id == "" {
			Error400(w, "node id is empty")
			return
		}

		label := r.FormValue("label")
		if label == "" {
			Error400(w, "label is empty")
			return
		}

		wlt := Wg.GetNode(id)
		if wlt == nil {
			Error404(w, fmt.Sprintf("node of id: %v does not exist", id))
			return
		}

		wlt.SetLabel(label)
		if err := Wg.SaveNode(wlt.GetID()); err != nil {
			m := "Failed to save node: %v"
			logger.Critical(m, "Failed to update label of node %v", id)
			Error500(w, "Update node failed")
			return
		}

		SendOr404(w, "success")
	}
}

// Returns a node by ID if GET.  Creates or updates a node if POST.
func nodeGet(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			ret := Wg.GetNode(r.FormValue("id"))
			SendOr404(w, ret)
		}
	}
}

// Returns all loaded nodes
func nodesHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		//ret := node.Nodes.ToPublicReadable()
		ret := Wg.GetNodesReadable()
		SendOr404(w, ret)
	}
}

// Saves all loaded nodes
func nodesSaveHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		errs := Wg.SaveNodes() // (map[string]error)
		if len(errs) != 0 {
			err := ""
			for id, e := range errs {
				err += id + ": " + e.Error()
			}
			Error500(w, err)
		}
	}
}

// Loads/unloads nodes from the node directory
func nodesReloadHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := Wg.ReloadNodes()
		if err != nil {
			Error500(w, err.(error).Error())
		}
	}
}

func RegisterNodeHandlers(mux *http.ServeMux, gateway *server.SSHClient) {
	// Returns node info
	// GET Arguments:
	//      id - Node ID.

	//  Gets a node.  Will be assigned name if present.
	mux.HandleFunc("/node", nodeGet(gateway))

	// POST/GET Arguments:
	//		seed [optional]
	//create new node
	mux.HandleFunc("/node/create", nodeCreate(gateway))

	mux.HandleFunc("/node/newAddress", nodeNewAddresses(gateway))

	// Returns all loaded nodes
	mux.HandleFunc("/node", nodesHandler(gateway))
	// Saves all nodes to disk. Returns nothing if it works. Otherwise returns
	// 500 status with error message.

	mux.HandleFunc("/node/save", nodesSaveHandler(gateway))
	// Rescans the node directory and loads/unloads nodes based on which
	// files are present. Returns nothing if it works. Otherwise returns
	// 500 status with error message.
	mux.HandleFunc("/node/reload", nodesReloadHandler(gateway))

}
