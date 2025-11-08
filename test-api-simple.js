/**
 * Simple API Test Script (Node.js)
 * Run: node test-api-simple.js
 * 
 * Make sure the backend server is running first!
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000/api';

const TEST_USER = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test123!@#'
};

let authToken = null;

async function test(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                ...options.headers
            }
        };

        const response = await fetch(url, config);
        const data = await response.json();
        
        return { ok: response.ok, data, status: response.status };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

async function runTests() {
    console.log('\n🧪 HSA Vault API Tests\n');

    // Test 1: Health Check
    console.log('1. Testing health check...');
    const health = await fetch('http://localhost:3000/health');
    const healthData = await health.json();
    console.log(health.ok ? '   ✓ Health check passed' : '   ✗ Health check failed');
    console.log(`   Status: ${healthData.status}\n`);

    // Test 2: Register
    console.log('2. Testing user registration...');
    const register = await test('/auth/register', {
        method: 'POST',
        body: JSON.stringify(TEST_USER)
    });
    if (register.ok && register.data.token) {
        authToken = register.data.token;
        console.log(`   ✓ User registered: ${register.data.user.username}`);
        console.log(`   User ID: ${register.data.user.id}\n`);
    } else {
        console.log(`   ✗ Registration failed: ${register.data?.error || register.error}\n`);
        return;
    }

    // Test 3: Login
    console.log('3. Testing user login...');
    const login = await test('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_USER.email,
            password: TEST_USER.password
        })
    });
    if (login.ok && login.data.token) {
        authToken = login.data.token;
        console.log('   ✓ Login successful\n');
    } else {
        console.log(`   ✗ Login failed: ${login.data?.error || login.error}\n`);
    }

    // Test 4: Get Current User
    console.log('4. Testing get current user...');
    const me = await test('/auth/me');
    if (me.ok && me.data.user) {
        console.log(`   ✓ Current user: ${me.data.user.username} (${me.data.user.email})\n`);
    } else {
        console.log(`   ✗ Get user failed: ${me.data?.error || me.error}\n`);
    }

    // Test 5: Get Receipts
    console.log('5. Testing get receipts...');
    const receipts = await test('/receipts?limit=10');
    if (receipts.ok && Array.isArray(receipts.data.receipts)) {
        console.log(`   ✓ Retrieved ${receipts.data.receipts.length} receipts\n`);
    } else {
        console.log(`   ✗ Get receipts failed: ${receipts.data?.error || receipts.error}\n`);
    }

    // Test 6: Get Stats
    console.log('6. Testing receipt statistics...');
    const year = new Date().getFullYear();
    const stats = await test(`/receipts/stats/summary?year=${year}`);
    if (stats.ok && stats.data.ytdExpenses !== undefined) {
        console.log(`   ✓ Stats retrieved for ${year}:`);
        console.log(`     YTD Expenses: $${stats.data.ytdExpenses.toFixed(2)}`);
        console.log(`     Monthly Average: $${stats.data.monthlyAverage.toFixed(2)}`);
        console.log(`     YoY Change: ${stats.data.yoyChange}%\n`);
    } else {
        console.log(`   ✗ Get stats failed: ${stats.data?.error || stats.error}\n`);
    }

    console.log('✅ Tests completed!\n');
}

// Run tests
runTests().catch(console.error);

