import Ember from "ember";

export default Ember.Object.extend(Ember.Evented, {
  url: null,
  socket: null,
  autoReconnect: true,
  connected: false,
  tries: 0,
  disconnectedAt: null,
  disconnectCb: null,

  connect: function() {
    var self = this;
    var socket = self.get('socket');
    if ( socket )
    {
      this.disconnect();
    }

    var url = this.get('url');
    // If the site is SSL, the WebSocket should be too...
    if ( window.location.protocol === 'https:' && url.indexOf('ws://') === 0 )
    {
      url = 'wss://' + url.substr(5);
    }

    console.log('Socket connect to',url);
    socket = new WebSocket(url);
    self.set('socket', socket);

    socket.onmessage = function(event) {
      Ember.run(function() {
        self.trigger('message',event);
      });
    };

    socket.onopen = function() {
      //console.log('Socket Open');
      var now = (new Date()).getTime();
      self.set('connected',true);

      var at = self.get('disconnectedAt');
      var after = null;
      if ( at )
      {
        after = now - at;
      }

      self.trigger('connected', self.get('tries'), after);
      self.set('tries',0);
      self.set('disconnectedAt', null);
    };

    socket.onclose = function() {
      //console.log('Socket Closed');
      var wasConnected = self.get('connected');

      self.set('connected',false);
      self.incrementProperty('tries');

      if ( self.get('disconnectedAt') === null )
      {
        self.set('disconnectedAt', (new Date()).getTime());
      }

      socket.close();
      if ( wasConnected && self.get('autoReconnect') )
      {
        var delay = Math.max(1000, Math.min(1000 * self.get('tries'), 30000));
        setTimeout(self.connect.bind(self), delay);
      }

      if ( self.get('disconnectCb') )
      {
        self.get('disconnectCb')();
      }
      else
      {
        self.trigger('disconnected', self.get('tries'));
      }
    };
  },

  disconnect: function(cb) {
    var self = this;
    //console.log('Socket disconnect');
    if ( !this.get('connected') )
    {
      if ( cb )
      {
        cb();
      }
      return;
    }

    this.set('connected', false);
    this.set('autoReconnect',false);
    if ( typeof cb === 'function' )
    {
      this.set('disconnectCb', cb);
    }

    var socket = this.get('socket');
    if ( socket )
    {
      try {
        socket.close();
        self.set('socket',null);
      }
      catch (e)
      {
        // Meh..
      }
    }
  }
});
