System.register(['angular2/core', 'angular2/router', 'angular2/http', 'rxjs/add/operator/map', 'rxjs/add/operator/catch'], function(exports_1, context_1) {
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
    var core_1, router_1, http_1, http_2;
    var PagerService, loadNodeComponent, DisplayModeEnum;
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
            function (_2) {}],
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
                    this.displayModeEnum = DisplayModeEnum;
                    this.selectedBlock = {};
                    this.selectedBlockTransaction = {};
                    this.selectedBlockAddressBalance = 0;
                    this.selectedBlackAddressTxList = [];
                    // pager object
                    this.historyPager = {};
                    this.blockPager = {};
                }
                //Init function for load default value
                ngOnInit() {
                    this.displayMode = DisplayModeEnum.first;
                    this.totalSky = 0;
                    this.selectedNode = {};
                    this.loadNode();
                    this.loadConnections();
                    this.loadDefaultConnections();
                    this.loadProgress();
                    this.loadOutputs();
                    this.isValidAddress = false;
                    this.blockViewMode = 'recentBlocks';
                    //Set interval function for load node every 15 seconds
                    setInterval(() => {
                        this.loadNode();
                        //console.log("Refreshing nodes");
                    }, 30000);
                    setInterval(() => {
                        this.loadConnections();
                        //console.log("Refreshing connections");
                    }, 15000);
                    //Enable Send tab "textbox" and "Ready" button by default
                    this.sendDisable = true;
                    this.readyDisable = false;
                    this.pendingTable = [];
                    this.selectedMenu = "Nodes";
                    this.sortDir = { time: 0, amount: 0, address: 0 };
                    this.filterAddressVal = '';
                    this.historySearchKey = '';
                    if (localStorage.getItem('historyAddresses') != null) {
                        this.addresses = JSON.parse(localStorage.getItem('historyAddresses'));
                    }
                    else {
                        localStorage.setItem('historyAddresses', JSON.stringify([]));
                        this.addresses = JSON.parse(localStorage.getItem('historyAddresses'));
                    }
                    /*$("#nodeSelect").select2({
                        templateResult: function(state) {
                            return state.text;
                            /!*if (!state.id) { return state.text; }
                             var $state = $(
                             '<span><img src="vendor/images/flags/' + state.element.value.toLowerCase() + '.png" class="img-flag" /> ' + state.text + '</span>'
                             );
                             return $state;*!/
                        }
                    });*/
                }
                //Ready button function for disable "textbox" and enable "Send" button for ready to send coin
                ready(spendId, spendaddress, spendamount) {
                    if (!spendId) {
                        toastr.error("Please select from id");
                        return false;
                    }
                    if (!spendaddress) {
                        toastr.error("Please enter pay to");
                        return false;
                    }
                    if (!spendamount) {
                        toastr.error("Please enter amount");
                        return false;
                    }
                    this.readyDisable = true;
                    this.sendDisable = false;
                }
                //Load node function
                loadNode() {
                    this.http.post('/', '')
                        .map((res) => res.json())
                        .subscribe(data => {
                        if (this.nodes == null || this.nodes.length == 0) {
                            _.each(data, (o) => {
                                o.showChild = false;
                            });
                            this.nodes = data;
                            if (this.nodes.length > 0) {
                                this.onSelectNode(this.nodes[0].Meta.nodeId);
                            }
                        }
                        else {
                            data.map((w) => {
                                var old = _.find(this.nodes, (o) => {
                                    o.Meta.nodeType == w.Meta.nodeType;
                                    o.Meta.nodeName == w.Meta.nodeName;
                                    o.Meta.nodeZone == w.Meta.nodeZone;
                                    o.Meta.nodeId == w.Meta.nodeId;
                                    return o.Meta.nodeId;
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
                            var name = data[inc].Meta.nodeName;
                            var id = data[inc].Meta.nodeId;
                            var type = data[inc].Meta.nodeType;
                            var zone = data[inc].Meta.nodezone;
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
                        this.http.get('/?Address=' + address, { headers: headers })
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
                    this.http.get('/?nodeId=' + id, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(
                    //Response from API
                    response => {
                        //console.log('load done: ' + inc, response);
                        this.nodes[inc].Connection = response.confirmed.Connection;
                    }, err => console.log("Error on adding new node " + err), () => {
                        //console.log('New node added.')
                    });
                    //get connection addresses
                    this.nodes[inc].entries.map((entry) => {
                        this.http.get('/?address=' + entry.address, { headers: headers })
                            .map((res) => res.json())
                            .subscribe(
                        //Response from API
                        response => {
                            //console.log('Address:' + entry.address, response);
                            entry.Connection = response.confirmed.Connection;
                        }, err => console.log("Error on loading connection address: " + err), () => {
                            //console.log('connection address loaded')
                        });
                    });
                }
                loadConnections() {
                    this.http.post('/network/connections', '')
                        .map((res) => res.json())
                        .subscribe(data => {
                        //console.log("connections", data);
                        this.connections = data.connections;
                    }, err => console.log("Error on load connection: " + err), () => {
                        //console.log('Connection load done')
                    });
                }
                loadDefaultConnections() {
                    this.http.post('/network/defaultConnections', '')
                        .map((res) => res.json())
                        .subscribe(data => {
                        //console.log("default connections", data);
                        this.defaultConnections = data;
                    }, err => console.log("Error on load default connection: " + err), () => {
                        //console.log('Default connections load done')
                    });
                }
                loadOutputs() {
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    this.http.get('/outputs', { headers: headers })
                        .map((res) => res.json())
                        .subscribe(data => {
                        this.outputs = _.sortBy(data, function (o) {
                            return o.address;
                        });
                        this.outputs.length = Math.min(100, this.outputs.length);
                    }, err => console.log("Error on load outputs: " + err), () => {
                        //console.log('Connection load done')
                    });
                }
                //Load progress function for puebe
                loadProgress() {
                    //Post method executed
                    this.http.post('/blockchain/progress', '')
                        .map((res) => res.json())
                        .subscribe(
                    //Response from API
                    response => { this.progress = (parseInt(response.current, 10) + 1) / parseInt(response.highest, 10) * 100; }, err => console.log("Error on load progress: " + err), () => {
                        //console.log('Progress load done:' + this.progress)
                    });
                }
                toggleShowChild(node) {
                    node.showChild = !node.showChild;
                }
                //Switch tab function
                switchTab(mode, node) {
                    //"Textbox" and "Ready" button enable in Send tab while switching tabs
                    this.sendDisable = true;
                    this.readyDisable = false;
                    this.displayMode = mode;
                    if (node) {
                        this.spendid = node.meta.filename;
                        this.selectedNode = _.find(this.nodes, function (o) {
                            return o.meta.filename === node.meta.filename;
                        });
                        console.log("selected node", this.spendid, this.selectedNode);
                    }
                }
                selectMenu(menu, event) {
                    this.displayMode = this.displayModeEnum.fifth;
                    event.preventDefault();
                    this.selectedMenu = menu;
                }
                getDateTimeString(ts) {
                    return moment.unix(ts).format("YYYY-MM-DD HH:mm");
                }
                getElapsedTime(ts) {
                    return moment().unix() - ts;
                }
                //Show QR code function for show QR popup
                showQR(node) {
                    this.QrAddress = node.entries[0].address;
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
                //Add new node function for generate new node for an ssh connection
                createNewNode(nodename, address, port, user, pass) {
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    var stringConvert = 'name=' + nodename + '&address=' + address + '&port=' + port + '&user=' + user + '&pass=' + pass;
                    this.http.post('node/create', stringConvert, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(response => {
                        console.log(response);
                        //Hide new node popup
                        this.NewNodeIsVisible = false;
                        alert("New node created successfully");
                        //Load node for refresh list
                        this.loadNode();
                    }, err => {
                        console.log("Error on creating new node: " + JSON.stringify(err));
                    }, () => { });
                }
                addNewAddress(node) {
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    //Post method executed
                    var stringConvert = 'id=' + node.meta.filename;
                    this.http.post('/node/newAddress', stringConvert, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(response => {
                        console.log(response);
                        toastr.info("New address created successfully");
                        //Load node for refresh list
                        this.loadNode();
                    }, err => {
                        console.log(err);
                    }, () => {
                        console.log('New node added.');
                    });
                }
                //Load node seed function
                openLoadNode(nodeName, seed) {
                    this.loadSeedIsVisible = true;
                }
                //Hide load node seed function
                hideLoadSeedNodePopup() {
                    this.loadSeedIsVisible = false;
                }
                //Load node seed function for create new node with name and seed
                createNodeSeed(nodeName, seed) {
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    var stringConvert = 'name=' + nodeName + '&seed=' + seed;
                    //Post method executed
                    this.http.post('/node/create', stringConvert, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(response => {
                        //Hide load node seed popup
                        this.loadSeedIsVisible = false;
                        //Load node for refresh list
                        this.loadNode();
                    }, err => console.log("Error on create load node seed: " + JSON.stringify(err)), () => {
                        //console.log('Load node seed done')
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
                updateStatusOfTransaction(txid, metaData) {
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    this.http.get('/transaction?txid=' + txid, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(
                    //Response from API
                    res => {
                        this.pendingTable.push({ 'time': res.txn.timestamp, 'status': res.status.confirmed ? 'Completed' : 'Unconfirmed', 'amount': metaData.amount, 'txId': txid, 'address': metaData.address });
                        //Load node for refresh list
                        this.loadNode();
                    }, err => {
                        console.log("Error on load transaction: " + err);
                    }, () => {
                    });
                }
                spend(spendid, spendaddress, spendamount) {
                    var amount = Number(spendamount);
                    if (amount < 1) {
                        toastr.error('Cannot send values less than 1.');
                        return;
                    }
                    //this.historyTable.push({address:spendaddress, amount:spendamount, time:Date.now()/1000});
                    //localStorage.setItem('historyTable',JSON.stringify(this.historyTable));
                    var oldItem = _.find(this.addresses, function (o) {
                        return o.address === spendaddress;
                    });
                    if (!oldItem) {
                        this.addresses.push({ address: spendaddress, amount: spendamount });
                        localStorage.setItem('historyAddresses', JSON.stringify(this.addresses));
                    }
                    this.readyDisable = true;
                    this.sendDisable = true;
                    //Set http headers
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    var stringConvert = 'id=' + spendid + '&coins=' + spendamount * 1000000 + "&fee=1&hours=1&dst=" + spendaddress;
                    //Post method executed
                    this.http.post('/node/spend', stringConvert, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(response => {
                        console.log(response);
                        this.updateStatusOfTransaction(response.txn.txid, { address: spendaddress, amount: amount });
                        this.readyDisable = false;
                        this.sendDisable = true;
                    }, err => {
                        this.readyDisable = false;
                        this.sendDisable = true;
                        var logBody = err._body;
                        if (logBody == 'Invalid "coins" value') {
                            toastr.error('Incorrect amount value.');
                            return;
                        }
                        else if (logBody == 'Invalid connection') {
                            toastr.error(logBody);
                            return;
                        }
                        else {
                            var logContent = JSON.parse(logBody.substring(logBody.indexOf("{")));
                            toastr.error(logContent.error);
                        }
                        //this.pendingTable.push({complete: 'Pending', address: spendaddress, amount: spendamount});
                    }, () => {
                        //console.log('Spend successfully')
                        $("#send_pay_to").val("");
                        $("#send_amount").val(0);
                    });
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
                setBlockPage(page) {
                    this.blockPager.totalPages = this.blockChain.length;
                    if (page < 1 || page > this.blockPager.totalPages) {
                        return;
                    }
                    // get pager object from service
                    this.blockPager = this.pagerService.getPager(this.blockChain.length, page);
                    // get current page of items
                    this.blockPagedItems = this.blockChain.slice(this.blockPager.startIndex, this.blockPager.endIndex + 1);
                    //console.log("this.blockPagedItems", this.blockPagedItems);
                }
                searchHistory(searchKey) {
                    console.log(searchKey);
                }
                searchBlockHistory(searchKey) {
                    console.log(searchKey);
                }
                onSelectNode(val) {
                    console.log("onSelectNode", val);
                    //this.selectedNode = val;
                    this.spendid = val;
                    this.selectedNode = _.find(this.nodes, function (o) {
                        return o.meta.filename === val;
                    });
                }
                showBlockDetail(block) {
                    //change viewMode as blockDetail
                    this.blockViewMode = 'blockDetail';
                    this.selectedBlock = block;
                }
                showRecentBlock() {
                    this.blockViewMode = 'recentBlocks';
                }
                showBlockTransactionDetail(txns) {
                    this.blockViewMode = 'blockTransactionDetail';
                    this.selectedBlockTransaction = txns;
                }
                showTransactionDetail(txId) {
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    this.http.get('/transaction?txid=' + txId, { headers: headers })
                        .map((res) => res.json())
                        .subscribe(
                    //Response from API
                    response => {
                        console.log(response);
                        this.blockViewMode = 'blockTransactionDetail';
                        this.selectedBlockTransaction = response.txn;
                    }, err => {
                        console.log("Error on load transaction: " + err);
                    }, () => {
                    });
                }
                showBlockAddressDetail(address) {
                    this.blockViewMode = 'blockAddressDetail';
                    this.selectedBlockAddress = address;
                    var headers = new http_2.Headers();
                    headers.append('Content-Type', 'application/x-www-form-urlencoded');
                    var txList = [];
                    async.parallel([
                            (callback) => {
                            this.http.get('/balance?addrs=' + address, { headers: headers })
                                .map((res) => res.json())
                                .subscribe(
                            //Response from API
                            response => {
                                //console.log(response);
                                this.selectedBlockAddressBalance = response.confirmed.coins / 1000000;
                                callback(null, null);
                            }, err => {
                                callback(err, null);
                                //console.log("Error on load balance: " + err)
                            }, () => {
                            });
                        },
                            (callback) => {
                            this.http.get('/address_in_uxouts?address=' + address, { headers: headers })
                                .map((res) => res.json())
                                .subscribe(
                            //Response from API
                            response => {
                                console.log("address_in_uxouts", response);
                                _.map(response, (o) => {
                                    o.type = 'in';
                                    txList.push(o);
                                });
                                callback(null, null);
                            }, err => {
                                callback(err, null);
                                //console.log("Error on load balance: " + err)
                            }, () => {
                            });
                        },
                            (callback) => {
                            this.http.get('/address_out_uxouts?address=' + address, { headers: headers })
                                .map((res) => res.json())
                                .subscribe(
                            //Response from API
                            response => {
                                console.log("address_out_uxouts", response);
                                _.map(response, (o) => {
                                    o.type = 'out';
                                    txList.push(o);
                                });
                                callback(null, null);
                            }, err => {
                                callback(err, null);
                                //console.log("Error on load balance: " + err)
                            }, () => {
                            });
                        }
                    ], (err, rets) => {
                        console.log(err, rets);
                        this.selectedBlackAddressTxList = _.sortBy(txList, (o) => {
                            return o.time;
                        });
                    });
                }
            };
            loadNodeComponent = __decorate([
                core_1.Component({
                    selector: 'load-node',
                    directives: [router_1.ROUTER_DIRECTIVES],
                    providers: [PagerService],
                    templateUrl: 'app/templates/node.html'
                }), 
                __metadata('design:paramtypes', [http_1.Http, PagerService])
            ], loadNodeComponent);
            exports_1("loadNodeComponent", loadNodeComponent);
            //Set default enum value for tabs
            (function (DisplayModeEnum) {
                DisplayModeEnum[DisplayModeEnum["first"] = 0] = "first";
                DisplayModeEnum[DisplayModeEnum["second"] = 1] = "second";
                DisplayModeEnum[DisplayModeEnum["third"] = 2] = "third";
                DisplayModeEnum[DisplayModeEnum["fourth"] = 3] = "fourth";
                DisplayModeEnum[DisplayModeEnum["fifth"] = 4] = "fifth";
            })(DisplayModeEnum || (DisplayModeEnum = {}));
        }
    }
});

//# sourceMappingURL=app.loadNode.js.map
