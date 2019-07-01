/* eslint-disable */
var upvoty = {
  debug: false,
  error: false,
  preventScrollEvent: false,
  boardHash: null,
  postHash: null,
  userHash: null,
  settings: {},
  iframe: null,
  counters: { send: 1, receive: 1 },
  eventListener: [],

  init: function (type, settings) {
    if (type == 'render') {
      upvoty.settings = this.setSettings(settings);
      if (upvoty.error) {
        console.log('Error initializing widget');
        return false;
      }
      //
      var is_safari = navigator.userAgent.indexOf("Safari") > -1;
      var is_chrome = navigator.userAgent.indexOf('Chrome') > -1;
      if ((is_chrome) && (is_safari)) { is_safari = false; }
      if (is_safari) {
        if (!document.cookie.match(/^(.*;)?\s*fixed\s*=\s*[^;]+(.*)?$/)) {
          document.cookie = 'fixed=fixed; expires=Tue, 19 Jan 2038 03:14:07 UTC; path=/';
          window.location.replace('https://' + upvoty.settings.baseUrl + '/widget-fix-iframe-3rd.html');
        }
        window.addEventListener('touchstart', {});
        window.addEventListener('touchend', {});
      }
      //
      var d = document.querySelectorAll('[data-upvoty]')[0];
      upvoty.iframe = document.createElement('iframe');
      //
      upvoty.iframe.name = 'ifr_upvoty';
      upvoty.iframe.width = '100%';
      upvoty.iframe.height = '800px';
      upvoty.iframe.id = 'upvoty-iframe';
      upvoty.iframe.allowtransparency = true;
      upvoty.iframe.style.border = '0';

      upvoty.settings.originHref = window.location.href;

      var fixedLayout = 'roadmap';

      if (upvoty.listeners()) {
        upvoty.iframe.referrerPolicy = 'origin';
        upvoty.iframe.src = 'https://' + upvoty.settings.baseUrl + '/front/iframe/'
        if (upvoty.settings.boardHash !== undefined) {
          upvoty.iframe.src += upvoty.settings.boardHash + '/';
          fixedLayout = 'board';
        }

        upvoty.iframe.src += '?fixedLayout=' + fixedLayout;
        if (upvoty.settings.ssoToken != undefined && upvoty.settings.ssoToken != null) {
          upvoty.iframe.src += '&loginMethod=sso';
        }

        d.appendChild(upvoty.iframe);
      }
    }
  },

  setSettings: function (settings) {
    if (settings.baseUrl == undefined) {
      upvoty.error = true;
      console.log('Error: baseUrl not set');
    }
    if (settings.offsetTop == undefined) {
      settings.offsetTop = 100;
    }
    return settings;
  },

  sendMessage: function (inputData) {
    if (upvoty.debug) console.log(['PARENT-SEND:' + upvoty.counters.send++, inputData]);
    upvoty.iframe.contentWindow.postMessage(JSON.stringify(inputData), '*');
  },

  bindEvent: function (element, eventName, eventHandler) {
    if (element.addEventListener) {
      element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
      element.attachEvent('on' + eventName, eventHandler);
    }
    upvoty.eventListener.push({
      eventName: element.addEventListener ? eventName : 'on' + eventName,
      element,
      eventHandler,
    });
  },

  destroy: function() {
    upvoty.eventListener.forEach(({ element, eventName, eventHandler }) => {
      if (element.removeEventListener) {
        element.removeEventListener(eventName, eventHandler);
        return;
      }
      element.detachEvent(eventName, eventHandler);
    });
  },

  listeners: function () {
    try {
      upvoty.bindEvent(window, 'message', function (e) {
        if (e.data !== undefined) {
          var inputData = {};
          try {
            inputData = JSON.parse(e.data);
            if (upvoty.debug) console.log(['PARENT-RECIEVE:' + upvoty.counters.receive++, [inputData.method, inputData]]);
            if (inputData.method == 'init') {
              var inputData = {
                'method': 'settings',
                data: upvoty.settings
              };
              upvoty.sendMessage(inputData);
            } else if (inputData.action == 'dimensions') {
              //upvoty.iframe.width = inputData.document.width;
              upvoty.iframe.height = inputData.document.height + 4;
            } else if (inputData.action == 'resetScroll') {
              if (!upvoty.preventScrollEvent) {
                upvoty.preventScrollEvent = true;
                if (window.scrollY > 0 && upvoty.iframe.getBoundingClientRect().top < 0) {
                  var gotoPos = ((window.scrollY > 0 && upvoty.iframe.getBoundingClientRect().top < 0) ? (upvoty.iframe.getBoundingClientRect().top + window.scrollY - upvoty.settings.offsetTop) : 0);
                  if (gotoPos > 0) {
                    window.scrollTo(0, gotoPos);
                  }
                }
                setTimeout(function () { upvoty.preventScrollEvent = false; }, 250);
              }
            } else if (inputData.action == 'doScroll') {
              if (!upvoty.preventScrollEvent) {
                upvoty.preventScrollEvent = true;
                var newTop = inputData.top;
                if (window.scrollY > 0 && ((newTop + upvoty.iframe.getBoundingClientRect().top) != window.scrollY)) {
                  var gotoPos = newTop + ((window.scrollY > 0 && upvoty.iframe.getBoundingClientRect().top < 0) ? (upvoty.iframe.getBoundingClientRect().top + window.scrollY - upvoty.settings.offsetTop) : 0);
                  if (gotoPos > 0) {
                    window.scrollTo(0, gotoPos);
                  }
                }
                setTimeout(function () { upvoty.preventScrollEvent = false; }, 250);
              }
            }
          } catch (e) { }
        }
      });
      upvoty.bindEvent(window, 'scroll', function (e) {
        if (!upvoty.preventScrollEvent) {
          upvoty.sendMessage({
            event: 'scrolled',
            offsetWindow: window.scrollY,
            offsetElement: upvoty.iframe.getBoundingClientRect().top + window.pageYOffset,
            endOfPage: (document.body.scrollHeight - window.scrollY) <= window.innerHeight,
          });
        }
      });
      upvoty.bindEvent(window, 'resize', function () {
        upvoty.sendMessage({ event: 'resized' });
      });
      upvoty.bindEvent(upvoty.iframe, 'load', function () {
        upvoty.sendMessage({ event: 'loaded' });
      });
      //
      return true;
    } catch (e) { }
    return false;
  }
};