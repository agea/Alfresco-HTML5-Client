var cmis = cmis || {};

// Knockout ViewModel
cmis.vm = {};

cmis.vm.root = ko.observable();
cmis.vm.obj = ko.observable();
cmis.vm.path = ko.observable();
cmis.vm.pathElements = ko.observable();
cmis.vm.children = ko.observable(null);
cmis.vm.objcontent = ko.observable();
cmis.vm.tree = ko.observableArray();
cmis.vm.squery = ko.observable();
cmis.vm.sresults = ko.observable(null);
cmis.vm.searching = ko.observable(false);
cmis.vm.fetching = ko.observable(false);
cmis.vm.pageSize = ko.observable(50);

cmis.nextSearchPage = function(){
	cmis.search(cmis.vm.sresults().numItems);
}
cmis.nextChildrenPage = function(){
	cmis.vm.fetching(true);
	cmis.getChildren(cmis.repo.rootFolderUrl + cmis.vm.path(), function(data) {
		var res = cmis.vm.children();
		if (!_.isNull(res)){
			data.objects = _.union(res.objects(), data.objects);
		}
		cmis.vm.children(ko.mapping.fromJS(data));
		cmis.vm.fetching(false);
	},
	{maxItems:cmis.vm.pageSize(),
	skipCount:cmis.vm.children().objects().length});
}

cmis.vm.squery.subscribe(_.throttle(function(newValue){
	cmis.vm.sresults(null);
	if (_.isEmpty(newValue) || _.isUndefined(newValue)){
		newValue=null;
		cmis.vm.searching(false);
	} else if (newValue){
		cmis.search(0);
	} 
},500));

cmis.search = function(skipCount){
	cmis.vm.searching(true);
	cmis.query("select * from cmis:document where contains('ALL:"
		+ cmis.vm.squery() + "')", 
		function(data){
			var res = cmis.vm.sresults();
			if (!_.isNull(res)){
				data.results = _.union(res.results, data.results);
				data.numItems+=res.numItems;					
			}
			cmis.vm.sresults(data);
			cmis.vm.searching(false);
		},
	{maxItems:cmis.vm.pageSize(),
		skipCount: skipCount}
		);
}

// error handling
cmis.vm.alerts = ko.observableArray();

cmis.vm.removeAlert = function() {
	cmis.vm.alerts.remove(this);
};

cmis.vm.ajaxStatus = ko.observable('ok');

$(document).bind("ajaxSend", function() {
	cmis.vm.ajaxStatus('working');
}).bind("ajaxComplete", function() {
	cmis.vm.ajaxStatus('ok');
}).bind("ajaxError", function(event, response, request) {
	cmis.vm.ajaxStatus('error');
	cmis.vm.alerts.push({
		header: response.status + ' - ' + response.statusText,
		text: request.type + ": " + request.url,
		error: true
	});
});

//nav tree control
cmis.vm.toggleSubtree = function(item){
	item.expanded(!item.expanded());
	if (item.tree().length==0){
		cmis.getSubtree(item.objectId, item.tree);
	} else{
		item.tree.removeAll();
	}
};

//cmis methods
cmis.getObject = function(url, callback, params) {
	var p = params || {};
	p.cmisselector = 'object';
	$.getJSON(url + cmis.toQuery(p), callback);
};
cmis.getChildren = function(url, callback, params) {
	var p = params || {};
	p.cmisselector = 'children';
	$.getJSON(url + cmis.toQuery(p), callback);
};
cmis.getContent = function(url, callback, params) {
	var p = params || {};
	p.cmisselector = 'content';
	$.get(url + cmis.toQuery(p), callback);
};

cmis.getParentObjects = function(url, callback, params) {
	var p = params || {};
	p.cmisselector = 'parents';
	$.getJSON(url + cmis.toQuery(p), callback);
};


cmis.query = function(statement, callback, params) {
	var p = params || {};
	p.q = statement;
	p.cmisaction = 'query';
	$.post(cmis.repo.repositoryUrl, p, callback);
};

cmis.getSubtree = function(objectId, observableArray){
	cmis.query("select cmis:objectId, cmis:name, cmis:path from cmis:folder "+
		"where in_folder('"+objectId+"') order by cmis:name",
		function(data){
			for (var i = 0; i < data.numItems; i++) {
				var r = data.results[i];
				observableArray.push({objectId:r.properties['cmis:objectId'].value,
									name:r.properties['cmis:name'].value,
									path: r.properties['cmis:path'].value,
									tree: ko.observableArray(),
									expanded: ko.observable(false)
									});
			};
		});
};

cmis.toQuery = function(data) {
	var ret = [];
	for(var d in data)
	ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
	return '?' + ret.join("&");
};



// Sammyjs navigation
cmis.sammy = Sammy(function() {});

cmis.sammy.get(/#(.*)/, function() {
	var path = this.params['splat']+'';
	if (path.indexOf('workspace://')==0){
		cmis.getParentObjects(cmis.repo.rootFolderUrl,function(pdata){
			var parentPath = pdata[0].object.properties['cmis:path'].value;
			cmis.getObject(cmis.repo.rootFolderUrl,function(odata){
				var oname = odata.properties['cmis:name'].value;
				window.location.hash=parentPath+'/'+oname;
			},{objectId:path});
		},{objectId:path});
	} else {
		path = (path+'/').replace("//", "/");
		cmis.vm.path(path);
		cmis.vm.pathElements(path.split('/').slice(0,-1));
		cmis.getObject(cmis.repo.rootFolderUrl + path, function(data) {
			cmis.vm.obj(ko.mapping.fromJS(data));
			if(cmis.vm.obj().properties['cmis:baseTypeId'].value() == 'cmis:folder') {
				cmis.getChildren(cmis.repo.rootFolderUrl + path, function(data) {
					cmis.vm.children(ko.mapping.fromJS(data));
				},{maxItems:cmis.vm.pageSize()});
			} else {
				cmis.vm.children(null);
				if(cmis.vm.obj().properties['cmis:baseTypeId'].value() == 'cmis:document') {
					cmis.getContent(cmis.repo.rootFolderUrl + path, function(data) {
						cmis.vm.objcontent(data);
					});
				}
			}
		});
	}
});


cmis.sammy.get('', function() {
	window.location.hash = "/";
});
// various

cmis.readableFileSize = function (size) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while(size >= 1024) {
        size /= 1024;
        ++i;
    }
    return size.toFixed(1) + ' ' + units[i];
}


// init
$.getJSON('/alfresco/cmisbrowser', function(data) {
	cmis.cb = data;
	for(var repo in cmis.cb) {
		cmis.repo = cmis.cb[repo];
	}
	cmis.getObject(cmis.repo.rootFolderUrl, function(data) {
		cmis.vm.root(ko.mapping.fromJS(data));
		cmis.getSubtree(cmis.vm.root().properties['cmis:objectId'].value(), cmis.vm.tree);
	    ko.applyBindings(cmis.vm);
		cmis.sammy.run();
	});
});

