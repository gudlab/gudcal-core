(function() {
  'use strict';

  var GUDCAL_BASE = 'https://gudcal.com';

  function GudCalEmbed(options) {
    this.username = options.username;
    this.eventSlug = options.eventSlug || null;
    this.target = options.target || null;
    this.theme = options.theme || 'auto';
    this.width = options.width || '100%';
    this.height = options.height || '700px';

    if (this.target) {
      this.render();
    }
  }

  GudCalEmbed.prototype.getUrl = function() {
    var url = GUDCAL_BASE + '/' + this.username;
    if (this.eventSlug) {
      url += '/' + this.eventSlug;
    }
    url += '?embed=true';
    if (this.theme !== 'auto') {
      url += '&theme=' + this.theme;
    }
    return url;
  };

  GudCalEmbed.prototype.render = function() {
    var container = typeof this.target === 'string'
      ? document.querySelector(this.target)
      : this.target;

    if (!container) {
      console.error('GudCal: Target element not found');
      return;
    }

    var iframe = document.createElement('iframe');
    iframe.src = this.getUrl();
    iframe.style.width = this.width;
    iframe.style.height = this.height;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'GudCal Booking');

    container.innerHTML = '';
    container.appendChild(iframe);
  };

  GudCalEmbed.prototype.popup = function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:white;border-radius:12px;width:90%;max-width:480px;height:80vh;max-height:700px;overflow:hidden;position:relative;';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;z-index:1;';
    closeBtn.onclick = function() { overlay.remove(); };

    var iframe = document.createElement('iframe');
    iframe.src = this.getUrl();
    iframe.style.cssText = 'width:100%;height:100%;border:none;';

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    overlay.onclick = function(e) {
      if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
  };

  // Auto-init from data attributes
  document.addEventListener('DOMContentLoaded', function() {
    var elements = document.querySelectorAll('[data-gudcal]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      new GudCalEmbed({
        username: el.getAttribute('data-gudcal'),
        eventSlug: el.getAttribute('data-event'),
        target: el,
        theme: el.getAttribute('data-theme') || 'auto',
      });
    }
  });

  window.GudCal = GudCalEmbed;
})();
