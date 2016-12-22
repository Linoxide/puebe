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
    
    nodeId : string;
    nodeName : string;

    progress: any;
    readyDisable: boolean;
    selectedMenu: string;

    NewNodeIsVisible: boolean;
    EditNodeIsVisible: boolean;

    historyTable: Array<any>;
    filterAddressVal:string;
    SearchKey:string;
    selectedNode:any;

    sortDir:{};
    isValidAddress: boolean;

    // pager object
    historyPager: any = {};
    historyPagedItems: any[];

    //Constructor method for load HTTP object
    constructor(private http: Http, private pagerService: PagerService) { }

    //Init function for load default value
    ngOnInit() {
        this.loadNode();
        this.selectedNode = {};
       
        this.isValidAddress = false;

        //Set interval function for loading nodes every 15 seconds
        setInterval(() => {
            this.loadNode();
           
            //console.log("Refreshing connections");
        }, 30000);

        //Enable button by default
        this.selectedMenu = "Connected Nodes";
        this.filterAddressVal = '';
        this.SearchKey = '';
        this.NewNodeIsVisible = false;
        this.EditNodeIsVisible = false;

        if(localStorage.getItem('historyUsers') != null){
            this.nodes = JSON.parse(localStorage.getItem('historyUsers'));
        } else {
            localStorage.setItem('historyUsers',JSON.stringify([]));
            this.nodes= JSON.parse(localStorage.getItem('historyUsers'));
        }
        
    }

    //Search button for searching through the nodes
    search(nodeName, nodeId, nodeType){
        if(!nodeId){
            alert("Please select from Node ID");
            return false;
        }
        if(!nodeName){
            alert("Please enter node label");
            return false;
        }
        if(!nodeType){
            alert("Please enter node type");
            return false;
        }
        this.readyDisable = true;
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
    
    //Load progress function for Puebe
    loadProgress(){
        //Post method executed
        this.http.post('/', '')
            .map((res:Response) => res.json())
            .subscribe(
                //Response from API
                response => { this.progress = (parseInt(response.current,10)+1) / parseInt(response.highest,10) * 100 },
                err => console.log("Error on loading progress: "+err),
                () => {
                  //console.log('Progress load done:' + this.progress)
                }
            );
    }
    
    //Show node function for view New node popup
    showNewNodeDialog(){
        this.NewNodeIsVisible = true;
    }

    //Hide node function for hide New node popup
    hideNodePopup(){
        this.NewNodeIsVisible = false;
    }
    
    //Add new node function for generate new node in Puebe
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
  
    //Hide edit node function
    hideEditNodePopup(){
        this.EditNodeIsVisible = false;
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

    searchHistory(searchKey){
      console.log(searchKey)
    }
    
    onSelectNode(val) {
      console.log("onSelectNode", val)
      //this.selectedNode = val;
      this.nodeId = val;
      this.selectedNode = _.find(this.nodes, function(o){
        return o.Meta.nodeId === val;
      })
    }
}
