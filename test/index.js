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

    it('handles a busboy error if the payload is invalid', function (done) {
        var busboyError = new Error('busboy error');
        Busboy.prototype.on.withArgs('error').yieldsAsync(busboyError);
        parser(req, res, function (err) {
            err.should.equal(busboyError);
            done();
        });
    });

    it('handles a busboy error if the headers are invalid', function (done) {
        req.headers = {
            'content-type': 'multipart/form-data',
        };
        parser(req, res, function (err) {
            err.should.be.instanceOf(Error);
            done();
        });
    });

    it('creates req.body and req.files as empty objects if they do not exist', function (done) {
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
                data: Buffer('abc123'),
                name: 'test.jpg',
                encoding: 'binary',
                mimetype: 'image/jpeg',
                size: 6,
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
                size: null,
                truncated: true
            });
            done();
        });
    });

    it('sets files as an array to handle multiple attachments', function (done) {
        var file = {
                pipe: function (s) {
                    s.end('abc123');
                    Busboy.prototype.on.withArgs('file').args[0][1]('key', file2, 'test2.jpg', 'binary', 'image/jpeg');
                },
                truncated: false
            },
            file2 = {
                pipe: function (s) {
                    s.end('xyz789');
                    // ensure 'finish' event fires after files are processed
                    process.nextTick(Busboy.prototype.on.withArgs('finish').args[0][1]);
                },
                truncated: false
            };

        parser = bodyparser({multi: true});
        Busboy.prototype.on.withArgs('file').yieldsAsync('key', file, 'test.jpg', 'binary', 'image/jpeg');
        parser(req, res, function () {
            req.files.should.have.property('key');
            req.files.key.should.length(2);
            req.files.key[0].should.eql({
                data: Buffer('abc123'),
                name: 'test.jpg',
                encoding: 'binary',
                mimetype: 'image/jpeg',
                size: 6,
                truncated: false
            });
            req.files.key[1].should.eql({
                data: Buffer('xyz789'),
                name: 'test2.jpg',
                encoding: 'binary',
                mimetype: 'image/jpeg',
                size: 6,
                truncated: false
            });

            done();
        });
    });

    it('can handle empty payloads', function (done) {
        var file = {
            pipe: function (s) {
                s.end();
                // ensure 'finish' event fires after files are processed
                process.nextTick(Busboy.prototype.on.withArgs('finish').args[0][1]);
            },
            truncated: false
        };
        Busboy.prototype.on.withArgs('file').yieldsAsync('key', file, '', '7bit', 'application/octet-stream');
        parser(req, res, function () {
            req.files.should.eql({});
            done();
        });
    });

    it('can handle empty files', function (done) {
        var file = {
            pipe: function (s) {
                s.end();
                // ensure 'finish' event fires after files are processed
                process.nextTick(Busboy.prototype.on.withArgs('finish').args[0][1]);
            },
            truncated: false
        };
        Busboy.prototype.on.withArgs('file').yieldsAsync('key', file, 'test.jpg', 'binary', 'image/jpeg');
        parser(req, res, function () {
            req.files.should.have.property('key');
            req.files.key.should.eql({
                data: Buffer(''),
                name: 'test.jpg',
                encoding: 'binary',
                mimetype: 'image/jpeg',
                size: 0,
                truncated: false
            });
            done();
        });
    });

    it('can handle files without a name', function (done) {
        var file = {
            pipe: function (s) {
                s.end('abc123');
                // ensure 'finish' event fires after files are processed
                process.nextTick(Busboy.prototype.on.withArgs('finish').args[0][1]);
            },
            truncated: true
        };
        Busboy.prototype.on.withArgs('file').yieldsAsync('key', file, undefined, '7bit', 'application/octet-stream');
        parser(req, res, function () {
            req.files.should.have.property('key');
            req.files.key.should.eql({
                data: null,
                name: null,
                encoding: '7bit',
                mimetype: 'application/octet-stream',
                size: null,
                truncated: true
            });
            done();
        });
    });

});
