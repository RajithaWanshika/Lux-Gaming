const axios = require("axios");

const BASE_URL = "http://localhost:3004";

async function testAnalyticsService() {
  console.log("Testing Analytics Service...\n");

  try {
    console.log("1. Testing Health Check...");
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`, {
        timeout: 5000,
      });
      console.log("Health Check:", healthResponse.data);
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        console.log("Service not running. Starting service test...");
        console.log("To run full tests, start the service with: npm start");
        return;
      }
      throw error;
    }

    console.log("\n2. Testing Page View Tracking...");
    const pageViewData = {
      userId: "test-user-123",
      sessionId: "test-session-456",
      pageUrl: "http://localhost:3000/test-page",
      pageTitle: "Test Page",
      referrer: "http://localhost:3000/",
      timeOnPage: 120,
      viewport: { width: 1920, height: 1080 },
    };

    const pageViewResponse = await axios.post(
      `${BASE_URL}/track/pageview`,
      pageViewData
    );
    console.log("Page View Tracking:", pageViewResponse.data);

    console.log("\n3. Testing Click Event Tracking...");
    const clickData = {
      userId: "test-user-123",
      sessionId: "test-session-456",
      pageUrl: "http://localhost:3000/test-page",
      elementType: "button",
      elementText: "Buy Now",
      elementId: "buy-button",
      elementClass: "btn-primary",
      clickPosition: { x: 100, y: 200 },
    };

    const clickResponse = await axios.post(
      `${BASE_URL}/track/click`,
      clickData
    );
    console.log("Click Event Tracking:", clickResponse.data);

    console.log("\n4. Testing Scroll Depth Tracking...");
    const scrollData = {
      userId: "test-user-123",
      sessionId: "test-session-456",
      pageUrl: "http://localhost:3000/test-page",
      maxScrollDepth: 75,
      scrollMilestones: [25, 50, 75],
      pageHeight: 2000,
      viewportHeight: 1080,
      timeToMaxScroll: 30000,
    };

    const scrollResponse = await axios.post(
      `${BASE_URL}/track/scroll`,
      scrollData
    );
    console.log("Scroll Depth Tracking:", scrollResponse.data);

    console.log("\n5. Testing Session Tracking...");
    const sessionData = {
      userId: "test-user-123",
      sessionId: "test-session-456",
      startTime: new Date(Date.now() - 300000).toISOString(),
      endTime: new Date().toISOString(),
      duration: 300,
      pageCount: 3,
      initialReferrer: "http://localhost:3000/",
    };

    const sessionResponse = await axios.post(
      `${BASE_URL}/track/session`,
      sessionData
    );
    console.log("Session Tracking:", sessionResponse.data);

    console.log("\n6. Testing Custom Event Tracking...");
    const customEventData = {
      userId: "test-user-123",
      sessionId: "test-session-456",
      pageUrl: "http://localhost:3000/test-page",
      eventType: "purchase",
      eventName: "game_purchased",
      properties: {
        gameId: 123,
        price: 29.99,
        currency: "USD",
      },
    };

    const customEventResponse = await axios.post(
      `${BASE_URL}/track/event`,
      customEventData
    );
    console.log("Custom Event Tracking:", customEventResponse.data);

    console.log("\n7. Testing Real-time Analytics...");
    const analyticsResponse = await axios.get(
      `${BASE_URL}/analytics/realtime/pageviews?minutes=30`
    );
    console.log("Real-time Analytics:", analyticsResponse.data);

    console.log("\n8. Testing Dashboard Data...");
    const dashboardResponse = await axios.get(
      `${BASE_URL}/analytics/dashboard?hours=24`
    );
    console.log("Dashboard Data:", dashboardResponse.data);

    console.log("\n9. Testing Demo Status...");
    const demoStatusResponse = await axios.get(`${BASE_URL}/demo/status`);
    console.log("Demo Status:", demoStatusResponse.data);

    console.log("\nAll Analytics Service tests completed successfully!");
    console.log("\nAnalytics Service Features Tested:");
    console.log("   Health Check");
    console.log("   Page View Tracking");
    console.log("   Click Event Tracking");
    console.log("   Scroll Depth Tracking");
    console.log("   Session Tracking");
    console.log("   Custom Event Tracking");
    console.log("   Real-time Analytics");
    console.log("   Dashboard Data");
    console.log("   Demo Status");
  } catch (error) {
    console.error("Test failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

if (require.main === module) {
  testAnalyticsService();
}

module.exports = { testAnalyticsService };
