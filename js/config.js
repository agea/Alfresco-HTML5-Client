var config = config || {};

config.pageSize = 50;

config.orders = [
	['cmis:name', 'Name'],
	['cmis:baseTypeId', 'Type'],
	['cmis:contentStreamLength', 'Size']
]

config.scripts = [
	"js/lib/jquery.min.js",
	"js/lib/knockout-2.2.0.js",
	"js/lib/koExternalTemplateEngine_all.min.js",
	"js/lib/sammy-latest.min.js",
	"js/lib/underscore-min.js",
	"js/lib/store.min.js",
	"css/bootstrap/js/bootstrap.min.js",
	"js/lib/knockout.mapping-latest.js",
	"js/cmisbrowser.js"];

if (window.btoa===undefined){
	config.scripts.push("js/lib/base64.min.js");
}


config.pdfjs = true;



config.viewers = {
	'application/pdf': function(obj) {
		var url = 'viewers/pdfjs/viewer.html?file=' +
			encodeURIComponent(cmis.contentURL( 
			cmis.vm.obj().properties['cmis:objectId'].value()));
		$('#docpreview iframe').attr('src', url);
		$('#docpreview').show();
	},
	'text/plain': function(obj){
		var url = cmis.repo.rootFolderUrl +
			'?cmisselector=content&objectId=' + 
			cmis.vm.obj().properties['cmis:objectId'].value();
		$('#docpreview iframe').attr('src', url);
		$('#docpreview').show();		
	}
}