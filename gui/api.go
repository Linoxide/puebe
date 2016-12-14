// Api-related information for the GUI
package gui

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/Linoxide/puebe/server"
)

//Saves user login information together with connection data for
//nodes
const NodeExt = "nde"

type Nodes map[string]*Node

type Node struct {
	Meta        MetaData          `json:"meta"`
	Entries     []KeyEntry        `json:"entries"`
	connection  *server.SSHClient `json:"connection`
	isConnected bool
}

type MetaData struct {
	nodeName string `json:"nodeName"`
	nodeType string `json:"nodeType"`
	nodeId   int    `json:"nodeId"`
	nodeZone string `json:"nodeZone"`
}

type KeyEntry struct {
	Address  string `json:"address"`
	Port     int    `json:"Port"`
	userName string `json:"userName"`
	Password string `json:"Password"`
}

func LoadReadableNode(filename string) (Node, error) {
	w := Node{}
	err := LoadJSON(filename, &w)
	return w, err
}

// Saves to filename
func (self *Node) Save(filename string) error {
	// logger.Info("Saving readable node to %s with filename %s", filename,
	// 	self.Meta["filename"])
	return SaveJSON(filename, self, 0600)
}

// LoadNodes Loads all nodes contained in node dir.  If any regular file in node
// dir fails to load, loading is aborted and error returned.  Only files with
// extension NodeExt are considered. If encounter old node file, then backup
// the node file into dir/backup/
func LoadNodes(dir string) (Nodes, error) {
	//
	entries, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	// create backup dir if not exist
	bkpath := dir + "/backup/"
	if _, err := os.Stat(bkpath); os.IsNotExist(err) {
		// create the backup dir
		logger.Critical("create node backup dir, %v", bkpath)
		if err := os.Mkdir(bkpath, 0777); err != nil {
			return nil, err
		}
	}

	//
	nodes := make(Nodes, 0)
	for i, e := range entries {
		if e.Mode().IsRegular() {
			name := e.Name()
			if !strings.HasSuffix(name, NodeExt) {
				continue
			}
			fullpath := filepath.Join(dir, name)
			w := &Node{}
			err := w.Load(fullpath)
			if err != nil {
				return nil, err
			}
			err = w.Save(name)
			if err != nil {
				return nil, err
			}
			logger.Info("Loaded node from %s", fullpath)
			nodes[name] = w
		}
	}
	return nodes, nil
}

// Generates hash for user login data
// GET/POST information for new ssh connections in nodes.
//
func apiCreateAddressHandler(gateway *server.SSHClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		seed := r.FormValue("id")
		if seed == "" {
			Error400(w, "Empty id")
			return
		}

		node := new(Node)
		seedvalue, err := strconv.Atoi(seed)
		rand.Seed(int64(seedvalue))
		node.Meta.nodeId = rand.Int()
		SendOr404(w, node)
	}
}

func RegisterApiHandlers(mux *http.ServeMux, gateway *server.SSHClient) {
	//  Generates node puebe addresses
	// GET/POST
	//	seed - string - seed hash
	mux.HandleFunc("/node/create-address", apiCreateAddressHandler(gateway))
}

/**
 * Functions for handling files within the web application
 */

func UserHome() string {
	// os/user relies on cgo which is disabled when cross compiling
	// use fallbacks for various OSes instead
	// usr, err := user.Current()
	// if err == nil {
	// 	return usr.HomeDir
	// }
	if runtime.GOOS == "windows" {
		home := os.Getenv("HOMEDRIVE") + os.Getenv("HOMEPATH")
		if home == "" {
			home = os.Getenv("USERPROFILE")
		}
		return home
	}

	return os.Getenv("HOME")
}

// If dir is "", uses the default directory of ~/.puebe.  The path to dir
// is created, and the dir used is returned
func InitDataDir(dir string) string {
	DataDir := dir
	if dir == "" {
		logger.Error("data directory is nil")
	}

	home := UserHome()
	if home == "" {
		logger.Warning("Failed to get home directory")
		DataDir = filepath.Join("./", dir)
	} else {
		DataDir = filepath.Join(home, dir)
	}

	if err := os.MkdirAll(DataDir, os.FileMode(0700)); err != nil {
		logger.Error("Failed to create directory %s: %v", DataDir, err)
	}
	return DataDir
}

func LoadJSON(filename string, thing interface{}) error {
	file, err := ioutil.ReadFile(filename)
	if err != nil {
		return err
	}
	return json.Unmarshal(file, thing)
}

func SaveJSON(filename string, thing interface{}, mode os.FileMode) error {
	data, err := json.MarshalIndent(thing, "", "    ")
	if err != nil {
		return err
	}
	err = SaveBinary(filename, data, mode)
	return err
}

// Saves json to disk, but refuses if file already exists
func SaveJSONSafe(filename string, thing interface{}, mode os.FileMode) error {
	b, err := json.MarshalIndent(thing, "", "    ")
	if err != nil {
		return err
	}
	flags := os.O_WRONLY | os.O_CREATE | os.O_EXCL
	f, err := os.OpenFile(filename, flags, mode)
	if err != nil {
		return err
	}
	defer f.Close()
	n, err := f.Write(b)
	if n != len(b) && err != nil {
		err = errors.New("Failed to save complete file")
	}
	if err != nil {
		os.Remove(filename)
	}
	return err
}

func SaveBinary(filename string, data []byte, mode os.FileMode) error {
	// Write the new file to a temporary
	tmpname := filename + ".tmp"
	if err := ioutil.WriteFile(tmpname, data, mode); err != nil {
		return err
	}
	// Backup the previous file, if there was one
	_, err := os.Stat(filename)
	if !os.IsNotExist(err) {
		if err := os.Rename(filename, filename+".bak"); err != nil {
			return err
		}
	}
	// Move the temporary to the new file
	return os.Rename(tmpname, filename)
}

//searches locations for a research directory and returns absolute path
func ResolveResourceDirectory(path string) string {
	workDir, err := filepath.Abs(filepath.Dir(os.Args[0]))
	if err != nil {
		log.Panic(err)
	}

	_, rt_filename, _, _ := runtime.Caller(1)
	rt_directory := filepath.Dir(rt_filename)

	path_abs, err := filepath.Abs(path)

	fmt.Printf("runtime.Caller= %s \n", rt_filename)
	fmt.Printf("Filepath Directory= %s \n", filepath.Dir(path))
	fmt.Printf("Filepath Absolute Directory= %s \n", path_abs)

	fmt.Printf("Working Directory= %s \n", workDir)
	fmt.Printf("Runtime Filename= %s \n", rt_filename)
	fmt.Printf("Runtime Directory= %s \n", rt_directory)

	dirs := []string{
		path_abs, //try direct path first
		filepath.Join(workDir, filepath.Dir(path)), //default
		filepath.Join(rt_directory, "./", filepath.Dir(path)),
		filepath.Join(rt_directory, "../", filepath.Dir(path)),
		filepath.Join(rt_directory, "../../", filepath.Dir(path)),
		filepath.Join(rt_directory, "../../../", filepath.Dir(path)),
	}

	//must be an absolute path
	//error and problem and crash if not absolute path
	for i, _ := range dirs {
		abs_path, _ := filepath.Abs(dirs[i])
		dirs[i] = abs_path
	}

	for _, dir := range dirs {
		if _, err := os.Stat(dir); !os.IsNotExist(err) {
			fmt.Printf("ResolveResourceDirectory: static resource dir= %s \n", dir)
			return dir
		}
	}
	log.Panic("GUI directory not found")
	return ""
}

func DetermineResourcePath(staticDir string, resourceDir string, devDir string) (string, error) {
	//check "dev" directory first
	appLoc := filepath.Join(staticDir, devDir)
	if !strings.HasPrefix(appLoc, "/") {
		// Prepend the binary's directory path if appLoc is relative
		dir, err := filepath.Abs(filepath.Dir(os.Args[0]))
		if err != nil {
			return "", err
		}

		appLoc = filepath.Join(dir, appLoc)
	}

	if _, err := os.Stat(appLoc); os.IsNotExist(err) {
		//check dist directory
		appLoc = filepath.Join(staticDir, resourceDir)
		if !strings.HasPrefix(appLoc, "/") {
			// Prepend the binary's directory path if appLoc is relative
			dir, err := filepath.Abs(filepath.Dir(os.Args[0]))
			if err != nil {
				return "", err
			}

			appLoc = filepath.Join(dir, appLoc)
		}

		if _, err := os.Stat(appLoc); os.IsNotExist(err) {
			return "", err
		}
	}

	return appLoc, nil
}

func CopyFile(dst string, src io.Reader) (n int64, err error) {
	// check the existence of dst file.
	if _, err := os.Stat(dst); err == nil {
		return 0, nil
	}
	err = nil

	out, err := os.Create(dst)
	if err != nil {
		return 0, err
	}
	defer func() {
		cerr := out.Close()
		if err == nil {
			err = cerr
		}
	}()

	n, err = io.Copy(out, src)
	return
}
