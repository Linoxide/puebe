# puebe

puebe is an ssh client written in Go. It supports

* ssh command execution on multiple servers.
* ssh tunnelling with local port forwarding.
* ssh authentication using private keys or password.
* ssh session timeout support.
* ssh file upload support.


## Pre-requisites

Install the following packages:

* [Go version 1.7](https://github.com/golang/go/releases/tag/go1.7.3)

## Installation

Clone Git repo:

```
$ git clone git@github.com:Linoxide/puebe.git
$ cd puebe
$ go get github.com/go-sql-driver/mysql
$ go get github.com/scottkiss/gomagic/dbmagic
$ go get github.com/toqueteos/webbrowser
$ go get github.com/op/go-logging
```

### Build && Run application

```
$ make
```

To make electron release
```
$ cd electron
$ ./electron/build.sh
```

### Run
```
$ make run
```

## Licence

To the extent possible under the law, check out the [Linoxide](https://github.com/linoxide) licence for rights to this work.
