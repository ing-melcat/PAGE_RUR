import { Room } from 'livekit-client';

async function test() {
    // 1. Get token from backend
    const loginRes = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula: '2403150025', password: '6181631418ANNA' })
    });
    const loginData = await loginRes.json();
    console.log("Login Token:", loginData.token ? "OK" : "FAIL");

    const tokenRes = await fetch('http://localhost:3001/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loginData.token}` },
        body: JSON.stringify({ robotId: 'rassor-1' })
    });
    const tokenData = await tokenRes.json();
    console.log("LiveKit Token:", tokenData.success ? "OK" : tokenData.message);

    if (tokenData.success) {
        const room = new Room();
        await room.connect(tokenData.livekitUrl, tokenData.token);
        console.log("Connected to room:", room.name);
        console.log("Participants size:", room.participants.size);
        for (const [sid, participant] of room.participants) {
            console.log(`- Participant: ${participant.identity}`);
        }
        room.disconnect();
    }
}
test();
