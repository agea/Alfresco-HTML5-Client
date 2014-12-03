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
cmis.vm.pageSize = ko.observable(config.pageSize);
cmis.vm.order = ko.observable(config.orders[0]);
cmis.vm.orderDir = ko.observable('asc');
cmis.vm.loggedIn = ko.observable(false);
cmis.vm.ticket = ko.observable();
cmis.vm.username = ko.observable(store.get('username'));
cmis.vm.password = ko.observable(store.get('password'));
cmis.vm.rememberMe = ko.observable(store.get('rememberMe'));
cmis.vm.autoLogin = ko.observable(store.get('autoLogin'));
cmis.vm.pdfjs = ko.observable(config.pdfjs);

cmis.vm.orderDir.subscribe(function (newValue) {
  cmis.loadPage();
});
cmis.vm.order.subscribe(function (newValue) {
  cmis.loadPage();
});

cmis.vm.ticket.subscribe(function (ticket) {
  var encode = window.btoa || Base64.encode;
  $.ajaxSetup({
    beforeSend: function (jqXHR, settings) {
      var auth = "Basic " + encode('ROLE_TICKET:' + ticket);
      jqXHR.setRequestHeader("Authorization", auth);
    }
  });
});


cmis.switchOrderDir = function () {
  if (cmis.vm.orderDir() == 'asc') {
    cmis.vm.orderDir('desc');
  } else {
    cmis.vm.orderDir('asc');
  }
}

cmis.tnURL = function (objectId, name) {
  return "/alfresco/service/api/node/" + objectId.replace(':/', '').split(";")[0] +
    "/content/thumbnails/" + name + "?c=queue&ph=true&alf_ticket=" + cmis.vm.ticket();
}

cmis.contentURL = function (object, inline) {
  if (_.isFunction(object)) {
    object = object();
  }
  var id = object.properties['cmis:objectId'].value;
  if (_.isFunction(id)) {
    id = id()
  }
  var name = object.properties['cmis:name'].value;
  if (_.isFunction(name)) {
    name = name()
  }

  var url = '/alfresco/s/slingshot/node/content/' + id.replace(':/', '').split(";")[0];

  url += "/" + name + "?";

  if (inline != true) {
    url += 'a=true&';
  }

  url += "ticket=" + cmis.vm.ticket();
  return url;
}


cmis.nextSearchPage = function () {
  cmis.search(cmis.vm.sresults().numItems);
}
cmis.nextChildrenPage = function () {
  cmis.vm.fetching(true);
  cmis.getChildren(cmis.repo.rootFolderUrl + cmis.vm.path(), function (data) {
    var res = cmis.vm.children();
    if (!_.isNull(res)) {
      data.objects = _.union(res.objects(), data.objects);
    }
    cmis.vm.children(ko.mapping.fromJS(data));
    cmis.vm.fetching(false);
  }, {
    maxItems: cmis.vm.pageSize(),
    skipCount: cmis.vm.children().objects().length
  });
}

cmis.vm.squery.subscribe(_.throttle(function (newValue) {
  cmis.vm.sresults(null);
  if (_.isEmpty(newValue) || _.isUndefined(newValue)) {
    newValue = null;
    cmis.vm.searching(false);
  } else if (newValue) {
    cmis.search(0);
  }
}, 500));

cmis.search = function (skipCount) {
  cmis.vm.searching(true);
  cmis.query("select * from cmis:document where contains('ALL:" + cmis.vm.squery() + "')",
    function (data) {
      var res = cmis.vm.sresults();
      if (!_.isNull(res)) {
        data.results = _.union(res.results, data.results);
        data.numItems += res.numItems;
      }
      cmis.vm.sresults(data);
      cmis.vm.searching(false);
    }, {
      maxItems: cmis.vm.pageSize(),
      skipCount: skipCount
    }
  );
}

// error handling
cmis.vm.alerts = ko.observableArray();

cmis.vm.removeAlert = function () {
  cmis.vm.alerts.remove(this);
};

cmis.vm.ajaxStatus = ko.observable('ok');

$(document).bind("ajaxSend", function () {
  cmis.vm.ajaxStatus('working');
}).bind("ajaxComplete", function () {
  cmis.vm.ajaxStatus('ok');
}).bind("ajaxError", function (event, response, request) {
  cmis.vm.ajaxStatus('error');
  cmis.vm.alerts.push({
    header: response.status + ' - ' + response.statusText,
    text: request.type + ": " + request.url,
    error: true
  });
});

//nav tree control
cmis.vm.toggleSubtree = function (item) {
  item.expanded(!item.expanded());
  if (item.tree().length == 0) {
    cmis.getSubtree(item.objectId, item.tree);
  } else {
    item.tree.removeAll();
  }
};

//cmis methods
cmis.getObject = function (url, callback, params) {
  var p = params || {};
  p.cmisselector = 'object';
  $.getJSON(url + cmis.toQuery(p), callback);
};
cmis.getChildren = function (url, callback, params) {
  var p = params || {};
  p.cmisselector = 'children';
  p.orderby = cmis.vm.order()[0] + ' ' + cmis.vm.orderDir();
  $.getJSON(url + cmis.toQuery(p), callback);
};
cmis.getContent = function (url, callback, params) {
  var p = params || {};
  p.cmisselector = 'content';
  $.get(url + cmis.toQuery(p), callback);
};

cmis.getParentObjects = function (url, callback, params) {
  var p = params || {};
  p.cmisselector = 'parents';
  $.getJSON(url + cmis.toQuery(p), callback);
};

cmis.query = function (statement, callback, params) {
  var p = params || {};
  p.q = statement;
  p.cmisaction = 'query';
  $.post(cmis.repo.repositoryUrl, p, callback);
};

cmis.updateProperties = function (url, objectId, properties, callback) {
  data = {
    cmisaction: 'update',
    objectId: objectId
  }
  var i = 0;
  for (var id in properties) {
    data['propertyId[' + i + ']'] = id;
    data['propertyValue[' + i + ']'] = properties[id];
    i++;
  }
  $.post(url, data, callback);
};

cmis.getSubtree = function (objectId, observableArray) {
  cmis.query("select cmis:objectId, cmis:name, cmis:path from cmis:folder " +
    "where in_folder('" + objectId + "') order by cmis:name",
    function (data) {
      for (var i = 0; i < data.numItems; i++) {
        var r = data.results[i];
        observableArray.push({
          objectId: r.properties['cmis:objectId'].value,
          name: r.properties['cmis:name'].value,
          path: r.properties['cmis:path'].value,
          tree: ko.observableArray(),
          expanded: ko.observable(false)
        });
      };
    });
};

cmis.toQuery = function (data) {
  var ret = [];
  for (var d in data)
    ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
  return '?' + ret.join("&");
};


cmis.loadPage = function () {
  cmis.getObject(cmis.repo.rootFolderUrl + cmis.vm.path(), function (data) {
    cmis.vm.obj(ko.mapping.fromJS(data));
    if (cmis.vm.obj().properties['cmis:baseTypeId'].value() == 'cmis:folder') {
      cmis.getChildren(cmis.repo.rootFolderUrl + cmis.vm.path(), function (data) {
        cmis.vm.children(ko.mapping.fromJS(data));
      }, {
        maxItems: cmis.vm.pageSize()
      });
    } else {
      cmis.vm.children(null);
      if (cmis.vm.obj().properties['cmis:baseTypeId'].value() == 'cmis:document') {
        cmis.getContent(cmis.repo.rootFolderUrl + cmis.vm.path(), function (data) {
          cmis.vm.objcontent(data);
        });
      }
    }
  });
};

// Sammyjs navigation
cmis.sammy = Sammy(function () {});

cmis.sammy.get(/#(.*)/, function () {
  if (!cmis.vm.loggedIn()) {
    return;
  }
  var path = this.params['splat'] + '';
  if (path.indexOf('workspace://') == 0) {
    cmis.getParentObjects(cmis.repo.rootFolderUrl, function (pdata) {
      var parentPath = pdata[0].object.properties['cmis:path'].value;
      cmis.getObject(cmis.repo.rootFolderUrl, function (odata) {
        var oname = odata.properties['cmis:name'].value;
        window.location.hash = parentPath + '/' + oname;
      }, {
        objectId: path
      });
    }, {
      objectId: path
    });
  } else {
    path = (path + '/').replace("//", "/");
    cmis.vm.path(path);
    cmis.vm.pathElements(path.split('/').slice(0, -1));
    cmis.loadPage();
  }
});

cmis.sammy.get('', function () {
  window.location.hash = "/";
});
// various

cmis.loginOnReturn = function (e) {
  if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
    $('#loginButton').click();
    return false;
  } else {
    return true;
  }
};

cmis.vm.orders = function () {
  return config.orders;
}

cmis.readableFileSize = function (size) {
  if (!_.isNumber(size)) {
    return '-';
  }
  var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var i = 0;
  while (size >= 1024) {
    size /= 1024;
    ++i;
  }
  return size.toFixed(1) + ' ' + units[i];
};

cmis.logout = function () {
  cmis.vm.loggedIn(false);
  $.ajaxSetup({
    username: null,
    password: null
  });
};

cmis.loadRoot = function () {
  cmis.getObject(cmis.repo.rootFolderUrl, function (data) {
    cmis.vm.root(ko.mapping.fromJS(data));
    cmis.vm.tree.removeAll();
    cmis.getSubtree(cmis.repo.rootFolderId, cmis.vm.tree);
    cmis.sammy.run();
    $('.container-fluid').show();
    $('.init').hide();
  });
};

cmis.login = function () {

  $.ajax({
    url: '/alfresco/service/api/login',

    data: JSON.stringify({
      username: cmis.vm.username(),
      password: cmis.vm.password()
    }),

    contentType: 'application/json',
    type: 'POST',
    dataType: 'json',

    success: function (data) {
      cmis.vm.ticket(data.data.ticket);

      if (cmis.vm.rememberMe()) {
        store.set('username', cmis.vm.username());
        store.set('password', cmis.vm.password());
        store.set('rememberMe', cmis.vm.rememberMe());
        store.set('autoLogin', cmis.vm.autoLogin());
      } else {
        store.set('username', null);
        store.set('password', null);
        store.set('rememberMe', false);
        store.set('autoLogin', false);
      }

      // init
      $.getJSON('/alfresco/cmisbrowser', function (data) {
        cmis.vm.loggedIn(true);
        cmis.cb = data;
        for (var repo in cmis.cb) {
          cmis.repo = cmis.cb[repo];
        }
        if (parseFloat(cmis.repo.productVersion) < 4.2) {
          head.js(config.compat40, function () {
            cmis.loadRoot();
          });
        } else {
          cmis.loadRoot();
        }
      });

    }
  })

};

cmis.preview = function (obj) {
  var v = config.viewers[obj().properties['cmis:contentStreamMimeType'].value()];
  if (!_.isUndefined(v)) {
    return v;
  }
  return false;
}

infuser.defaults.ajax.cache = false;

ko.applyBindings(cmis.vm);
if (cmis.vm.autoLogin()) {
  cmis.login();
} else {
  $('.container-fluid').show();
  $('.init').hide();
}