var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

var server = require('../../lib/server');

lab.experiment('server', function() {

  lab.test('GET / includes CORS headers', function(done) {
    var options = {
      method: 'GET',
      url: '/'
    };

    server.inject(options, function(response) {
      var headers = response.headers;
      expect(headers['access-control-allow-origin']).to.equal('*');
      done();
    });
  });

  lab.test('GET / redirects to /releases/', function(done) {
    var options = {
      method: 'GET',
      url: '/'
    };

    server.inject(options, function(response) {
      expect(response.statusCode).to.equal(302);
      expect(response.headers.location).to.equal(
          server.lookup('releases').path);
      done();
    });
  });

});
