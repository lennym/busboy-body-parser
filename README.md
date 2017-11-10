# busboy-body-parser

Body parsing for multipart/form-data forms in Express.

It will add regular fields to req.body as per [body-parser](https://www.npmjs.org/package/body-parser) but will also add uploaded files to `req.files`.

## Install

`npm install busboy-body-parser`

## Usage

### Basic usage

```javascript
const busboyBodyParser = require('busboy-body-parser');
app.use(busboyBodyParser());
```

### Define a file-size limit

This is defined similarly to the `limit` option in [body-parser](https://www.npmjs.org/package/body-parser) but is applied to individual files rather than the total body size.

```javascript
const busboyBodyParser = require('busboy-body-parser');
app.use(busboyBodyParser({ limit: '5mb' }));
```

This limit can be defined as either a number of bytes, or any string supported by [bytes](https://www.npmjs.org/package/bytes) - eg. `'5mb'`, `'500kb'`.

### Uploading multiple files with the same key

The upload of multiple files with the same key is not enabled by default. If you wish to support this you will need to set the `multi` option to true.

```javascript
const busboyBodyParser = require('busboy-body-parser');
app.use(busboyBodyParser({ multi: true }));
```

_Important note_: if `multi` is set to true, then all `req.files[key]` will *always* be an array, irrespective of the nuber of files associated with that key.

## Output

The middleware will add files to `req.files` in the following form:

```
// req.files:
{
    fieldName: {
        data: Buffer("raw file data"),
        name: "upload.txt",
        encoding: "utf8",
        mimetype: "text/plain",
        truncated: false
    }
}
```

If a file has exceeded the file-size limit defined above it will have `data: null` and `truncated: true`:

```
// req.files:
{
    fieldName: {
        data: null,
        name: "largefile.txt",
        encoding: "utf8",
        mimetype: "text/plain",
        truncated: true
    }
}
```

If the `multi` property is set:

```
// req.files:
{
    fieldName: [{
        data: Buffer("raw file data"),
        name: "upload.txt",
        encoding: "utf8",
        mimetype: "text/plain",
        truncated: false
    }]
}
```

## Tests

`npm test`
