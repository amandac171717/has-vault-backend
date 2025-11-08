/**
 * HSA Vault API Test Script
 * Run this to test your backend API endpoints
 * 
 * Usage: node test-api.js
 */

const API_BASE_URL = 'http://localhost:3000/api';

// Test configuration
const TEST_USER = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test123!@#'
};

let authToken = null;
let userId = null;
let receiptId = null;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        return { response, data };
    } catch (error) {
        return { error: error.message };
    }
}

// Test functions
async function testHealthCheck() {
    logInfo('Testing health check endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
        const data = await response.json();
        
        if (response.ok && data.status === 'ok') {
            logSuccess('Health check passed');
            return true;
        } else {
            logError('Health check failed');
            return false;
        }
    } catch (error) {
        logError(`Health check failed: ${error.message}`);
        return false;
    }
}

async function testRegister() {
    logInfo('Testing user registration...');
    const { response, data, error } = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(TEST_USER)
    });

    if (error) {
        logError(`Registration failed: ${error}`);
        return false;
    }

    if (response.ok && data.token) {
        authToken = data.token;
        userId = data.user.id;
        logSuccess(`User registered: ${data.user.username}`);
        logInfo(`Token: ${authToken.substring(0, 20)}...`);
        return true;
    } else {
        logError(`Registration failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

async function testLogin() {
    logInfo('Testing user login...');
    const { response, data, error } = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_USER.email,
            password: TEST_USER.password
        })
    });

    if (error) {
        logError(`Login failed: ${error}`);
        return false;
    }

    if (response.ok && data.token) {
        authToken = data.token;
        logSuccess('Login successful');
        return true;
    } else {
        logError(`Login failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

async function testGetCurrentUser() {
    logInfo('Testing get current user...');
    const { response, data, error } = await apiRequest('/auth/me');

    if (error) {
        logError(`Get user failed: ${error}`);
        return false;
    }

    if (response.ok && data.user) {
        logSuccess(`Current user: ${data.user.username} (${data.user.email})`);
        return true;
    } else {
        logError(`Get user failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

async function testUploadReceipt() {
    logInfo('Testing receipt upload...');
    
    // Create a simple test image (1x1 pixel PNG)
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.fillText('TEST RECEIPT', 10, 50);
    
    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'test-receipt.png');
        formData.append('date', '2025-01-15');
        formData.append('vendor', 'Test Pharmacy');
        formData.append('service_type', 'Prescription');
        formData.append('amount', '45.99');

        try {
            const response = await fetch(`${API_BASE_URL}/receipts/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.receipt) {
                receiptId = data.receipt.id;
                logSuccess(`Receipt uploaded: ${data.receipt.id}`);
                if (data.ocr) {
                    logInfo(`OCR confidence: ${data.ocr.confidence}%`);
                }
                return true;
            } else {
                logError(`Upload failed: ${data.error || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            logError(`Upload failed: ${error.message}`);
            return false;
        }
    });
}

async function testGetReceipts() {
    logInfo('Testing get receipts...');
    const { response, data, error } = await apiRequest('/receipts?limit=10');

    if (error) {
        logError(`Get receipts failed: ${error}`);
        return false;
    }

    if (response.ok && Array.isArray(data.receipts)) {
        logSuccess(`Retrieved ${data.receipts.length} receipts`);
        if (data.receipts.length > 0) {
            logInfo(`First receipt: ${data.receipts[0].vendor} - $${data.receipts[0].amount}`);
        }
        return true;
    } else {
        logError(`Get receipts failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

async function testGetReceiptStats() {
    logInfo('Testing receipt statistics...');
    const year = new Date().getFullYear();
    const { response, data, error } = await apiRequest(`/receipts/stats/summary?year=${year}`);

    if (error) {
        logError(`Get stats failed: ${error}`);
        return false;
    }

    if (response.ok && data.ytdExpenses !== undefined) {
        logSuccess(`Stats retrieved for ${year}:`);
        logInfo(`  YTD Expenses: $${data.ytdExpenses.toFixed(2)}`);
        logInfo(`  Monthly Average: $${data.monthlyAverage.toFixed(2)}`);
        logInfo(`  YoY Change: ${data.yoyChange}%`);
        return true;
    } else {
        logError(`Get stats failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

async function testUpdateReceipt() {
    if (!receiptId) {
        logError('No receipt ID available for update test');
        return false;
    }

    logInfo('Testing receipt update...');
    const { response, data, error } = await apiRequest(`/receipts/${receiptId}`, {
        method: 'PUT',
        body: JSON.stringify({
            date: '2025-01-16',
            vendor: 'Updated Pharmacy',
            service_type: 'Prescription',
            amount: 50.99
        })
    });

    if (error) {
        logError(`Update failed: ${error}`);
        return false;
    }

    if (response.ok && data.receipt) {
        logSuccess(`Receipt updated: ${data.receipt.vendor}`);
        return true;
    } else {
        logError(`Update failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

async function testDeleteReceipt() {
    if (!receiptId) {
        logError('No receipt ID available for delete test');
        return false;
    }

    logInfo('Testing receipt deletion...');
    const { response, data, error } = await apiRequest(`/receipts/${receiptId}`, {
        method: 'DELETE'
    });

    if (error) {
        logError(`Delete failed: ${error}`);
        return false;
    }

    if (response.ok) {
        logSuccess('Receipt deleted successfully');
        return true;
    } else {
        logError(`Delete failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

// Main test runner
async function runTests() {
    log('\n🧪 Starting HSA Vault API Tests\n', 'blue');
    
    const tests = [
        { name: 'Health Check', fn: testHealthCheck },
        { name: 'User Registration', fn: testRegister },
        { name: 'User Login', fn: testLogin },
        { name: 'Get Current User', fn: testGetCurrentUser },
        { name: 'Get Receipts', fn: testGetReceipts },
        { name: 'Get Receipt Stats', fn: testGetReceiptStats },
        { name: 'Update Receipt', fn: testUpdateReceipt },
        { name: 'Delete Receipt', fn: testDeleteReceipt }
    ];

    const results = [];
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            results.push({ name: test.name, passed: result });
            
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            logError(`${test.name} threw an error: ${error.message}`);
            results.push({ name: test.name, passed: false });
        }
    }

    // Summary
    log('\n📊 Test Results Summary\n', 'blue');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
        if (result.passed) {
            logSuccess(`${result.name}`);
        } else {
            logError(`${result.name}`);
        }
    });

    log(`\n✅ Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
        log('\n🎉 All tests passed!', 'green');
    } else {
        log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
    }
}

// Check if running in Node.js or browser
if (typeof window === 'undefined') {
    // Node.js environment - use node-fetch
    const fetch = (await import('node-fetch')).default;
    global.fetch = fetch;
    global.FormData = (await import('form-data')).default;
    global.Blob = (await import('buffer')).Blob;
    
    // Create a simple canvas mock for Node.js
    global.document = {
        createElement: () => ({
            width: 100,
            height: 100,
            getContext: () => ({
                fillStyle: '',
                fillRect: () => {},
                font: '',
                fillText: () => {}
            }),
            toBlob: (callback) => {
                // Create a simple test blob
                const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
                callback(new Blob([testImage], { type: 'image/png' }));
            }
        })
    };
    
    runTests().catch(console.error);
} else {
    // Browser environment
    window.runAPITests = runTests;
    log('\n💡 Run tests in browser console: runAPITests()', 'blue');
}

export { runTests };

