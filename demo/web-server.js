const http = require('http');
const fs = require('fs');
const path = require('path');

const CONTENT_TYPE = {
  html: 'text/html',
  js: 'text/javascript',
  css: 'text/css',
};

http.createServer(function (req, res) {
  let fileName;
  switch (req.url) {
    case '/': {
      fileName = path.join(__dirname, 'index.html');
      break;
    }
    default: {
      fileName = path.join(__dirname, req.url);
    }
  }
  fs.readFile(fileName, (err, file) => {
    res.writeHead(file ? 200 : 404, {'Content-Type': CONTENT_TYPE[fileName.split('.').reverse()[0]] || 'text/plain'});
    res.write(file || 'not found');
    res.end();
  });

}).listen(8082);
