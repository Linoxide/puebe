# Builds and runs the micro services go generate && go build
#$ bin/%: CGO_ENABLED=0 go build -ldflags '-s -w' -tags netgo -v -o $@ ./cmd/$*
# Set an output prefix, which is the local directory if not specified
PREFIX?=$(shell pwd)
BUILDTAGS=

.PHONY: all fmt vet lint build test install run
.DEFAULT: default

all: build fmt lint vet test install run


build:
	@echo "+ $@"
	@go build -tags "$(BUILDTAGS) cgo"  ./...
	@sh ./gui/static/gui.sh
	

fmt:
	@echo "+ $@"
	@go fmt  ./... 

lint:
	@echo "+ $@"
	@golint ./...

test:
	@echo "+ $@"
	@go test -v -tags "$(BUILDTAGS) cgo" ./... 
	
vet:
	@echo "+ $@"
	@go vet ./... 

clean:
	@echo "+ $@"
	@rm -rf ./cmd/puebe/puebe

install:
	@echo "+ $@"
	@go install ./...
	
run: 
	@echo "+ $@"
	@sh ./run.sh
