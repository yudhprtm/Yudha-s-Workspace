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

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
        const { token } = await loginRes.json();
        const payload = JSON.parse(atob(token.split('.')[1]));
        const tenantId = payload.tenantId;

        // 2. Test GET /attendance
        console.log(`Fetching attendance logs at ${BASE_URL}/${tenantId}/attendance ...`);
        const res = await fetch(`${BASE_URL}/${tenantId}/attendance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            console.log('Success! Logs found:', data.length);
            console.log('Sample:', data[0]);
        } else {
            console.error('Failed:', res.status, res.statusText);
            console.error(await res.text());
        }

    } catch (err) {
        console.error('Test Failed:', err.message);
    }
}

test();
