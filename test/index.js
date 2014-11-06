var bodyparser = require('../index');

var chai = require('chai');

global.should = chai.should();
global.expect = chai.expect;
global.sinon = require('sinon');
chai.use(require('sinon-chai'));

var Busboy = require('busboy');

describe('multipart form parser', function () {

    var parser, req, res, next;

    beforeEach(function () {
        parser = bodyparser();
        req = {
            headers: {
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryHsAjApiShDrW2RCB',
            },
            is: sinon.stub().returns(true),
            pipe: sinon.stub()
        };
        res = {};
        next = sinon.stub();
        sinon.stub(Busboy.prototype, 'on');
    });

    afterEach(function () {
        Busboy.prototype.on.restore();
    });

    it('calls callback immediately if not a multipart form', function () {
        req.is.returns(false);
        parser(req, res, next);
        next.should.have.been.calledOnce;
        next.should.have.been.calledWithExactly();
    });

    it('pipes the request to a busboy instance', function () {
        parser(req, res, next);
        req.pipe.should.have.been.calledOnce;
        req.pipe.args[0][0].should.be.an.instanceOf(Busboy);
    });

   it('creates req.body and req.files as empty objects if they does not exist', function (done) {
        Busboy.prototype.on.withArgs('finish').yieldsAsync();
        parser(req, res, function () {
            req.body.should.eql({});
            req.files.should.eql({});
            done();
        });
    });

    it('sets fields on req.body', function (done) {
        Busboy.prototype.on.withArgs('field').yieldsAsync('key', 'value');
        Busboy.prototype.on.withArgs('finish').yieldsAsync();
        parser(req, res, function () {
            req.body.should.eql({
                key: 'value'
            });
            done();
        });
    });

    it('sets files on req.files', function (done) {
        var file = {
            pipe: function (s) {
                s.end('abc123');
                // ensure 'finish' event fires after files are processed
                process.nextTick(Busboy.prototype.on.withArgs('finish').args[0][1]);
            },
            truncated: false
        };
        Busboy.prototype.on.withArgs('file').yieldsAsync('key', file, 'test.jpg', 'binary', 'image/jpeg');
        parser(req, res, function () {
            req.files.should.have.property('key');
            req.files.key.should.eql({
                data: 'abc123',
                name: 'test.jpg',
                encoding: 'binary',
                mimetype: 'image/jpeg',
                truncated: false
            });
            done();
        });
    });

    it('sets truncated property and null data if file exceeds maximum size limit', function (done) {
        var file = {
            pipe: function (s) {
                s.end('abc123');
                // ensure 'finish' event fires after files are processed
                process.nextTick(Busboy.prototype.on.withArgs('finish').args[0][1]);
            },
            truncated: true
        };
        Busboy.prototype.on.withArgs('file').yieldsAsync('key', file, 'test.jpg', 'binary', 'image/jpeg');
        parser(req, res, function () {
            req.files.should.have.property('key');
            req.files.key.should.eql({
                data: null,
                name: 'test.jpg',
                encoding: 'binary',
                mimetype: 'image/jpeg',
                truncated: true
            });
            done();
        });
    });

});
