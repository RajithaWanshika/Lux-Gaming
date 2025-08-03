#!/usr/bin/env node

/**
 * LUGX Gaming Backend - Test Runner
 * Runs comprehensive tests for all simplified microservices
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const services = [
  {
    name: "API Gateway",
    path: "./services/api-gateway",
    testFile: "test.js",
    port: 3000,
    description:
      "Request routing and JWT authentication gateway",
  },
  {
    name: "User Service",
    path: "./services/user",
    testFile: "test.js",
    port: 3001,
    description: "User management with bcryptjs authentication and JWT tokens",
  },
  {
    name: "Game Service",
    path: "./services/game",
    testFile: "test.js",
    port: 3002,
    description: "Game catalog with integrated reviews system",
  },
  {
    name: "Order Service",
    path: "./services/order",
    testFile: "test.js",
    port: 3004,
    description: "Simplified order processing without payment complexity",
  },
  {
    name: "Analytics Service",
    path: "./services/analytics",
    testFile: "test.js",
    port: 3005,
    description: "ClickHouse analytics with data simulation for demos",
  },
];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader() {
  console.log(colorize("cyan", "=".repeat(80)));
  console.log(
    colorize(
      "bright",
      "🚀 LUGX Gaming Backend - Simplified Microservices Test Suite"
    )
  );
  console.log(colorize("cyan", "=".repeat(80)));
  console.log(colorize("blue", "🎯 Optimized for MSC-Cloud Computing Demo"));
  console.log();
}

function printServiceHeader(service, index, total) {
  console.log(
    colorize("yellow", `[${index + 1}/${total}] Testing ${service.name}`)
  );
  console.log(colorize("blue", `📍 ${service.description}`));
  console.log(
    colorize("blue", `🏠 Port: ${service.port} | Path: ${service.path}`)
  );
  console.log();
}

function runTest(service) {
  return new Promise((resolve) => {
    const testPath = path.join(service.path, service.testFile);

    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      console.log(colorize("red", `❌ Test file not found: ${testPath}`));
      resolve({
        service: service.name,
        success: false,
        error: "Test file not found",
      });
      return;
    }

    console.log(colorize("blue", `🧪 Running tests for ${service.name}...`));

    const testProcess = spawn("npx", ["jest", testPath, "--verbose"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    let output = "";
    let errorOutput = "";

    testProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    testProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    testProcess.on("close", (code) => {
      if (code === 0) {
        console.log(colorize("green", `✅ ${service.name} tests passed!`));
        console.log();
      } else {
        console.log(colorize("red", `❌ ${service.name} tests failed!`));
        if (errorOutput) {
          console.log(colorize("red", "Error output:"));
          console.log(errorOutput);
        }
        console.log();
      }

      resolve({
        service: service.name,
        success: code === 0,
        output,
        error: errorOutput,
      });
    });

    testProcess.on("error", (err) => {
      console.log(
        colorize(
          "red",
          `❌ Failed to run tests for ${service.name}: ${err.message}`
        )
      );
      resolve({ service: service.name, success: false, error: err.message });
    });
  });
}

function printSummary(results) {
  console.log(colorize("cyan", "=".repeat(80)));
  console.log(colorize("bright", "📊 TEST SUMMARY"));
  console.log(colorize("cyan", "=".repeat(80)));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log();
  console.log(colorize("green", `✅ Passed: ${passed}/${results.length}`));
  console.log(colorize("red", `❌ Failed: ${failed}/${results.length}`));
  console.log();

  if (failed > 0) {
    console.log(colorize("red", "Failed Services:"));
    results
      .filter((r) => !r.success)
      .forEach((result) => {
        console.log(
          colorize(
            "red",
            `  - ${result.service}: ${result.error || "Test failures"}`
          )
        );
      });
    console.log();
  }

  console.log(
    colorize("bright", "🔧 FEATURES TESTED IN SIMPLIFIED ARCHITECTURE:")
  );
  console.log();

  const features = [

    "🔐 JWT Authentication with bcryptjs",
    "📊 Prometheus Metrics Collection",
    "🏥 Health Check Endpoints",
    "🔍 Express-Validator Input Validation",
    "⚡ Jest & Supertest API Testing",
    "🎮 Game Catalog with Reviews System",
    "🛒 Simplified Order Processing",
    "📈 ClickHouse Analytics with Simulation",
    "🔄 Essential CRUD Operations",
    "🛡️ Helmet Security Headers",
    "📝 Consistent Error Handling",
    "🎯 Auto-Timestamp Database Triggers",
    "🌐 ua-parser-js User Agent Detection",
    "📍 GeoIP Location Detection",
    "🎲 Realistic Test Data Generation",
  ];

  features.forEach((feature) => {
    console.log(colorize("blue", `  ${feature}`));
  });

  console.log();
  console.log(colorize("cyan", "=".repeat(80)));
}

function printTechStackSummary() {
  console.log(colorize("bright", "🛠️  TECHNOLOGY STACK SUMMARY"));
  console.log(colorize("cyan", "=".repeat(80)));
  console.log();

  const techStack = [
    {
      category: "Core Framework",
      technologies: [
        "Express.js ^4.21.2 - Latest stable web framework",
        "Node.js 18+ - Runtime environment",
        "Jest ^30.0.5 - Testing framework",
        "Supertest ^7.1.4 - HTTP testing",
      ],
    },
    {
      category: "Security & Authentication",
      technologies: [
        "bcryptjs ^2.4.3 - Password hashing",
        "jsonwebtoken ^9.0.2 - JWT tokens",
        "Helmet ^8.1.0 - Security headers",
    
      ],
    },
    {
      category: "Databases",
      technologies: [
        "PostgreSQL with pg ^8.16.3 - User/Game/Order data",
        "ClickHouse ^1.4.0 - Analytics time-series data",
        "Connection pooling (max: 5 for demo)",
        "Auto-timestamp triggers",
      ],
    },
    {
      category: "Analytics & Monitoring",
      technologies: [
        "Prometheus Client ^15.1.3 - Metrics collection",
        "ua-parser-js ^2.0.4 - User agent parsing",
        "geoip-lite ^1.4.10 - Location detection",
        "UUID ^11.0.8 - Unique identifiers",
      ],
    },
    {
      category: "Validation & Utils",
      technologies: [
        "Express Validator ^7.2.1 - Input validation",
        "CORS ^2.8.5 - Cross-origin requests",
        "dotenv ^16.6.1 - Environment variables",
        "http-proxy-middleware ^3.0.3 - API Gateway routing",
      ],
    },
  ];

  techStack.forEach(({ category, technologies }) => {
    console.log(colorize("yellow", `${category}:`));
    technologies.forEach((tech) => {
      console.log(colorize("blue", `  • ${tech}`));
    });
    console.log();
  });
}

function printDatabaseSchema() {
  console.log(colorize("bright", "🗄️  DATABASE SCHEMA OVERVIEW"));
  console.log(colorize("cyan", "=".repeat(80)));
  console.log();

  const schemas = [
    {
      service: "User Service (PostgreSQL)",
      tables: [
        "users: id, username, email, password_hash, first_name, last_name, is_active, timestamps",
        "Indexes: email, username",
        "Triggers: auto-update updated_at",
      ],
    },
    {
      service: "Game Service (PostgreSQL)",
      tables: [
        "games: id, title, description, price, discount, category, image_url, release_date, timestamps",
        "reviews: id, game_id (FK CASCADE), user_name, rating(1-5), review_text, timestamps",
        "Indexes: category, game_id",
        "Triggers: auto-update updated_at",
      ],
    },
    {
      service: "Order Service (PostgreSQL)",
      tables: [
        "orders: id, user_id, status, total(10,2), total_items, timestamps",
        "order_items: id, order_id (FK CASCADE), game_id, quantity, unit_price(10,2), total_price(10,2), timestamps",
        "Indexes: user_id, status, order_id",
        "Triggers: auto-update updated_at",
      ],
    },
    {
      service: "Analytics Service (ClickHouse)",
      tables: [
        "user_events: event tracking with geo-location",
        "page_views: page analytics with device detection",
        "game_interactions: user engagement metrics",
        "user_sessions: session data with replacement",
        "performance_metrics: app performance data",
        "Partitioning: Monthly (toYYYYMM)",
        "TTL: 1-2 years data retention",
      ],
    },
  ];

  schemas.forEach(({ service, tables }) => {
    console.log(colorize("yellow", `${service}:`));
    tables.forEach((table) => {
      console.log(colorize("blue", `  • ${table}`));
    });
    console.log();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const specificService = args[0];

  printHeader();

  if (specificService) {
    const service = services.find(
      (s) =>
        s.name.toLowerCase().includes(specificService.toLowerCase()) ||
        s.path.includes(specificService)
    );

    if (!service) {
      console.log(colorize("red", `❌ Service not found: ${specificService}`));
      console.log(colorize("yellow", "Available services:"));
      services.forEach((s) =>
        console.log(colorize("blue", `  - ${s.name} (${s.path})`))
      );
      process.exit(1);
    }

    console.log(
      colorize(
        "yellow",
        `🎯 Running tests for specific service: ${service.name}`
      )
    );
    console.log();

    printServiceHeader(service, 0, 1);
    const result = await runTest(service);
    printSummary([result]);

    process.exit(result.success ? 0 : 1);
  }

  console.log(
    colorize(
      "bright",
      `🧪 Running tests for all ${services.length} simplified services...`
    )
  );
  console.log();

  const results = [];

  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    printServiceHeader(service, i, services.length);

    const result = await runTest(service);
    results.push(result);

    // Add delay between tests to avoid port conflicts
    if (i < services.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  printSummary(results);
  printTechStackSummary();
  printDatabaseSchema();

  const allPassed = results.every((r) => r.success);

  if (allPassed) {
    console.log(
      colorize(
        "green",
        "🎉 All tests passed! Your simplified microservices are ready for demo."
      )
    );
  } else {
    console.log(
      colorize("red", "⚠️  Some tests failed. Please review the output above.")
    );
  }

  console.log();
  console.log(colorize("cyan", "To run tests for a specific service:"));
  console.log(colorize("blue", "  node run-tests.js <service-name>"));
  console.log();
  console.log(colorize("cyan", "Examples:"));
  console.log(
    colorize(
      "blue",
      "  node run-tests.js user      # Test user authentication & management"
    )
  );
  console.log(
    colorize(
      "blue",
      "  node run-tests.js game      # Test game catalog & reviews"
    )
  );
  console.log(
    colorize(
      "blue",
      "  node run-tests.js order     # Test simplified order processing"
    )
  );
  console.log(
    colorize(
      "blue",
      "  node run-tests.js analytics # Test ClickHouse analytics & simulation"
    )
  );
  console.log(
    colorize(
      "blue",
      "  node run-tests.js gateway   # Test API Gateway routing & auth"
    )
  );
  console.log();
  console.log(
    colorize("cyan", "🎯 Perfect for MSC-Cloud Computing demonstrations!")
  );
  console.log();

  process.exit(allPassed ? 0 : 1);
}

// Handle process termination
process.on("SIGINT", () => {
  console.log();
  console.log(colorize("yellow", "🛑 Test run interrupted by user"));
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log();
  console.log(colorize("yellow", "🛑 Test run terminated"));
  process.exit(1);
});

// Run the test suite
main().catch((err) => {
  console.error(colorize("red", `❌ Unexpected error: ${err.message}`));
  process.exit(1);
});
