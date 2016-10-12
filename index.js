var Busboy = require('busboy'),
    bytes = require('bytes'),
    concat = require('concat-stream'),
    debug = require('debug')('busboy-body-parser');

module.exports = function (settings) {

    settings = settings || {};
    settings.limit = settings.limit || Math.Infinity;
    settings.multi = settings.multi || false;

    if (typeof settings.limit === 'string') {
        settings.limit = bytes(settings.limit);
    }

    return function multipartBodyParser(req, res, next) {

        if (req.is('multipart/form-data')) {
            var busboy;
            try {
                busboy = new Busboy({
                    headers: req.headers,
                    limits: {
                        fileSize: settings.limit
                    }
                });
            } catch (err) {
                return next(err);
            }
            busboy.on('field', function (key, value) {
                debug('Received field %s: %s', key, value);
                req.body[key] = value;
            });
            busboy.on('file', function (key, file, name, enc, mimetype) {
                file.pipe(concat(function (d) {
                    var fileData = {
                        data: file.truncated ? null : d,
                        name: name,
                        encoding: enc,
                        mimetype: mimetype,
                        truncated: file.truncated,
                        size: Buffer.byteLength(d.toString('binary'), 'binary')
                    };

                    debug('Received file %s', file);

                    if (settings.multi) {
                        req.files[key] = req.files[key] || [];
                        req.files[key].push(fileData);
                    } else {
                        req.files[key] = fileData;
                    }
                }));
            });
            var error;
            busboy.on('error', function (err) {
                debug('Error parsing form');
                debug(err);
                error = err;
                next(err);
            });
            busboy.on('finish', function () {
                if (error) { return; }
                debug('Finished form parsing');
                debug(req.body);
                next();
            });
            req.files = req.files || {};
            req.body = req.body || {};
            req.pipe(busboy);
        } else {
            next();
        }

    };

};
