const fs = require('fs');

async function test() {
    try {
        const res = await fetch('http://localhost:3001/api/livekit-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Assuming we don't have a valid auth token, it should return 401 Unauthorized
                // Or maybe the verifyToken middleware allows it if it's missing?
                // Let's see what it does.
            },
            body: JSON.stringify({ robotId: 'rassor-1' })
        });
        
        console.log("Status:", res.status);
        console.log("Headers:", res.headers.get('content-type'));
        
        const text = await res.text();
        console.log("Response:", text);
    } catch(e) {
        console.error(e);
    }
}
test();
