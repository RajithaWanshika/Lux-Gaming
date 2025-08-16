const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const clickHouse = require("./clickhouse");
const demoS3Export = require("./s3ExportDemo");

const app = express();
const port = process.env.PORT || 3004;

app.use(
  cors({
    origin: [
      "http://k8s-luxgamingalb-5a170d9168-634539224.us-east-1.elb.amazonaws.com",
      "http://localhost:3000",
      "http://localhost:8080",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());

const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null)
  );
};

const getDeviceType = (userAgent) => {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return "tablet";
  }
  if (
    /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
      userAgent
    )
  ) {
    return "mobile";
  }
  return "desktop";
};

app.get("/", (req, res) =>
  res.send("Analytics Service Running - ClickHouse + S3 Export Demo")
);

app.get("/test", (req, res) => {
  res.json({
    message: "Analytics service is running",
    timestamp: new Date().toISOString(),
    cors: "enabled",
  });
});

app.post("/track/pageview", async (req, res) => {
  try {
    const {
      userId,
      sessionId,
      pageUrl,
      pageTitle,
      referrer,
      timeOnPage,
      viewport,
    } = req.body;

    const userAgent = req.headers["user-agent"];
    const ipAddress = getClientIP(req);
    const device = getDeviceType(userAgent);

    const pageViewData = {
      userId: userId || "anonymous",
      sessionId,
      pageUrl,
      pageTitle,
      referrer,
      userAgent,
      ipAddress,
      timeOnPage: timeOnPage || 0,
      viewport,
      device,
    };

    await clickHouse.insertPageView(pageViewData);

    res
      .status(200)
      .json({ success: true, message: "Page view tracked successfully" });
  } catch (error) {
    console.error("Error tracking page view:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/track/click", async (req, res) => {
  try {
    const {
      userId,
      sessionId,
      pageUrl,
      elementType,
      elementText,
      elementId,
      elementClass,
      clickPosition,
    } = req.body;

    const clickEventData = {
      userId: userId || "anonymous",
      sessionId,
      pageUrl,
      elementType,
      elementText,
      elementId,
      elementClass,
      clickPosition,
    };

    await clickHouse.insertClickEvent(clickEventData);

    res
      .status(200)
      .json({ success: true, message: "Click event tracked successfully" });
  } catch (error) {
    console.error("Error tracking click event:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/track/scroll", async (req, res) => {
  try {
    const {
      userId,
      sessionId,
      pageUrl,
      maxScrollDepth,
      scrollMilestones,
      pageHeight,
      viewportHeight,
      timeToMaxScroll,
    } = req.body;

    const scrollDepthData = {
      userId: userId || "anonymous",
      sessionId,
      pageUrl,
      maxScrollDepth,
      scrollMilestones,
      pageHeight,
      viewportHeight,
      timeToMaxScroll,
    };

    await clickHouse.insertScrollDepth(scrollDepthData);

    res
      .status(200)
      .json({ success: true, message: "Scroll depth tracked successfully" });
  } catch (error) {
    console.error("Error tracking scroll depth:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/track/session", async (req, res) => {
  try {
    // Handle both JSON and form data
    let body = req.body;

    // If body is a string, try to parse it as JSON
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        console.warn("Failed to parse session body as JSON:", parseError);
        body = {};
      }
    }

    // If body is still undefined or null, use empty object
    if (!body) {
      body = {};
    }

    const {
      userId,
      sessionId,
      startTime,
      endTime,
      duration,
      pageCount,
      initialReferrer,
    } = body;

    const userAgent = req.headers["user-agent"];
    const ipAddress = getClientIP(req);

    const sessionData = {
      userId: userId || "anonymous",
      sessionId: sessionId || `session_${Date.now()}`,
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || null,
      duration: duration || 0,
      pageCount: pageCount || 1,
      initialReferrer: initialReferrer || "",
      initialUserAgent: userAgent || "",
      ipAddress: ipAddress || "",
    };

    await clickHouse.insertSession(sessionData);

    res
      .status(200)
      .json({ success: true, message: "Session tracked successfully" });
  } catch (error) {
    console.error("Error tracking session:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/track/event", async (req, res) => {
  try {
    const { userId, sessionId, pageUrl, eventType, eventName, properties } =
      req.body;

    const customEventData = {
      userId: userId || "anonymous",
      sessionId,
      pageUrl,
      eventType: eventType || "custom",
      eventName,
      properties,
    };

    await clickHouse.insertCustomEvent(customEventData);

    res
      .status(200)
      .json({ success: true, message: "Custom event tracked successfully" });
  } catch (error) {
    console.error("Error tracking custom event:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/analytics/realtime/pageviews", async (req, res) => {
  try {
    const { minutes = 30 } = req.query;
    const data = await clickHouse.getRealtimePageViews(parseInt(minutes));
    res.json(data);
  } catch (error) {
    console.error("Error fetching realtime page views:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/analytics/pageviews/:pageUrl", async (req, res) => {
  try {
    const { pageUrl } = req.params;
    const { minutes = 30 } = req.query;
    const data = await clickHouse.getRealtimePageViews(parseInt(minutes));
    res.json(data);
  } catch (error) {
    console.error("Error fetching page view analytics:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/analytics/heatmap/:pageUrl", async (req, res) => {
  try {
    const { pageUrl } = req.params;
    const { minutes = 30 } = req.query;
    const data = await clickHouse.getRealtimeClickHeatmap(
      decodeURIComponent(pageUrl),
      parseInt(minutes)
    );
    res.json(data);
  } catch (error) {
    console.error("Error fetching click heatmap:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/analytics/clicks/:pageUrl", async (req, res) => {
  try {
    const { pageUrl } = req.params;
    const { minutes = 30 } = req.query;
    const data = await clickHouse.getRealtimeClickHeatmap(
      decodeURIComponent(pageUrl),
      parseInt(minutes)
    );
    res.json(data);
  } catch (error) {
    console.error("Error fetching click analytics:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/analytics/scroll/:pageUrl", async (req, res) => {
  try {
    const { pageUrl } = req.params;
    const { minutes = 30 } = req.query;
    const data = await clickHouse.getScrollAnalytics(
      decodeURIComponent(pageUrl),
      parseInt(minutes)
    );
    res.json(data);
  } catch (error) {
    console.error("Error fetching scroll analytics:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/analytics/dashboard", async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const data = await clickHouse.getDashboardData(parseInt(hours));
    res.json(data);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/demo/upload-now", async (req, res) => {
  try {
    console.log("Demo: Manual S3 upload triggered");
    const result = await demoS3Export.triggerManualUpload();

    res.status(200).json({
      success: true,
      message: "Demo upload completed",
      result,
    });
  } catch (error) {
    console.error("Demo upload failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/demo/status", (req, res) => {
  res.json({
    service: "Analytics Demo",
    mode: "ClickHouse + S3 Export",
    s3Export: "Active",
    uploadInterval: `${process.env.UPLOAD_INTERVAL_MINUTES || 10} minutes`,
    lastUpload: demoS3Export.lastUploadTime,
    bucketName: process.env.S3_BUCKET_NAME || "lugx-analytics",
    clickhouseUrl: process.env.CLICKHOUSE_URL || "http://clickhouse:8123",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    mode: "ClickHouse + S3",
    service: "analytics",
  });
});

app.get("/health/analytics", (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      service: "analytics",
      mode: "ClickHouse + S3",
      dependencies: {
        clickhouse: clickHouse.isConnected ? "connected" : "disconnected",
        s3Export: "active",
      },
      environment: {
        port: port,
        nodeEnv: process.env.NODE_ENV || "development",
        clickhouseUrl: process.env.CLICKHOUSE_URL
          ? "configured"
          : "not configured",
        s3Bucket: process.env.S3_BUCKET_NAME || "lugx-analytics-demo",
        uploadInterval: `${process.env.UPLOAD_INTERVAL_MINUTES || 10} minutes`,
      },
      uptime: process.uptime(),
    };

    if (!clickHouse.isConnected) {
      healthStatus.status = "degraded";
      healthStatus.warnings = [
        "ClickHouse connection unavailable - running in mock mode",
      ];
    }

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      service: "analytics",
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Analytics Service running on port ${port}`);
  console.log("Mode: ClickHouse + S3 Export Demo");
  console.log(
    `S3 Bucket: ${process.env.S3_BUCKET_NAME || "lugx-analytics-demo"}`
  );
  console.log(
    `Upload Interval: ${process.env.UPLOAD_INTERVAL_MINUTES || 10} minutes`
  );
});
