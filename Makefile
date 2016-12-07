# Builds and runs the micro services
# Set an output prefix, which is the local directory if not specified
PREFIX?=$(shell pwd)
BUILDTAGS=

.PHONY: all fmt vet lint build test static run
.DEFAULT: default

all: build fmt lint vet test run



build:
	./build.sh

static:
	@echo "+ $@"
	CGO_ENABLED=1 go build -tags "$(BUILDTAGS) cgo static_build" -ldflags "-w -extldflags -static" -o puebe .

fmt:
	@echo "+ $@"
	@gofmt -s -l . | grep -v cmd | tee /dev/stderr

lint:
	@echo "+ $@"
	@golint ./... | grep -v vendor | tee /dev/stderr

vet:
	@echo "+ $@"
	@go vet $(shell go list ./... | grep -v cmd)

test: fmt vet
	@echo "+ $@"
	@go test -v -tags "$(BUILDTAGS) cgo" $(shell go list ./... | grep -v cmd)
