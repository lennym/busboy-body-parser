const app = require('express')();
const path = require('path');
const fs = require('fs');

app.use(require('../')({ limit: '250mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, './index.html'));
});

app.post('/', (req, res) => {
  if (req.files.test && req.files.test.name) {
    res.type(req.files.test.mimetype);
    res.send(req.files.test.data);
  } else {
    res.json(req.files);
  }
});

app.listen(3001);
