# Builds and runs the micro services
# Set an output prefix, which is the local directory if not specified
PREFIX?=$(shell pwd)
BUILDTAGS=

.PHONY: all fmt vet lint build test static run
.DEFAULT: default

all: build fmt lint vet test run


build:
	@echo "+ $@"
	@go build -tags "$(BUILDTAGS) cgo" $(shell go list ./... | grep -v main)
	@go build -tags "$(BUILDTAGS) cgo" $(shell go list ./... | grep -v client)
	@go build -tags "$(BUILDTAGS) cgo" $(shell go list ./... | grep -v server)

static:
	@echo "+ $@"
	CGO_ENABLED=1 go build -tags "$(BUILDTAGS) cgo static_build" -ldflags "-w -extldflags -static" -o main .

fmt:
	@echo "+ $@"
	@gofmt -s -l . | grep -v server
	@gofmt -s -l . | grep -v client

lint:
	@echo "+ $@"
	@golint ./... | grep -v server | tee /dev/stderr
	@golint ./... | grep -v client | tee /dev/stderr

test:
	@echo "+ $@"
	@go test -v -tags "$(BUILDTAGS) cgo" $(shell go list ./... | grep -v server)
	@go test -v -tags "$(BUILDTAGS) cgo" $(shell go list ./... | grep -v client)
	
vet:
	@echo "+ $@"
	@go vet $(shell go list ./... | grep -v server)
	@go vet $(shell go list ./... | grep -v client)

clean:
	@echo "+ $@"
	@rm -rf puebe

install:
	@echo "+ $@"
	@go install ./main
	
run: 
	@echo "+ $@"
	go run ./main
