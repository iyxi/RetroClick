const http = require('http');

const postData = JSON.stringify({
    email: 'admin@retroclick.com',
    password: 'Admin@123'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n✓ Login API Response:');
        console.log('========================');
        console.log(JSON.stringify(JSON.parse(data), null, 2));
        console.log('========================\n');
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
    process.exit(1);
});

req.write(postData);
req.end();
