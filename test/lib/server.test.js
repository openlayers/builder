var path = require('path');

var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

var config = require('../../lib/config');
var server = require('../../lib/server');

lab.experiment('server', function() {

  var releaseRoot;
  lab.before(function(done) {
    releaseRoot = config.releaseRoot;
    config.releaseRoot = path.join(__dirname, '..', 'fixtures', 'releases');
    done();
  });

  lab.after(function(done) {
    config.releaseRoot = releaseRoot;
    done();
  });

  lab.test('GET / includes CORS headers', function(done) {
    var options = {
      method: 'GET',
      url: server.lookup('root').path
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
      url: server.lookup('root').path
    };

    server.inject(options, function(response) {
      expect(response.statusCode).to.equal(302);
      expect(response.headers.location).to.equal(
          server.lookup('releases').path);
      done();
    });
  });

  lab.test('GET /releases/', function(done) {
    var options = {
      method: 'GET',
      url: server.lookup('releases').path
    };

    server.inject(options, function(response) {
      var result = response.result;
      expect(response.statusCode).to.equal(200);
      expect(result).to.include('releases');
      expect(result.releases).to.be.instanceof(Array);
      expect(result.releases).to.have.length(1);
      expect(result.releases[0]).to.include('name');
      expect(result.releases[0].name).to.equal('1.2.3');
      var link = server.info.uri +
          server.lookup('release').path.replace('{name}', '1.2.3');
      expect(result.releases[0].link).to.equal(link);
      done();
    });
  });

  lab.test('GET /releases/1.2.3', function(done) {
    var name = '1.2.3';
    var options = {
      method: 'GET',
      url: server.lookup('release').path.replace('{name}', name)
    };

    server.inject(options, function(response) {
      var result = response.result;
      expect(response.statusCode).to.equal(200);
      expect(result).to.include('release');
      expect(result.release).to.include('name');
      expect(result.release.name).to.equal(name);
      done();
    });
  });

  lab.test('POST /releases/1.2.3/build - invalid payload', function(done) {
    var name = '1.2.3';
    var options = {
      method: 'POST',
      url: server.lookup('trigger-build').path.replace('{name}', name),
      payload: {
        foo: 'bar'
      }
    };

    server.inject(options, function(response) {
      var result = response.result;
      expect(response.statusCode).to.equal(400);
      expect(result).to.include('message');
      expect(result.message).to.equal('"foo" is not allowed');
      done();
    });
  });

});
