#!/usr/bin/env node

/**
 * Test script to verify the backend executable works correctly
 * Run this before building the DMG to catch issues early
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BACKEND_PATH = path.join(__dirname, 'dist', 'therapy-backend');
const TEST_URL = 'http://localhost:8000';
const TIMEOUT = 30000; // 30 seconds

console.log('🧪 Testing backend executable...\n');

// Check if backend exists
if (!fs.existsSync(BACKEND_PATH)) {
  console.error(`❌ Backend not found at: ${BACKEND_PATH}`);
  process.exit(1);
}

console.log(`✅ Backend found at: ${BACKEND_PATH}`);

// Check if executable
try {
  const stats = fs.statSync(BACKEND_PATH);
  const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
  if (!isExecutable) {
    console.log('⚠️  Backend is not executable. Making it executable...');
    fs.chmodSync(BACKEND_PATH, '755');
    console.log('✅ Made backend executable');
  } else {
    console.log('✅ Backend is executable');
  }
} catch (err) {
  console.error(`❌ Error checking permissions: ${err.message}`);
  process.exit(1);
}

// Start backend
console.log('\n🚀 Starting backend...');
const backendProcess = spawn(BACKEND_PATH, [], { stdio: 'pipe' });

let backendStdout = '';
let backendStderr = '';
let backendStarted = false;

backendProcess.stdout.on('data', (data) => {
  const output = data.toString();
  backendStdout += output;
  process.stdout.write(`[backend] ${output}`);
  
  // Check for startup indicators
  if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
    backendStarted = true;
  }
});

backendProcess.stderr.on('data', (data) => {
  const output = data.toString();
  backendStderr += output;
  process.stderr.write(`[backend stderr] ${output}`);
});

backendProcess.on('error', (err) => {
  console.error(`\n❌ Failed to start backend: ${err.message}`);
  process.exit(1);
});

backendProcess.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Backend exited with code ${code}`);
    console.error(`Stdout: ${backendStdout}`);
    console.error(`Stderr: ${backendStderr}`);
    process.exit(1);
  }
});

// Wait for backend to be ready
function testBackend(retries = 60) {
  const request = http.get(TEST_URL, { timeout: 2000 }, (res) => {
    if (res.statusCode === 200) {
      console.log('\n✅ Backend is responding correctly!');
      console.log(`✅ Status code: ${res.statusCode}`);
      
      // Test a specific endpoint
      http.get(`${TEST_URL}/api/clients/?filter=active`, { timeout: 2000 }, (apiRes) => {
        if (apiRes.statusCode === 200) {
          console.log('✅ API endpoint is working!');
          console.log('\n🎉 All tests passed! Backend is ready for packaging.');
          backendProcess.kill();
          process.exit(0);
        } else {
          console.error(`\n⚠️  API endpoint returned status ${apiRes.statusCode}`);
          backendProcess.kill();
          process.exit(1);
        }
      }).on('error', (err) => {
        console.error(`\n❌ API test failed: ${err.message}`);
        backendProcess.kill();
        process.exit(1);
      });
    } else {
      retry();
    }
  });

  request.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      retry();
    } else {
      console.error(`\n❌ Connection error: ${err.message}`);
      backendProcess.kill();
      process.exit(1);
    }
  });

  request.on('timeout', () => {
    request.destroy();
    retry();
  });

  function retry() {
    if (retries > 0) {
      setTimeout(() => testBackend(retries - 1), 500);
    } else {
      console.error('\n❌ Backend did not respond in time');
      console.error(`Stdout: ${backendStdout}`);
      console.error(`Stderr: ${backendStderr}`);
      backendProcess.kill();
      process.exit(1);
    }
  }
}

// Start testing after a short delay
setTimeout(() => {
  console.log('\n⏳ Waiting for backend to start...');
  testBackend();
}, 2000);

// Timeout safety
setTimeout(() => {
  console.error('\n❌ Test timed out after 30 seconds');
  backendProcess.kill();
  process.exit(1);
}, TIMEOUT);

