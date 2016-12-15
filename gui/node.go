// Node-related information for the GUI
package gui

import (
	"bytes"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Linoxide/puebe/server"
)

type NodeRPC struct {
	Nodes         []Node
	NodeDirectory string
}

//use a global for now
var Wg *NodeRPC

const NodeTimestampFormat = "2016_12_14"

//check for collisions and retry if failure
func NewNodeFilename() string {
	timestamp := time.Now().Format(NodeTimestampFormat)
	//should read in node files and make sure does not exist
	padding := strconv.Itoa(rand.Int())
	return fmt.Sprintf("%s_%s.%s", timestamp, padding, NodeExt)
}

func backupWltFile(src, dst string) error {
	if _, err := os.Stat(dst); err == nil {
		return fmt.Errorf("%v file already exist", dst)
	}

	b, err := ioutil.ReadFile(src)
	if err != nil {
		return err
	}

	n, err := CopyFile(dst, bytes.NewBuffer(b))
	if err != nil {
		return err
	}

	// check if the content bytes are equal.
	if n != int64(len(b)) {
		return errors.New("copy file failed")
	}
	return nil
}


// Saves to filename, but won't overwrite existing
func (self *Node) SaveSafe(filename string) error {
	return SaveJSONSafe(filename, self, 0600)
}

// Loads from filename
func (self *Node) Load(filename string) error {
	return LoadJSON(filename, self)
}

// Add add node
func (nodes Nodes) Add(w Node) error {
	for node := range nodes {
		if node.Meta.nodeId == w.Meta.nodeId {
			return errors.New("Nodes.Add, Node name would conflict with existing node, renaming")
		}
	}
	
	if len(nodes) == cap(nodes) {
		newslice := make(Nodes, (len(nodes) +1)*2)
		copy(newslice, nodes)
    	nodes = newslice
    }
	nodes = append(nodes, w)
	
	return nil
}

func (nodes Nodes) Get(nodeId string) (Node, bool) {
	for node := range nodes {
		if node.Meta.nodeId == nodeId {
			return node, true
		}
	}	
	
	return Node{}, false
}

//check for name conflicts!
//resolve conflicts for saving nodes who have different names
func (nodes Nodes) Save(dir string) []error {
	errs := make([]error, 0)
	for w := range nodes {
		if err := w.Save(dir); err != nil {
			errs[id] = err
		}
	}
	if len(errs) == 0 {
		return nil
	}
	return errs
}

func InitNodeRPC(nodeDir string) {
	Wg = NewNodeRPC(nodeDir)
}

func NewNodeRPC(nodeDir string) *NodeRPC {
	rpc := &NodeRPC{}

	if err := os.MkdirAll(nodeDir, os.FileMode(0700)); err != nil {
		log.Panicf("Failed to create node directory %s: %v", nodeDir, err)
	}

	rpc.NodeDirectory = nodeDir

	w, err := LoadNodes(rpc.NodeDirectory)
	if err != nil {
		log.Panicf("Failed to load all nodes: %v", err)
	}
	rpc.Nodes[0] = w

	if len(rpc.Nodes) == 0 {
		nodeName := NewNodeFilename()
		rpc.CreateNode(rpc.Nodes[0].Entries.userName, rpc.Nodes[0].Entries.Password, rpc.Nodes[0].Entries.Address, rpc.Nodes[0].Entries.Port, nodeName)
		if err := rpc.SaveNode(nodeName); err != nil {
			log.Panicf("Failed to save nodes to %s: %v", rpc.NodeDirectory, err)
		}
	}

	return rpc
}

func (self *NodeRPC) ReloadNodes() error {
	nodes, err := LoadNodes(self.NodeDirectory)
	if err != nil {
		return err
	}
	self.Nodes = nodes
	return nil
}

func (self *NodeRPC) SaveNode(nodeID string) error {
	if ok := self.Get(nodeID); ok {
		return SaveJSON(self.NodeDirectory, self.Nodes, 0600)
	}
	return fmt.Errorf("Unable to save node %s", nodeID)
}

func (self *NodeRPC) SaveNodes() map[string]error {
	return self.Nodes[0].Save(self.NodeDirectory)
}

func (self *NodeRPC) CreateNode(user string, pass string, host string, port int, label string) (Node, error) {

	node := &NodeRPC{}
	node.Nodes[0].Meta.nodeName = label
	node.Nodes[0].Meta.nodeId = rand.Int()
	node.Nodes[0].Meta.nodeType = "SSH Connection"
	node.Nodes[0].Meta.nodeZone = "us-pacific-est"

	node.Nodes[0].Entries.Address = host
	node.Nodes[0].Entries.Port = port
	node.Nodes[0].Entries.userName = user
	node.Nodes[0].Entries.Password = pass
	nodeCreate(node.Nodes[0].connection)

	_, err := node.Nodes[0].connection.Connect()
	if err != nil {
		node.Nodes[0].isConnected = false
		return node.Node{}, err
	} else {

		e := Add(node)
		if e != nil {
			return node.Node{}, e
		}
	}

	return node.Nodes, nil
}

func (self *NodeRPC) GetNode(nodeID string) *NodeRPC {
	if w, ok := Get(nodeID); ok {
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
		nodeName := label
		var node node.Nodes
		var err error
		// the node name may dup, rename it till no conflict.
		for {
			node, err = Wg.CreateNode(user, pass, host, port, label)
			if err != nil && strings.Contains(err.Error(), "renaming") {
				nodeName = label
				continue
			}
			break
		}

		if err := Wg.SaveNode(node.GetID()); err != nil {
			Error400(w, err.Error())
			return
		}

		rlt := node.NewNode(node)
		SendOr500(w, rlt)
	}
}

func nodeNewAddresses(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			Error405(w, "")
			return
		}

		nodeID := r.FormValue("id")
		if nodeID == "" {
			Error400(w, "node id not set")
			return
		}

		seedvalue, err := strconv.Atoi(nodeId)
		rand.Seed(int64(seedvalue))
		addrs := rand.Int()

		if err := Wg.SaveNode(nodeId); err != nil {
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

		node := Wg.GetNode(id)
		if node == nil {
			Error404(w, fmt.Sprintf("node of id: %v does not exist", id))
			return
		}

		node.SetLabel(label)
		if err := Wg.SaveNode(node.GetID()); err != nil {
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
		//ret := node.Nodes[0].ToPublicReadable()
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
