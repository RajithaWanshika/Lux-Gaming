#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const BASE_URL = 'https://lugx.yourdomain.com';
const AUTH_TOKEN = 'rajithatesting';

// Test data for POST requests
const testGame = {
  title: "Test Action Game",
  description: "A thrilling action game for testing",
  price: 49.99,
  discount: 10.0,
  category: "Action",
  image_url: "https://example.com/test-game.jpg",
  release_date: "2024-01-15"
};

const batchGames = [
  {
    title: "Batch Game 1",
    description: "First batch game",
    price: 29.99,
    category: "Strategy"
  },
  {
    title: "Batch Game 2", 
    description: "Second batch game",
    price: 39.99,
    category: "Racing"
  }
];

const updateGame = {
  title: "Updated Action Game",
  price: 59.99,
  discount: 15.0
};

async function runTest(testName, command) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`Command: ${command}`);
  console.log('─'.repeat(80));
  
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('✅ SUCCESS');
    console.log('Response:');
    console.log(stdout);
    if (stderr) {
      console.log('Stderr:', stderr);
    }
    return { success: true, data: stdout };
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Error:', error.message);
    if (error.stdout) {
      console.log('Response:', error.stdout);
    }
    return { success: false, error: error.message, data: error.stdout };
  }
}

async function runAllTests() {
  console.log('🎮 Game Service API Tests');
  console.log('==========================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auth Token: ${AUTH_TOKEN}`);
  console.log('');

  const tests = [
    {
      name: 'GET /games',
      command: `curl -X GET "${BASE_URL}/games" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    },
    {
      name: 'GET /games with pagination and search',
      command: `curl -X GET "${BASE_URL}/games?page=1&limit=10&search=action" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    },
    {
      name: 'GET /games/123',
      command: `curl -X GET "${BASE_URL}/games/123" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    },
    {
      name: 'GET /games/123 with reviews',
      command: `curl -X GET "${BASE_URL}/games/123?with_review=true" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    },
    {
      name: 'POST /games',
      command: `curl -X POST "${BASE_URL}/games" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json" -d '${JSON.stringify(testGame)}'`
    },
    {
      name: 'POST /games/batch',
      command: `curl -X POST "${BASE_URL}/games/batch" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json" -d '${JSON.stringify(batchGames)}'`
    },
    {
      name: 'PUT /games/123',
      command: `curl -X PUT "${BASE_URL}/games/123" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json" -d '${JSON.stringify(updateGame)}'`
    },
    {
      name: 'DELETE /games/123',
      command: `curl -X DELETE "${BASE_URL}/games/123" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    },
    {
      name: 'GET /games/categories',
      command: `curl -X GET "${BASE_URL}/games/categories" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    },
    {
      name: 'GET /health/game',
      command: `curl -X GET "${BASE_URL}/health/game" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    },
    {
      name: 'GET /metrics/game',
      command: `curl -X GET "${BASE_URL}/metrics/game" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
    }
  ];

  const results = [];

  for (const test of tests) {
    const result = await runTest(test.name, test.command);
    results.push({
      name: test.name,
      success: result.success,
      error: result.error
    });
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const passed = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`\n🎯 Results: ${passed}/${total} tests passed`);
}

// Individual test functions for manual testing
async function testGetGames() {
  return await runTest('GET /games', 
    `curl -X GET "${BASE_URL}/games" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

async function testGetGamesWithParams() {
  return await runTest('GET /games with pagination and search', 
    `curl -X GET "${BASE_URL}/games?page=1&limit=10&search=action" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

async function testGetGameById() {
  return await runTest('GET /games/123', 
    `curl -X GET "${BASE_URL}/games/123" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

async function testGetGameByIdWithReviews() {
  return await runTest('GET /games/123 with reviews', 
    `curl -X GET "${BASE_URL}/games/123?with_review=true" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

async function testPostGame() {
  return await runTest('POST /games', 
    `curl -X POST "${BASE_URL}/games" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json" -d '${JSON.stringify(testGame)}'`
  );
}

async function testPostBatchGames() {
  return await runTest('POST /games/batch', 
    `curl -X POST "${BASE_URL}/games/batch" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json" -d '${JSON.stringify(batchGames)}'`
  );
}

async function testPutGame() {
  return await runTest('PUT /games/123', 
    `curl -X PUT "${BASE_URL}/games/123" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json" -d '${JSON.stringify(updateGame)}'`
  );
}

async function testDeleteGame() {
  return await runTest('DELETE /games/123', 
    `curl -X DELETE "${BASE_URL}/games/123" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

async function testGetCategories() {
  return await runTest('GET /games/categories', 
    `curl -X GET "${BASE_URL}/games/categories" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

async function testHealthCheck() {
  return await runTest('GET /health/game', 
    `curl -X GET "${BASE_URL}/health/game" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

async function testMetrics() {
  return await runTest('GET /metrics/game', 
    `curl -X GET "${BASE_URL}/metrics/game" -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`
  );
}

// Run all tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testGetGames,
  testGetGamesWithParams,
  testGetGameById,
  testGetGameByIdWithReviews,
  testPostGame,
  testPostBatchGames,
  testPutGame,
  testDeleteGame,
  testGetCategories,
  testHealthCheck,
  testMetrics
}; 