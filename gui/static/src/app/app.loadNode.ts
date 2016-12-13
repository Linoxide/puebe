import {Component, OnInit, ViewChild} from 'angular2/core';
import {ROUTER_DIRECTIVES, OnActivate} from 'angular2/router';
import {Http, HTTP_BINDINGS, Response} from 'angular2/http';
import {HTTP_PROVIDERS, Headers} from 'angular2/http';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import {QRCodeComponent} from './ng2-qrcode.ts';

declare var _: any;
declare var $: any;
declare var async: any;
declare var moment: any;

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
    directives: [ROUTER_DIRECTIVES, QRCodeComponent],
    providers: [PagerService],
    templateUrl: 'app/templates/node.html'
})

export class loadNodeComponent implements OnInit {
    //Declare default variables
    nodes : Array<any>;
    displayMode: DisplayModeEnum;
    displayModeEnum = DisplayModeEnum;
    selectedMenu: string;
    
    //user details
    userName: string;
    Password: string;

    QrAddress: string;
    QrIsVisible: boolean;

    NewNodeIsVisible: boolean;

    nodename: string;
    nodeId: string;
    nodeType: string;
    nodeZone: string;

    connections: Array<any>;
    defaultConnections: Array<any>;
    NewDefaultConnectionIsVisible : boolean;
    EditDefaultConnectionIsVisible : boolean;
    oldConnection:string;
    filterAddressVal:string;
    
    SearchKey:string;
    selectedNode:any;

    isValidAddress: boolean;


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
        this.selectedNode = {};
        this.loadNode();
        this.loadConnections();
        this.loadDefaultConnections();
        this.loadBlockChain();
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
            //this.loadBlockChain();
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
    }

    //Ready button function for disable "textbox" and enable "Send" button for ready to send coin
    ready(spendId, spendaddress, spendamount){
        if(!spendId){
            alert("Please select from id");
            return false;
        }
        if(!spendaddress){
            alert("Please enter pay to");
            return false;
        }
        if(!spendamount){
            alert("Please enter amount");
            return false;
        }
        this.readyDisable = true;
        this.sendDisable = false;
    }

    //Load node function
    loadNode(){
        this.totalSky = 0;
        this.http.post('/nodes', '')
            .map((res:Response) => res.json())
            .subscribe(
                data => {
                    if(this.nodes == null || this.nodes.length == 0) {
                      _.each(data, (o)=>{
                        o.showChild = false;
                      })
                      this.nodes = data;
                      if (this.nodes.length > 0) {
                        this.onSelectNode(this.nodes[0].meta.filename);
                      }
                    } else {
                      data.map((w)=>{
                        var old = _.find(this.nodes, (o)=>{
                          return o.meta.filename === w.meta.filename;
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

                    //Load Balance for each node
                    var inc = 0;
                    for(var item in data){
                        var filename = data[inc].meta.filename;
                        this.loadNodeItem(filename, inc);
                        inc++;
                    }
                    //Load Balance for each node end

                },
                err => console.log("Error on loading node: "+err),
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
        this.http.get('/balance?addrs=' + address, { headers: headers })
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
    loadNodeItem(address, inc){
        //Set http headers
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        this.http.get('/node/balance?id=' + address, { headers: headers })
            .map((res) => res.json())
            .subscribe(
                //Response from API
                response => {
                    //console.log('load done: ' + inc, response);
                    this.nodes[inc].balance = response.confirmed.coins / 1000000;
                    this.totalSky += this.nodes[inc].balance;
                }, err => console.log("Error on load balance: " + err), () => {
                  //console.log('Balance load done')
                })
        //get address balances
        this.nodes[inc].entries.map((entry)=>{
          this.http.get('/balance?addrs=' + entry.address, { headers: headers })
              .map((res) => res.json())
              .subscribe(
                  //Response from API
                  response => {
                      //console.log('balance:' + entry.address, response);
                      entry.balance = response.confirmed.coins / 1000000;
                  }, err => console.log("Error on load balance: " + err), () => {
                    //console.log('Balance load done')
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
                console.log("blockchain", data);
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
        this.randomWords = this.getRandomWords();
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
    createNewNode(label, seed, addressCount){
        if(addressCount < 1) {
          alert("Please input correct address count");
          return;
        }

        //check if label is duplicated
        var old = _.find(this.nodes, function(o){
          return (o.meta.label == label)
        })

        if(old) {
          alert("This node label is used already");
          return;
        }

        //Set http headers
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');

        //Post method executed
        var stringConvert = 'label='+label+'&seed='+seed;
        this.http.post('/node/create', stringConvert, {headers: headers})
            .map((res:Response) => res.json())
            .subscribe(
                response => {
                  console.log(response)

                  if(addressCount > 1) {
                    var repeats = [];
                    for(var i = 0; i < addressCount - 1 ; i++) {
                      repeats.push(i)
                    }

                    async.map(repeats, (idx, callback) => {
                        var stringConvert = 'id='+response.meta.filename;
                        this.http.post('/node/newAddress', stringConvert, {headers: headers})
                            .map((res:Response) => res.json())
                            .subscribe(
                                response => {
                                  console.log(response)
                                  callback(null, null)
                                },
                                err => {
                                  callback(err, null)
                                },
                                () => {}
                            );
                    }, (err, ret) => {
                      if(err) {
                        console.log(err);
                        return;
                      }

                      //Hide new node popup
                      this.NewNodeIsVisible = false;
                      alert("New node created successfully");
                      //Load node for refresh list
                      this.loadNode();
                    })
                  } else {
                    //Hide new node popup
                    this.NewNodeIsVisible = false;
                    alert("New node created successfully");
                    //Load node for refresh list
                    this.loadNode();
                  }
                },
                err => {
                  console.log(err);
                },
                () => {}
            );
    }

    //Edit existing node function
    editNode(node){
        this.EditNodeIsVisible = true;
        this.nodeId = node.meta.filename;
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
              alert("New address created successfully");
              //Load node for refresh list
              this.loadNode();
              },
              err => {
                console.log(err);
              },
              () => {}
          );
    }
    //Hide edit node function
    hideEditNodePopup(){
        this.EditNodeIsVisible = false;
    }

    //Update node function for update node label
    updateNode(nodeid, nodeName){
      console.log("update node", nodeid, nodeName);
        //check if label is duplicated
        var old = _.find(this.nodes, function(o){
          return (o.meta.label == nodeName)
        })

        if(old) {
          alert("This node label is used already");
          return;
        }

        //Set http headers
        var headers = new Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        var stringConvert = 'label='+nodeName+'&id='+nodeid;
        //Post method executed
        this.http.post('/node/update', stringConvert, {headers: headers})
            .map((res:Response) => res.json())
            .subscribe(
                response => {
                    //Hide new node popup
                    this.EditNodeIsVisible = false;
                    alert("Node updated successfully");
                    //Load node for refresh list
                    this.loadNode();
                },
                err => console.log("Error on update node: "+JSON.stringify(err)),
                () => {
                  //console.log('Update node done')
                }
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

      if(key == 'time'){
        this.sortDir['address'] = 0;
        this.sortDir['amount'] = 0;
      } else if(key == 'amount') {
        this.sortDir['time'] = 0;
        this.sortDir['address'] = 0;
      } else {
        this.sortDir['time'] = 0;
        this.sortDir['amount'] = 0;
      }

      var self = this;
        if(key == 'time') {
            this.historyTable = _.sortBy(this.historyTable, function(o){
                return o.txn.timestamp;
            });
        } else if(key == 'amount') {
            this.historyTable = _.sortBy(this.historyTable, function(o){
                return Number(o[key]);
            });
        } else if(key == 'address') {
            this.historyTable = _.sortBy(this.historyTable, function(o){
                return o[key];
            })
        };

        if(this.sortDir[key] == -1) {
          this.historyTable = this.historyTable.reverse();
        }

            this.setHistoryPage(this.historyPager.currentPage);
    }

    filterHistory(address) {
      console.log("filterHistory", address);
      this.filterAddressVal = address;
    }

    spend(spendid, spendaddress, spendamount){
        var amount = Number(spendamount);
        if(amount < 1) {
          alert('Cannot send values less than 1.');
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
                    response.txn.time = Date.now()/1000;
                    response.txn.address = spendaddress;
                    response.txn.amount = spendamount;
                    this.pendingTable.push(response);
                    //Load node for refresh list
                    this.loadNode();
                    this.readyDisable = false;
                    this.sendDisable = true;
                },
                err => {
                    this.readyDisable = false;
                    this.sendDisable = true;
                    var logBody = err._body;
                    if(logBody == 'Invalid "coins" value') {
                      alert('Incorrect amount value.');
                      return;
                    } else if (logBody == 'Invalid connection') {
                      alert(logBody);
                      return;
                    } else {
                      var logContent = JSON.parse(logBody.substring(logBody.indexOf("{")));
                      alert(logContent.error);
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

    getRandomWords() {
      var ret = [];
      for(var i = 0 ; i < 11; i++) {
        var length = Math.round(Math.random() * 10);
        length = Math.max(length, 3);

        ret.push(this.createRandomWord(length));
      }

      return ret.join(" ");
    }

    createRandomWord(length) {
      var consonants = 'bcdfghjklmnpqrstvwxyz',
          vowels = 'aeiou',
          rand = function(limit) {
              return Math.floor(Math.random()*limit);
          },
          i, word='',
          consonants2 = consonants.split(''),
          vowels2 = vowels.split('');
      for (i=0;i<length/2;i++) {
          var randConsonant = consonants2[rand(consonants.length)],
              randVowel = vowels2[rand(vowels.length)];
          word += (i===0) ? randConsonant.toUpperCase() : randConsonant;
          word += i*2<length-1 ? randVowel : '';
      }
      return word;
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
