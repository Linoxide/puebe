// Api-related information for the GUI
package gui

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/Linoxide/puebe/server"
)


//Saves user login information together with connection data for
//nodes
type Node struct {
	Meta    MetaData `json:"meta"`
	Entries []KeyEntry `json:"entries"`
	connection *server.SSHClient `json:"connection`
	isConnected bool
}

type MetaData struct {
	nodeName string `json:"nodeName"`
	nodeType string `json:"nodeType"`
	nodeId	 int	`json:"nodeId"`
	nodeZone string `json:"nodeZone"`
}

type KeyEntry struct {
	Address 	string 	`json:"address"`
	Port  		int 	`json:"Port"`
	userName  	string 	`json:"userName"`
	Password 	string 	`json:"Password"`
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

		var node struct Node
		seedvalue, err := strconv.Atoi(seed)
		rand.Seed(seedvalue)
		node.Nodes.Meta.nodeId = rand.Int()
		
		ret := node
		SendOr404(w, ret)
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
// If dir is "", uses the default directory of ~/.puebe.  The path to dir
// is created, and the dir used is returned
func InitDataDir(dir string) string {
	//DataDir = dir
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
