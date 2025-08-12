const { spawn } = require("child_process");
const path = require("path");

async function runAnalyticsTests() {
  console.log("Starting Analytics Service Tests...\n");

  const testFile = path.join(__dirname, "test-analytics.js");

  const testProcess = spawn("node", [testFile], {
    stdio: "inherit",
    cwd: __dirname,
  });

  testProcess.on("close", (code) => {
    if (code === 0) {
      console.log("\nAnalytics Service Tests completed successfully!");
    } else {
      console.log(`\nAnalytics Service Tests failed with exit code ${code}`);
      process.exit(code);
    }
  });

  testProcess.on("error", (error) => {
    console.error("Error running analytics tests:", error);
    process.exit(1);
  });
}

if (require.main === module) {
  runAnalyticsTests();
}

module.exports = { runAnalyticsTests };
