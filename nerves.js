/*global Backbone, _gaq, FB */

'use strict';

var Nerves = window.Nerves = {
  env: {},

  models: {},
  views: {},
  controllers: {},
  routers: {},
  
  common: {
    models: {},
    views: {},
    controllers: {},
    routers: {}
  },
  
  current: {
    models: [],
    views: [],
    controllers: []
  },
  
  load: '',
  
  pjaxVersion: $('meta[http-equiv="x-pjax-version"]').attr('content'),

  navigator: {},
  utils: {},
  preset: function() {},
  loadCommons: function() {},
  loadRouters: function(options) {
    var routerNames = Object.keys(this.routers),
        routerName;

    for (var i = 0; i < routerNames.length; i++) {
      routerName = routerNames[i];
      this.common.routers[routerName] = new this.routers[routerName]();
    }
    Backbone.history.start(options);
  }
};

Nerves.navigator.container = {
  before: function() {},
  after: function() {},
  
  // Navigator Container
  DOM: $('.pjax-container'),
  
  // innerHTML method
  render: function(data) {
    // Before innerHTML
    this.before();

    // Parse
    var pjaxTitle = $('<div>' + data + '</div>').find('pjax-title').text(),
        pjaxBody = $('<div>' + data + '</div>').find('pjax-body').html();
    
    // Reload when Pjax Hash has been changed
    if (pjaxTitle.length < 1 || pjaxBody.length < 1) {
      window.location.reload(true);
    }

    // Set Title
    if (pjaxTitle && $.trim(pjaxTitle).length > 0) {
      document.title = pjaxTitle;
    }

    // innerHTML
    this.DOM.html(pjaxBody);
    
    // Scroll Up
    window.scrollTo(0, 0);
    
    // After innerHTML
    this.after();
  }
};

Nerves.navigator.errorPages = {
  404: function() {},
  500: function() {}
};

Nerves.navigator.go = function(url, options) {
  // Default Options
  options = options || {};
  options.trigger = options.trigger || true;
  
  // url: '/foo' -> 'foo'
  var routingUrl = url
    .replace(/^\//, '')
    .replace('#', '')
    .replace('!', '')
    .replace('\/', '');
  
  // Navigate
  Backbone.history.navigate(routingUrl, {
    trigger: options.trigger
  });
};

Nerves.navigator.firstLoad = true;

Nerves.navigator.loadPjax = function(viewName, callback) {
  var Nerves = window.Nerves;

  // Fallback (no viewName given)
  if (typeof viewName === 'function') {
    callback = viewName;
  }

  // Remove Previous MVC Objects before apply new View
  this._reset();
  
  // Add View Function
  var _addView = function() {
    // viewName is given
    if (typeof viewName === 'string') {
      Nerves.current.views.push(
        new Nerves.views[viewName]({
          el: this.container.DOM.children().eq(0)
        })
      );
    }
  }.bind(this);

  // Do not Pjax on Initial Page
  if (this.firstLoad) {
    this.firstLoad = false;
    _addView();

    if (callback && typeof callback === 'function') {
      callback();
    }
  } else {
    // Fragment
    var url = location.pathname;

    // Google Analytics
    if (_gaq) {
      _gaq.push(['_trackPageview', url]);
    }

    $.ajax({
      type: 'GET',
      cache: false,
      url: url,
      statusCode: {
        404: this.errorPages[404],
        500: this.errorPages[500]
      },
      headers: {
        'x-pjax': 'true',
        'x-pjax-version': Nerves.pjaxVersion
      },
      success: function(data) {
        this.container.html(data);
        _addView();

        if (callback && typeof callback === 'function') {
          callback();
        }
      }.bind(this)
    });
  }
};

Nerves.navigator.reset = function() {};
Nerves.navgiator._reset = function() {
  var Nerves = window.Nerves,
    _Removal = function(obj) {
    if (obj && obj.remove) {
      obj.remove();
    }
    obj = null;
  };

  while (Nerves.current.models.length > 0) {
    _Removal(Nerves.current.models.pop());
  }
  while (Nerves.current.views.length > 0) {
    _Removal(Nerves.current.views.pop());
  }
  while (Nerves.current.controllers.length > 0) {
    _Removal(Nerves.current.controllers.pop());
  }

  // Remove Facebook SDK Events
  if (FB && FB.Event) {
    FB.Event.unsubscribe('auth.authResponseChange');
  }

  this.reset();
};

Nerves.init = function(options) {
  this.preset();
  this.loadCommons();
  
  if (options && options.router) {
    this.loadRouters(options.router);
  }

  if (options && options.container) {
    this.navigator.container.DOM = $(options.container);
  }

  // Init Current Route Action (For Hard Loaded page)
  this.navigator.go(location.pathname, { trigger: false });

  // Activate Navigator on <a> tags
  $(document).on('click', 'a[href^="/"]', function(e) {
    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      var href = $(e.currentTarget).attr('href');

      this.navigator.go(href);

      return false;
    }
  }.bind(this));

  if (options && options.run && typeof options.run === 'function') {
    options.run();
  }
};