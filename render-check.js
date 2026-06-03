const https = require('https');
const fs = require('fs');
const [apiKey, method = 'GET', path = '/v1/services', bodyJsonOrPath] = process.argv.slice(2);
if (!apiKey) {
  console.error('MISSING_API_KEY');
  process.exit(1);
}
let body = null;
if (bodyJsonOrPath) {
  if (bodyJsonOrPath.startsWith('@')) {
    const filePath = bodyJsonOrPath.slice(1);
    body = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    body = JSON.parse(bodyJsonOrPath);
  }
}
const options = {
  hostname: 'api.render.com',
  path,
  method,
  headers: {
    Authorization: 'Bearer ' + apiKey,
    Accept: 'application/json'
  }
};
const doRequest = requestBody => {
  if (requestBody) {
    const json = JSON.stringify(requestBody);
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(json);
  }
  const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(res.statusCode);
      console.log(data);
    });
  });
  req.on('error', e => {
    console.error('ERR', e.message);
  });
  if (requestBody) req.write(JSON.stringify(requestBody));
  req.end();
};

doRequest(body);
