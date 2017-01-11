import {Component, OnInit, ViewChild} from 'angular2/core';
import {ROUTER_DIRECTIVES, OnActivate} from 'angular2/router';
import {Http, HTTP_BINDINGS, Response} from 'angular2/http';
import {HTTP_PROVIDERS, Headers} from 'angular2/http';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';


declare var _: any;
declare var $: any;
declare var async: any;
declare var moment: any;
declare var toastr: any;

export class PagerService {
    getPager(totalItems: number, currentPage: number = 1, pageSize: number = 5) {
        // calculate total pages
        var totalPages = Math.ceil(totalItems / pageSize);

        var startPage, endPage;
        if (totalPages <= 10) {
            // less than 10 total pages so show all
            startPage = 1;
            endPage = totalPages;
        } else {
            // more than 10 total pages so calculate start and end pages
            if (currentPage <= 6) {
                startPage = 1;
                endPage = 10;
            } else if (currentPage + 4 >= totalPages) {
                startPage = totalPages - 9;
                endPage = totalPages;
            } else {
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

@Component({
    selector: 'load-node',
    directives: [ROUTER_DIRECTIVES],
    providers: [PagerService],
    templateUrl: 'app/templates/node.html'
})

export class loadNodeComponent implements OnInit {
    //Declare default varialbes
    nodes : Array<any>;
    nodesWithAddress : Array<any>;
    progress: any;
    spendid: string;
    spendaddress: string;
    sendDisable: boolean;
    readyDisable: boolean;
    displayMode: DisplayModeEnum;
    displayModeEnum = DisplayModeEnum;
    selectedMenu: string;

    QrAddress: string;
    QrIsVisible: boolean;

    NewNodeIsVisible: boolean;
    loadSeedIsVisible: boolean;

    nodename: string;
    nodeId: string;

    historyTable: Array<any>;
    pendingTable: Array<any>;
    addresses: Array<any>;
    connections: Array<any>;
    defaultConnections: Array<any>;
    blockChain: any;
    numberOfBlocks: number;
    outputs: Array<any>;
    NewDefaultConnectionIsVisible : boolean;
    EditDefaultConnectionIsVisible : boolean;
    oldConnection:string;
    filterAddressVal:string;
    totalSky:any;
    historySearchKey:string;
    selectedNode:any;

    sortDir:{};
    isValidAddress: boolean;

    blockViewMode:string;
    selectedBlock: any = {};
    selectedBlockTransaction:any = {};
    selectedBlockAddress:string;
    selectedBlockAddressBalance:any = 0;
    selectedBlackAddressTxList: any = [];

    // pager object
    historyPager: any = {};
    historyPagedItems: any[];

    blockPager: any = {};
    blockPagedItems: any[];

    //Constructor method for load HTTP object
    constructor(private http: Http, private pagerService: PagerService) { }

    //Init function for load default value
    ngOnInit() {
        this.displayMode = DisplayModeEnum.first;
        this.totalSky = 0;
        this.selectedNode = {};
        this.loadNode();
        this.loadConnections();
        this.loadDefaultConnections();
        this.loadBlockChain();
        this.loadNumberOfBlocks();
        this.loadProgress();
        this.loadOutputs();
        this.loadTransactions();
        this.isValidAddress = false;
        this.blockViewMode = 'recentBlocks'

        //Set interval function for load node every 15 seconds
        setInterval(() => {
            this.loadNode();
            //console.log("Refreshing balance");
        }, 30000);
        setInterval(() => {
            this.loadConnections();
            this.loadBlockChain();
            this.loadNumberOfBlocks();
            //console.log("Refreshing connections");
        }, 15000);

        //Enable Send tab "textbox" and "Ready" button by default
        this.sendDisable = true;
        this.readyDisable = false;
        this.pendingTable = [];
        this.selectedMenu = "Nodes";
        this.sortDir = {time:0, amount:0, address:0};
        this.filterAddressVal = '';
        this.historySearchKey = '';

        if(localStorage.getItem('historyAddresses') != null){
            this.addresses = JSON.parse(localStorage.getItem('historyAddresses'));
        } else {
            localStorage.setItem('historyAddresses',JSON.stringify([]));
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
    ready(spendId, spendaddress, spendamount){
        if(!spendId){
            toastr.error("Please select from id");
            return false;
        }
        if(!spendaddress){
            toastr.error("Please enter pay to");
            return false;
        }
        if(!spendamount){
            toastr.error("Please enter amount");
            return false;
        }
        this.readyDisable = true;
        this.sendDisable = false;
    }

    loadNumberOfBlocks(){
        this.numberOfBlocks=0;
        this.http.get('/blockchain/metadata')
            .map((res:Response)=>res.json())
            .subscribe(
                data=>{
                    this.numberOfBlocks = data.head.seq;
                }
            )
    }

    //Load node function
    loadNode(){
        this.http.post('/', '')
            .map((res:Response) => res.json())
            .subscribe(
                data => {
                    if(this.nodes == null || this.nodes.length == 0) {
                      _.each(data, (o)=>{
                        o.showChild = false;
                      })
                      this.nodes = data;
                      if (this.nodes.length > 0) {
                        this.onSelectNode(this.nodes[0].Meta.nodeId);
                      }
                    } else {
                      data.map((w)=>{
                        var old = _.find(this.nodes, (o)=>{
                        	o.Meta.nodeType == w.Meta.nodeType;
                        	o.Meta.nodeName == w.Meta.nodeName;
                        	o.Meta.nodeZone == w.Meta.nodeZone;
                        	o.Meta.nodeId == w.Meta.nodeId;
                          return o.Meta.nodeId;
                        })

                        if(old) {
                          _.extend(old, w);
                        } else {
                          w.showChild = false;
                          this.nodes.push(w);
                        }
                      })
                    }

                    //console.log("this.nodes", this.nodes);

                    //Load data for each nodeBalance for each node
                    var inc;
                    for(var item in data){
                        var name = data[inc].Meta.nodeName;
                        var id = data[inc].Meta.nodeId;
                        var type = data[inc].Meta.nodeType;
                        var zone = data[inc].Meta.nodezone;
                        this.loadNodeItem(name,id, type, zone, inc);
                        inc;
                    }

                },
                err => console.log("Error on loading node instance: "+err),
                () => {
                  //console.log('Node load successful')
                }
            );
    }
    
    checkValidAddress(address) {
      if(address === "")
        this.isValidAddress = false;
      else {
        var headers = new Headers();
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

                })
      }
    }
    
    loadNodeItem(name,id, type, zone, inc){
        //Set http headers
        var headers = new Headers();
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
                })
                
        //get connection addresses
        this.nodes[inc].entries.map((entry)=>{
          this.http.get('/?address=' + entry.address, { headers: headers })
              .map((res) => res.json())
              .subscribe(
                  //Response from API
                  response => {
                      //console.log('Address:' + entry.address, response);
                      entry.Connection = response.confirmed.Connection
                  }, err => console.log("Error on loading connection address: " + err), () => {
                    //console.log('connection address loaded')
                  })
        })
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
    loadTransactions() {
        this.historyTable = [];
        this.http.get('/lastTxs', {})
            .map((res) => res.json())
            .subscribe(data => {
                console.log("transactions", data);
                this.historyTable = this.historyTable.concat(data);
                this.setHistoryPage(1);
            }, err => console.log("Error on load transactions: " + err), () => {
              //console.log('Connection load done')
            });
        this.http.get('/pendingTxs', {})
            .map((res) => res.json())
            .subscribe(data => {
                console.log("pending transactions", data);
                this.historyTable = this.historyTable.concat(data);
                this.setHistoryPage(1);
            }, err => console.log("Error on pending transactions: " + err), () => {

            });
    }
    GetTransactionAmount(transaction) {
      var ret = 0;
      _.each(transaction.txn.outputs, function(o){
        ret += Number(o.coins);
      })

      return ret;
    }
    GetTransactionAmount2(transaction) {
      var ret = 0;
      _.each(transaction.outputs, function(o){
        ret += Number(o.coins);
      })

      return ret;
    }
    GetBlockAmount(block) {
      var ret = [];
      _.each(block.body.txns, function(o){
        _.each(o.outputs, function(_o){
          ret.push(_o.coins);
        })
      })

      return ret.join(",");
    }
    GetBlockTotalAmount(block) {
      var ret = 0;
      _.each(block.body.txns, function(o){
        _.each(o.outputs, function(_o){
          ret += Number(_o.coins);
        })
      })

      return ret;
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
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        this.http.get('/outputs', { headers: headers })
            .map((res) => res.json())
            .subscribe(data => {
                this.outputs = _.sortBy(data, function(o){
                    return o.address;
                });
                this.outputs.length = Math.min(100, this.outputs.length);
            }, err => console.log("Error on load outputs: " + err), () => {
              //console.log('Connection load done')
            });
    }
    loadBlockChain() {
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        this.http.get('/last_blocks?num=10', { headers: headers })
            .map((res) => res.json())
            .subscribe(data => {
                //console.log("blockchain", data);
                this.blockChain = _.sortBy(data.blocks, function(o){
                  return o.header.seq * (-1);
                });
                this.setBlockPage(1);
            }, err => console.log("Error on load blockchain: " + err), () => {
              //console.log('blockchain load done');
            });
    }    //Load progress function for Skycoin
    loadProgress(){
        //Post method executed
        this.http.post('/blockchain/progress', '')
            .map((res:Response) => res.json())
            .subscribe(
                //Response from API
                response => { this.progress = (parseInt(response.current,10)+1) / parseInt(response.highest,10) * 100 },
                err => console.log("Error on load progress: "+err),
                () => {
                  //console.log('Progress load done:' + this.progress)
                }
            );
    }
    toggleShowChild(node) {
      node.showChild = !node.showChild;
    }

    //Switch tab function
    switchTab(mode: DisplayModeEnum, node) {
        //"Textbox" and "Ready" button enable in Send tab while switching tabs
        this.sendDisable = true;
        this.readyDisable = false;

        this.displayMode = mode;
        if(node){
            this.spendid = node.meta.filename;
            this.selectedNode = _.find(this.nodes, function(o){
              return o.meta.filename === node.meta.filename;
            })
            console.log("selected node", this.spendid, this.selectedNode);
        }
    }
    selectMenu(menu, event) {
        this.displayMode = this.displayModeEnum.fifth;
        event.preventDefault();
        this.selectedMenu = menu;
    }
    getDateTimeString(ts) {
        return moment.unix(ts).format("YYYY-MM-DD HH:mm")
    }
    getElapsedTime(ts) {
        return moment().unix() - ts;
    }
    //Show QR code function for show QR popup
    showQR(node){
        this.QrAddress = node.entries[0].address;
        this.QrIsVisible = true;
    }
    //Hide QR code function for hide QR popup
    hideQrPopup(){
        this.QrIsVisible = false;
    }

    //Show node function for view New node popup
    showNewNodeDialog(){
        this.NewNodeIsVisible = true;
    }
    //Hide node function for hide New node popup
    hideNodePopup(){
        this.NewNodeIsVisible = false;
    }
    showNewDefaultConnectionDialog(){
        this.NewDefaultConnectionIsVisible = true;
    }
    hideNewDefaultConnectionDialog(){
        this.NewDefaultConnectionIsVisible = false;
    }
    showEditDefaultConnectionDialog(item){
        this.oldConnection = item;
        this.EditDefaultConnectionIsVisible = true;
    }
    hideEditDefaultConnectionDialog(){
        this.EditDefaultConnectionIsVisible = false;
    }
    createDefaultConnection(connectionValue){
        //console.log("new value", connectionValue);
        this.defaultConnections.push(connectionValue);
        this.NewDefaultConnectionIsVisible = false;
    }
    updateDefaultConnection(connectionValue){
        //console.log("old/new value", this.oldConnection, connectionValue);
        var idx = this.defaultConnections.indexOf(this.oldConnection);
        this.defaultConnections.splice(idx, 1);
        this.defaultConnections.splice(idx, 0, connectionValue);
        this.EditDefaultConnectionIsVisible = false;
    }
    deleteDefaultConnection(item){
        var idx = this.defaultConnections.indexOf(item);
        this.defaultConnections.splice(idx, 1);
    }
    //Add new node function for generate new node in Skycoin
    createNewNode(nodename, address, port, user, pass){
    	var node: any = {};
		node.Connection.Host = address +":"+port;
		node.Connection.Port = port;
		node.Connection.Password = pass;
		node.Connection.User = user;
		node.Meta.nodeName = nodename
		var stringConvert = JSON.stringify(node);
		
        //check if label is duplicated
        var old = _.find(this.nodes, function(o){
          return (o.Meta.nodeName == nodename)
        })

        if(old) {
          alert("This node label is used already");
          return;
        }

        //Set http headers
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
		
        this.http.post('/create', stringConvert, {headers: headers})
            .map((res:Response) => res.json())
            .subscribe(
                response => {
                  	console.log(response)

                    //Hide new node popup
                    this.NewNodeIsVisible = false;
                    alert("New node created successfully");
                    //Load node for refresh list
                    this.loadNode();
              	},
                err => {
                  console.log(err);
                },
                () => {}
            );
          
    }

    addNewAddress(node) {
      //Set http headers
      var headers = new Headers();
      headers.append('Content-Type', 'application/x-www-form-urlencoded');

      //Post method executed
      var stringConvert = 'id='+node.meta.filename;
      this.http.post('/node/newAddress', stringConvert, {headers: headers})
          .map((res:Response) => res.json())
          .subscribe(
              response => {
              console.log(response)
                  toastr.info("New address created successfully");
              //Load node for refresh list
              this.loadNode();
              },
              err => {
                console.log(err);
              },
              () => {}
          );
    }

    //Load node seed function
    openLoadNode(nodeName, seed){
        this.loadSeedIsVisible = true;
    }
    //Hide load node seed function
    hideLoadSeedNodePopup(){
        this.loadSeedIsVisible = false;
    }

    //Load node seed function for create new node with name and seed
    createNodeSeed(nodeName, seed){
        //Set http headers
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        var stringConvert = 'name='+nodeName+'&seed='+seed;
        //Post method executed
        this.http.post('/node/create', stringConvert, {headers: headers})
            .map((res:Response) => res.json())
            .subscribe(
                response => {
                    //Hide load node seed popup
                    this.loadSeedIsVisible = false;
                    //Load node for refresh list
                    this.loadNode();
                },
                err => console.log("Error on create load node seed: "+JSON.stringify(err)),
                () => {
                  //console.log('Load node seed done')
                }
            );
    }

    sortHistory(key) {
      if(this.sortDir[key]==0)
        this.sortDir[key] = 1;
      else
      	this.sortDir[key] = this.sortDir[key] * (-1);
     
      this.historyTable = _.sortBy(this.historyTable, function(o){
 	  return o[key];
   	 })
   	}

    filterHistory(address) {
      console.log("filterHistory", address);
      this.filterAddressVal = address;
    }

    updateStatusOfTransaction(txid, metaData){
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        this.http.get('/transaction?txid=' + txid, { headers: headers })
            .map((res) => res.json())
            .subscribe(
                //Response from API
                res => {
                    this.pendingTable.push({'time':res.txn.timestamp,'status':res.status.confirmed?'Completed':'Unconfirmed','amount':metaData.amount,'txId':txid,'address':metaData.address});
                    //Load node for refresh list
                    this.loadNode();
                }, err => {
                    console.log("Error on load transaction: " + err)
                }, () => {
                });
    }

    spend(spendid, spendaddress, spendamount){
        var amount = Number(spendamount);
        if(amount < 1) {
            toastr.error('Cannot send values less than 1.');
          return;
        }

        //this.historyTable.push({address:spendaddress, amount:spendamount, time:Date.now()/1000});
        //localStorage.setItem('historyTable',JSON.stringify(this.historyTable));

        var oldItem = _.find(this.addresses, function(o){
          return o.address === spendaddress;
        })

        if(!oldItem) {
          this.addresses.push({address:spendaddress, amount:spendamount});
          localStorage.setItem('historyAddresses',JSON.stringify(this.addresses));
        }

        this.readyDisable = true;
        this.sendDisable = true;
        //Set http headers
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        var stringConvert = 'id='+spendid+'&coins='+spendamount*1000000+"&fee=1&hours=1&dst="+spendaddress;
        //Post method executed
        this.http.post('/node/spend', stringConvert, {headers: headers})
            .map((res:Response) => res.json())
            .subscribe(
                response => {
                    console.log(response);
                    this.updateStatusOfTransaction(response.txn.txid, {address:spendaddress,amount:amount});
                    this.readyDisable = false;
                    this.sendDisable = true;
                },
                err => {
                    this.readyDisable = false;
                    this.sendDisable = true;
                    var logBody = err._body;
                    if(logBody == 'Invalid "coins" value') {
                        toastr.error('Incorrect amount value.');
                      return;
                    } else if (logBody == 'Invalid connection') {
                        toastr.error(logBody);
                      return;
                    } else {
                      var logContent = JSON.parse(logBody.substring(logBody.indexOf("{")));
                        toastr.error(logContent.error);
                    }

                    //this.pendingTable.push({complete: 'Pending', address: spendaddress, amount: spendamount});
                },
                () => {
                  //console.log('Spend successfully')
                  $("#send_pay_to").val("");
                  $("#send_amount").val(0);
                }
            );
    }

    setHistoryPage(page: number) {
        this.historyPager.totalPages = this.historyTable.length;

        if (page < 1 || page > this.historyPager.totalPages) {
            return;
        }

        // get pager object from service
        this.historyPager = this.pagerService.getPager(this.historyTable.length, page);

        console.log("this.historyPager", this.historyPager );
        // get current page of items
        this.historyPagedItems = this.historyTable.slice(this.historyPager.startIndex, this.historyPager.endIndex + 1);
        //console.log('this.pagedItems', this.historyTable, this.pagedItems);
    }

    setBlockPage(page: number) {
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

    searchHistory(searchKey){
      console.log(searchKey);

    }

    searchBlockHistory(searchKey){
      console.log(searchKey);

    }

    onSelectNode(val) {
      console.log("onSelectNode", val);
      //this.selectedNode = val;
      this.spendid = val;
      this.selectedNode = _.find(this.nodes, function(o){
        return o.meta.filename === val;
      })
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
        var headers = new Headers();
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
                    console.log("Error on load transaction: " + err)
                }, () => {
                })
    }

    showBlockAddressDetail(address) {
      this.blockViewMode = 'blockAddressDetail';
      this.selectedBlockAddress = address;

      var headers = new Headers();
      headers.append('Content-Type', 'application/x-www-form-urlencoded');
        var txList = [];
        async.parallel([
            (callback)=>{
                this.http.get('/balance?addrs=' + address, { headers: headers })
                    .map((res) => res.json())
                    .subscribe(
                        //Response from API
                        response => {
                            //console.log(response);
                            this.selectedBlockAddressBalance = response.confirmed.coins/1000000;
                            callback(null, null);
                        }, err => {
                            callback(err, null);
                            //console.log("Error on load balance: " + err)
                        }, () => {
                        })
            },
            (callback) => {
                this.http.get('/address_in_uxouts?address=' + address, { headers: headers })
                    .map((res) => res.json())
                    .subscribe(
                        //Response from API
                        response => {
                            console.log("address_in_uxouts", response);
                            _.map(response, (o)=>{
                                o.type = 'in';
                                txList.push(o)
                            });
                            callback(null, null);
                        }, err => {
                            callback(err, null);
                            //console.log("Error on load balance: " + err)
                        }, () => {
                        })
            },
            (callback) => {
                this.http.get('/address_out_uxouts?address=' + address, { headers: headers })
                    .map((res) => res.json())
                    .subscribe(
                        //Response from API
                        response => {
                            console.log("address_out_uxouts", response);
                            _.map(response, (o)=>{
                                o.type = 'out';
                                txList.push(o)
                            });
                            callback(null, null);
                        }, err => {
                            callback(err, null);
                            //console.log("Error on load balance: " + err)
                        }, () => {
                        })
            }
        ], (err, rets)=>{
            console.log(err, rets);
            this.selectedBlackAddressTxList = _.sortBy(txList, (o)=>{
                return o.time;
            })
        })
    }
}

//Set default enum value for tabs
enum DisplayModeEnum {
    first = 0,
    second = 1,
    third = 2,
    fourth = 3,
    fifth = 4
}
