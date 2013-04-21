var config = config || {};

config.pageSize = 50;

config.orders = [
	['cmis:name','Name'],
	['cmis:baseTypeId','Type'],
	['cmis:contentStreamLength','Size']
]

config.scripts=[
	"js/lib/jquery.min.js",
	"js/lib/knockout-2.2.0.js",
	"js/lib/sammy-latest.min.js",
	"js/lib/underscore-min.js",
	"js/lib/store.min.js",
	"css/bootstrap/js/bootstrap.min.js",
	"js/lib/knockout.mapping-latest.js",
	"js/cmisbrowser.js"
];

config.pdfjs = false;
