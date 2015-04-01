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
          server.lookup('release').path.replace('{release}', '1.2.3');
      expect(result.releases[0].link).to.equal(link);
      done();
    });
  });

  lab.test('GET /releases/1.2.3', function(done) {
    var name = '1.2.3';
    var options = {
      method: 'GET',
      url: server.lookup('release').path.replace('{release}', name)
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

  lab.test('POST /jobs/1.2.3/ - invalid payload', function(done) {
    var name = '1.2.3';
    var options = {
      method: 'POST',
      url: server.lookup('new-job').path.replace('{release}', name),
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
