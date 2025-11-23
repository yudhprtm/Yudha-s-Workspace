const BASE_URL = 'http://localhost:3000/api';

async function test() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'john@demo.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const { token } = await loginRes.json();
        console.log('Login success. Token:', token ? 'Yes' : 'No');

        // Decode token
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token Payload:', payload);

        const tenantId = payload.tenantId;

        // 2. Clock In
        console.log(`Clocking in at ${BASE_URL}/${tenantId}/attendance/clock-in ...`);
        const clockInRes = await fetch(`${BASE_URL}/${tenantId}/attendance/clock-in`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (clockInRes.ok) {
            const data = await clockInRes.json();
            console.log('Clock In Success:', data);
        } else {
            console.error('Clock In Failed:', clockInRes.status, clockInRes.statusText);
            const errData = await clockInRes.text();
            console.error('Data:', errData);
        }

    } catch (err) {
        console.error('Test Failed:', err.message);
    }
}

test();
