var path = require('path');

var lab = exports.lab = require('lab').script();
var expect = require('code').expect;

var Release = require('../../lib/release');
var config = require('../../lib/config');

lab.experiment('new Release()', function() {

  lab.test('creating a new release', function(done) {
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

  lab.test('missing options', function(done) {
    var throws = function() {
      return new Release();
    };
    expect(throws).to.throw(Error, 'Missing options');
    done();
  });

  lab.test('missing name', function(done) {
    var throws = function() {
      return new Release({archive: 'foo'});
    };
    expect(throws).to.throw(Error, 'Missing name property');
    done();
  });

  lab.test('missing archive', function(done) {
    var throws = function() {
      return new Release({name: 'foo'});
    };
    expect(throws).to.throw(Error, 'Missing archive property');
    done();
  });

});

lab.experiment('Release.all()', function() {

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

  lab.test('finding all releases', function(done) {
    Release.all(function(err, releases) {
      if (err) {
        done(err);
        return;
      }
      expect(releases).to.be.an.array();
      expect(releases).to.have.length(1);
      done();
    });
  });

});

lab.experiment('Release.find()', function() {

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

  lab.test('finding releases by name', function(done) {
    var name = '1.2.3';
    Release.find({name: name}, function(err, releases) {
      if (err) {
        done(err);
        return;
      }
      expect(releases).to.be.an.array();
      expect(releases).to.have.length(1);
      done();
    });
  });

  lab.test('bogus release name', function(done) {
    Release.find({name: 'bogus'}, function(err, releases) {
      if (err) {
        done(err);
        return;
      }
      expect(releases).to.be.an.array();
      expect(releases).to.have.length(0);
      done();
    });
  });

});

lab.experiment('Release.findOne()', function() {

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

  lab.test('finding a single release', function(done) {
    var name = '1.2.3';
    Release.findOne({name: name}, function(err, release) {
      if (err) {
        done(err);
        return;
      }
      expect(release).to.be.an.instanceof(Release);
      expect(release.name).to.equal(name);
      done();
    });
  });

  lab.test('no results', function(done) {
    var name = 'bogus';
    Release.findOne({name: name}, function(err, release) {
      if (err) {
        done(err);
        return;
      }
      expect(release).to.be.null();
      done();
    });
  });

});

lab.experiment('Release.fromString()', function() {

  lab.test('creating a new release', function(done) {
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
