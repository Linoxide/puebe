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
* [Node JS](https://nodejs.org/en/)
* [NPM](https://www.npmjs.com/)
* [Gulp](https://www.npmjs.com/package/gulp)
* [n](https://www.npmjs.com/package/n)

Run the following commands as root user.
```
$ dnf install nodejs npm
$ npm install -g n
$ n stable
$ npm rm --global gulp
$ npm install --global gulp-cli
```
## Installation

Clone Git repo:

```
$ git clone git@github.com:Linoxide/puebe.git
$ cd puebe
$ go get github.com/go-sql-driver/mysql
$ go get github.com/scottkiss/gomagic/dbmagic
$ go get github.com/op/go-logging

```

### Build

```
$ make build
```

To make electron release
```
$ cd electron
$ ./build.sh
```

### Run
```
$ make run
```

## Licence

To the extent possible under the law, check out the [Linoxide](https://github.com/linoxide) licence for rights to this work.
