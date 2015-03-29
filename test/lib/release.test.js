var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

var Release = require('../../lib/release');

lab.experiment('Release', function() {

  lab.test('constructor', function(done) {
    var name = '3.4.5';
    var archive = 'http://example.com/release.zip';

    var release = new Release({
      name: name,
      archive: archive
    });

    expect(release).to.be.an.instanceof(Release);
    expect(release.name).to.equal(name);
    expect(release.archive).to.equal(archive);
    expect(release.state).to.equal(Release.states.PENDING);
    expect(release.created).to.be.an.instanceof(Date);
    expect(release.updated).to.be.an.instanceof(Date);
    done();
  });

  lab.test('constructor - no options', function(done) {
    var throws = function() {
      return new Release();
    };
    expect(throws).to.throw(Error, 'Missing options');
    done();
  });

  lab.test('constructor - no name', function(done) {
    var throws = function() {
      return new Release({archive: 'foo'});
    };
    expect(throws).to.throw(Error, 'Missing name property');
    done();
  });

  lab.test('constructor - no archive', function(done) {
    var throws = function() {
      return new Release({name: 'foo'});
    };
    expect(throws).to.throw(Error, 'Missing archive property');
    done();
  });

  lab.test('Release.fromString()', function(done) {
    var name = '1.2.3';
    var archive = 'http://example.com/release.zip';
    var state = Release.states.COMPLETE;
    var created = 10;
    var updated = 20;
    var str = JSON.stringify({
      name: name,
      archive: archive,
      state: state,
      created: created,
      updated: updated
    });

    var release = Release.fromString(str);
    expect(release).to.be.an.instanceof(Release);
    expect(release.name).to.equal(name);
    expect(release.archive).to.equal(archive);
    expect(release.state).to.equal(state);
    expect(release.created).to.be.an.instanceof(Date);
    expect(release.created.getTime()).to.equal(created);
    expect(release.updated).to.be.an.instanceof(Date);
    expect(release.updated.getTime()).to.equal(updated);

    done();
  });

});
