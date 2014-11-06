# busboy-body-parser

Body parsing for multipart/form-data forms in Express.

It will add regular fields to req.body as per [body-parser](https://www.npmjs.org/package/body-parser) but will also add uploaded files to `req.files`.

## Install

`npm install busboy-body-parser`

## Usage

### Basic usage

```javascript
var busboyBodyParser = require('busboy-body-parser');
app.use(busboyBodyParser());
```

### Define a file-size limit

This is defined similarly to the `limit` option in [body-parser](https://www.npmjs.org/package/body-parser) but is applied to individual files rather than the total body size.

```javascript
var busboyBodyParser = require('busboy-body-parser');
app.use(busboyBodyParser({ limit: '5mb' }));
```

This limit can be defined as either a number of bytes, or any string supported by [bytes](https://www.npmjs.org/package/bytes) - eg. `'5mb'`, `'500kb'`.

## Output

The middleware will add files to `req.files` in the following form:

```
// req.files:
{
    fieldName: {
        data: "raw file data",
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

## Tests

`npm test`
