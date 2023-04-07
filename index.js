var Busboy = require('busboy'),
    bytes = require('bytes'),
    bl = require('bl'),
    debug = require('debug')('busboy-body-parser');

var HARDLIMIT = bytes('250mb');

/**
 * @description Returns middleware for parsing multipart/form-data bodies. 
 * Uploaded files are added to req.files while other fields are simply added to req.body.
 * @example <caption>Example usage that limits file sizes to 3 megabytes:</caption>
 * const formParser = require('busboy-body-parser'); 
 * const app = require('express')();
 * 
 * app.use(formParser({ limit: '3mb' }));
 */
module.exports = function (settings) {

    settings = settings || {};
    settings.limit = settings.limit || HARDLIMIT;
    settings.multi = settings.multi || false;

    if (typeof settings.limit === 'string') {
        settings.limit = bytes(settings.limit);
    }

    if (settings.limit > HARDLIMIT) {
        console.error('WARNING: busboy-body-parser file size limit set too high');
        console.error('busboy-body-parser can only handle files up to ' + HARDLIMIT + ' bytes');
        console.error('to handle larger files you should use a streaming solution.');
        settings.limit = HARDLIMIT;
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
                file.pipe(bl(function (err, d) {
                    if (err || !(d.length || name)) { return; }
                    var fileData = {
                        data: file.truncated ? null : d,
                        name: name || null,
                        encoding: enc,
                        mimetype: mimetype,
                        truncated: file.truncated,
                        size: file.truncated ? null : Buffer.byteLength(d, 'binary')
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
