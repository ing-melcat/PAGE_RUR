const http = require('http');

async function test() {
    const loginRes = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula: 'a', password: 'a' })
    });
    const loginData = await loginRes.json();
    console.log("Login:", loginData.success);

    const robotsRes = await fetch('http://localhost:3001/api/robots', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    console.log("Status:", robotsRes.status);
    const robotsData = await robotsRes.text();
    console.log("Data:", robotsData);
}

test();
