cmis.toQuery = function(data) {
	var ret = [];
	for(var d in data){
		if (d=='cmisselector'){
			ret.push(encodeURIComponent('selector') + "=" + encodeURIComponent(data[d]));			
		} else{
			ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
		}
	}
	return '?' + ret.join("&");
};

cmis.search = function(skipCount){
	cmis.vm.searching(true);
	cmis.query("select * from cmis:document where contains('ALL:"
		+ cmis.vm.squery() + "')", 
		function(data){
			var res = cmis.vm.sresults();
			if (!_.isNull(res)){
				data.results = _.union(res.results, data.objects);
				data.numItems += data.objects.length;					
			} else{
				data.results = data.objects;
				data.numItems = data.objects.length
			}
			cmis.vm.sresults(data);
			cmis.vm.searching(false);
		},
	{maxItems:cmis.vm.pageSize(),
		skipCount: skipCount}
		);
}

cmis.getSubtree = function(objectId, observableArray){
	cmis.query("select cmis:objectId, cmis:name, cmis:path from cmis:folder "+
		"where in_folder('"+objectId+"') order by cmis:name",
		function(data){
			for (var i = 0; i < data.objects.length; i++) {
				var r = data.objects[i];
				observableArray.push({objectId:r.properties['cmis:objectId'].value,
									name:r.properties['cmis:name'].value,
									path: r.properties['cmis:path'].value,
									tree: ko.observableArray(),
									expanded: ko.observable(false)
									});
			};
		});
};
