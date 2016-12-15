System.register(['angular2/core', 'angular2/router', 'angular2/http', 'rxjs/add/operator/map', 'rxjs/add/operator/catch', './ng2-qrcode.js'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var core_1, router_1, http_1, http_2, ng2_qrcode_ts_1;
    var PagerService, loadNodeComponent;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (router_1_1) {
                router_1 = router_1_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
                http_2 = http_1_1;
            },
            function (_1) {},
            function (_2) {},
            function (ng2_qrcode_ts_1_1) {
                ng2_qrcode_ts_1 = ng2_qrcode_ts_1_1;
            }],
        execute: function() {
            class PagerService {
                getPager(totalItems, currentPage = 1, pageSize = 5) {
                    // calculate total pages
                    var totalPages = Math.ceil(totalItems / pageSize);
                    var startPage, endPage;
                    if (totalPages <= 10) {
                        // less than 10 total pages so show all
                        startPage = 1;
                        endPage = totalPages;
                    }
                    else {
                        // more than 10 total pages so calculate start and end pages
                        if (currentPage <= 6) {
                            startPage = 1;
                            endPage = 10;
                        }
                        else if (currentPage + 4 >= totalPages) {
                            startPage = totalPages - 9;
                            endPage = totalPages;
                        }
                        else {
                            startPage = currentPage - 5;
                            endPage = currentPage + 4;
                        }
                    }
                    // calculate start and end item indexes
                    var startIndex = (currentPage - 1) * pageSize;
                    var endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);
                    // create an array of pages to ng-repeat in the pager control
                    var pages = _.range(startPage, endPage + 1);
                    // return object with all pager properties required by the view
                    return {
                        totalItems: totalItems,
                        currentPage: currentPage,
                        pageSize: pageSize,
                        totalPages: totalPages,
                        startPage: startPage,
                        endPage: endPage,
                        startIndex: startIndex,
                        endIndex: endIndex,
                        pages: pages
                    };
                }
            }
            exports_1("PagerService", PagerService);
            let loadNodeComponent = class loadNodeComponent {
                //Constructor method for load HTTP object
                constructor(http, pagerService) {
                    this.http = http;
                    this.pagerService = pagerService;
                    // pager object
                    this.historyPager = {};
                    this.blockPager = {};
                }
                //Init function for load default value
                ngOnInit() {
                    this.loadConnections();
                    this.loadDefaultConnections();
                    this.loadNode();
                    this.selectedNode = {};
                    this.isValidAddress = false;
                    //Set interval function for loading nodes every 15 seconds
                    setInterval(() => {
                        this.loadConnections();
                        this.loadNode();
                        //console.log("Refreshing connections");
                    }, 30000);
                    //Enable button by default
                    this.selectedMenu = "Nodes";
                    this.filterAddressVal = '';
                    this.SearchKey = '';
                    if (localStorage.getItem('historyUsers') != null) {
                        this.nodes = JSON.parse(localStorage.getItem('historyUsers'));
                    }
                    else {
                        localStorage.setItem('historyUsers', JSON.stringify([]));
                        this.nodes = JSON.parse(localStorage.getItem('historyUsers'));
                    }
                }
                //Search button for searching through the nodes
                search(nodeName, nodeId, nodeType) {
                    if (!nodeId) {
                        alert("Please select from Node ID");
                        return false;
                    }
                    if (!nodeName) {
                        alert("Please enter node label");
                        return false;
                    }
                    if (!nodeType) {
                        alert("Please enter node type");
                        return false;
                    }
                    this.readyDisable = true;
                }
                //Load node function
                loadNode() {
                    this.http.post('/nodes', '')
                        .map((res) => res.json())
                        .subscribe(data => {
                        if (this.nodes == null || this.nodes.length == 0) {
                            _.each(data, (o) => {
                                o.showChild = false;
                            });
                            this.nodes = data;
                            if (this.nodes.length > 0) {
                                this.onSelectNode(this.nodes[0].meta.nodeId);
                            }
                        }
                        else {
                            data.map((w) => {
                                var old = _.find(this.nodes, (o) => {
                                    o.meta.nodeType == w.meta.nodeType;
                                    o.meta.nodeName == w.meta.nodeName;
                                    o.meta.nodeZone == w.meta.nodeZone;
                                    o.meta.nodeId == w.meta.nodeId;
                                    return o.meta.nodeId;
                                });
                                if (old) {
                                    _.extend(old, w);
                                }
                                else {
                                    w.showChild = false;
                                    this.nodes.push(w);
                                }
                            });
                        }
                        //console.log("this.nodes", this.nodes);
                        //Load data for each nodeBalance for each node
                        var inc;
                        for (var item in data) {
                            var name = data[inc].meta.nodeName;
                            var id = data[inc].meta.nodeId;
                            var type = data[inc].meta.nodeType;
                            var zone = data[inc].meta.nodezone;
                            this.loadNodeItem(name, id, type, zone, inc);
                            inc;
                        }
                    }, err => console.log("Error on loading node instance: " + err), () => {
                        //console.log('Node load successful')
                    });
                }
                checkValidAddress(address) {
                    if (address === "")
                        this.isValidAddress = false;
                    else {
                        var headers = new http_2.Headers();
                        headers.append('Content-Type', 'application/x-www-form-urlencoded');
                        this.http.get('/node?addrs=' + address, { headers: headers })
                            .map((res) => res.json())
                            .subscribe(
                        //Response from API
                        response => {
                            this.isValidAddress = true;
                        }, err => {
                            //console.log("Error on ssh address: " + err)
                            this.isValidAddress = false;
                        }, () => {
                        });
                    }
                }
                loadNodeItem(name, id, type, zone, inc) {
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    this.http.get('/node/?id=' + id, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(
                    //Response from API
                    response => {
                        //console.log('load done: ' + inc, response);
                        this.nodes[inc].connection = response.confirmed.connection;
                    }, err => console.log("Error on adding new node " + err), () => {
                        //console.log('New node added.')
                    });
                    //get connection addresses
                    this.nodes[inc].entries.map((entry) => {
                        this.http.get('/node?address=' + entry.address, { headers: headers })
                            .map((res) => res.json())
                            .subscribe(
                        //Response from API
                        response => {
                            //console.log('Address:' + entry.address, response);
                            entry.connection = response.confirmed.connection;
                        }, err => console.log("Error on loading connection address: " + err), () => {
                            //console.log('connection address loaded')
                        });
                    });
                }
                loadConnections() {
                    this.http.post('/node/connections', '')
                        .map((res) => res.json())
                        .subscribe(data => {
                        //console.log("connections", data);
                        this.connections = data.connections;
                    }, err => console.log("Error loading connection node: " + err), () => {
                        //console.log('Connection node loaded')
                    });
                }
                loadDefaultConnections() {
                    this.http.post('/node/connections', '')
                        .map((res) => res.json())
                        .subscribe(data => {
                        //console.log("default connections", data);
                        this.defaultConnections = data;
                    }, err => console.log("Error on loading default connection: " + err), () => {
                        //console.log('Default connections loaded')
                    });
                }
                //Load progress function for Puebe
                loadProgress() {
                    //Post method executed
                    this.http.post('/node/progress', '')
                        .map((res) => res.json())
                        .subscribe(
                    //Response from API
                    response => { this.progress = (parseInt(response.current, 10) + 1) / parseInt(response.highest, 10) * 100; }, err => console.log("Error on loading progress: " + err), () => {
                        //console.log('Progress load done:' + this.progress)
                    });
                }
                toggleShowChild(node) {
                    node.showChild = !node.showChild;
                }
                getDateTimeString(ts) {
                    return moment.unix(ts).format("YYYY-MM-DD HH:mm");
                }
                getElapsedTime(ts) {
                    return moment().unix() - ts;
                }
                //Show QR code function for show QR popup
                showQR(node) {
                    this.QrAddress = node.meta[0].nodeId;
                    this.QrIsVisible = true;
                }
                //Hide QR code function for hide QR popup
                hideQrPopup() {
                    this.QrIsVisible = false;
                }
                //Show node function for view New node popup
                showNewNodeDialog() {
                    this.NewNodeIsVisible = true;
                }
                //Hide node function for hide New node popup
                hideNodePopup() {
                    this.NewNodeIsVisible = false;
                }
                showNewDefaultConnectionDialog() {
                    this.NewDefaultConnectionIsVisible = true;
                }
                hideNewDefaultConnectionDialog() {
                    this.NewDefaultConnectionIsVisible = false;
                }
                showEditDefaultConnectionDialog(item) {
                    this.oldConnection = item;
                    this.EditDefaultConnectionIsVisible = true;
                }
                hideEditDefaultConnectionDialog() {
                    this.EditDefaultConnectionIsVisible = false;
                }
                createDefaultConnection(connectionValue) {
                    //console.log("new value", connectionValue);
                    this.defaultConnections.push(connectionValue);
                    this.NewDefaultConnectionIsVisible = false;
                }
                updateDefaultConnection(connectionValue) {
                    //console.log("old/new value", this.oldConnection, connectionValue);
                    var idx = this.defaultConnections.indexOf(this.oldConnection);
                    this.defaultConnections.splice(idx, 1);
                    this.defaultConnections.splice(idx, 0, connectionValue);
                    this.EditDefaultConnectionIsVisible = false;
                }
                deleteDefaultConnection(item) {
                    var idx = this.defaultConnections.indexOf(item);
                    this.defaultConnections.splice(idx, 1);
                }
                //Add new node function for generate new node in Puebe
                createNewNode(nodename, address, port, user, pass) {
                    var node = {};
                    node.entries.address = address;
                    node.entries.Port = port;
                    node.entries.Password = pass;
                    node.entries.userName = user;
                    node.meta.nodeName = nodename;
                    var stringConvert = JSON.stringify(node);
                    //check if label is duplicated
                    var old = _.find(this.nodes, function (o) {
                        return (o.meta.nodeName == nodename);
                    });
                    if (old) {
                        alert("This node label is used already");
                        return;
                    }
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    this.http.post('/node/create', stringConvert, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(response => {
                        console.log(response);
                        //Hide new node popup
                        this.NewNodeIsVisible = false;
                        alert("New node created successfully");
                        //Load node for refresh list
                        this.loadNode();
                    }, err => {
                        console.log(err);
                    }, () => { });
                }
                //Edit existing node function
                editNode(node) {
                    this.EditNodeIsVisible = true;
                    this.nodeId = node.meta.nodeName;
                }
                addNewAddress(node) {
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    //Post method executed
                    var stringConvert = 'id=' + node.meta.address + node.meta.Port;
                    this.http.post('/node/newAddress', stringConvert, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(response => {
                        console.log(response);
                        alert("New address created successfully");
                        //Load node for refresh list
                        this.loadNode();
                    }, err => {
                        console.log(err);
                    }, () => { });
                }
                //Hide edit node function
                hideEditNodePopup() {
                    this.EditNodeIsVisible = false;
                }
                //Update node function for update node label
                updateNode(nodeId, nodeName) {
                    console.log("update node", nodeId, nodeName);
                    //check if label is duplicated
                    var old = _.find(this.nodes, function (o) {
                        return (o.meta.label == nodeName);
                    });
                    if (old) {
                        alert("This node label is used already");
                        return;
                    }
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    var stringConvert = 'label=' + nodeName + 'id=' + nodeId;
                    //Post method executed
                    this.http.post('/node/update', stringConvert, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(response => {
                        //Hide new node popup
                        this.EditNodeIsVisible = false;
                        alert("Node updated successfully");
                        //Load node for refresh list
                        this.loadNode();
                    }, err => console.log("Error on update node: " + JSON.stringify(err)), () => {
                        //console.log('Update node done')
                    });
                }
                sortHistory(key) {
                    if (this.sortDir[key] == 0)
                        this.sortDir[key] = 1;
                    else
                        this.sortDir[key] = this.sortDir[key] * (-1);
                    this.historyTable = _.sortBy(this.historyTable, function (o) {
                        return o[key];
                    });
                }
                filterHistory(address) {
                    console.log("filterHistory", address);
                    this.filterAddressVal = address;
                }
                setHistoryPage(page) {
                    this.historyPager.totalPages = this.historyTable.length;
                    if (page < 1 || page > this.historyPager.totalPages) {
                        return;
                    }
                    // get pager object from service
                    this.historyPager = this.pagerService.getPager(this.historyTable.length, page);
                    console.log("this.historyPager", this.historyPager);
                    // get current page of items
                    this.historyPagedItems = this.historyTable.slice(this.historyPager.startIndex, this.historyPager.endIndex + 1);
                    //console.log('this.pagedItems', this.historyTable, this.pagedItems);
                }
                searchHistory(searchKey) {
                    console.log(searchKey);
                }
                onSelectNode(val) {
                    console.log("onSelectNode", val);
                    //this.selectedNode = val;
                    this.nodeId = val;
                    this.selectedNode = _.find(this.nodes, function (o) {
                        return o.meta.nodeId === val;
                    });
                }
            };
            loadNodeComponent = __decorate([
                core_1.Component({
                    selector: 'load-node',
                    directives: [router_1.ROUTER_DIRECTIVES, ng2_qrcode_ts_1.QRCodeComponent],
                    providers: [PagerService],
                    templateUrl: 'app/templates/node.html'
                }), 
                __metadata('design:paramtypes', [http_1.Http, PagerService])
            ], loadNodeComponent);
            exports_1("loadNodeComponent", loadNodeComponent);
        }
    }
});

//# sourceMappingURL=app.loadNode.js.map
