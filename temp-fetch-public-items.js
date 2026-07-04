const http = require('http');
http.get('http://localhost:3000/api/v1/public/items', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (err) {
      console.error('Parse error:', err.message);
      console.error(data);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
});
