const request = require("supertest");
const express = require("express");

let testEvents = [
  {
    event_id: "event-1",
    user_id: 123,
    session_id: "session-abc",
    event_type: "click",
    event_category: "navigation",
    event_action: "button_click",
    event_label: "header_cta",
    event_value: null,
    page_url: "https://example.com/home",
    referrer: "https://google.com",
    timestamp: new Date().toISOString(),
  },
];

let testPageViews = [
  {
    view_id: "view-1",
    user_id: 123,
    session_id: "session-abc",
    page_url: "https://example.com/home",
    page_title: "Home Page",
    referrer: "https://google.com",
    time_on_page: 120,
    scroll_depth: 75.5,
    timestamp: new Date().toISOString(),
  },
];

let testGameInteractions = [
  {
    interaction_id: "interaction-1",
    user_id: 123,
    session_id: "session-abc",
    game_id: 1,
    game_title: "Test Game",
    interaction_type: "view",
    duration_seconds: 300,
    timestamp: new Date().toISOString(),
  },
];



function createTestApp() {
  const app = express();
  app.use(express.json());

  app.post("/analytics/events", (req, res) => {
    const {
      event_type,
      event_category,
      event_action,
      event_label,
      event_value,
      page_url,
      referrer,
      session_id,
      user_id,
    } = req.body;

    if (
      !event_type ||
      !event_category ||
      !event_action ||
      !page_url ||
      !session_id
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: event_type, event_category, event_action, page_url, session_id",
      });
    }

    const newEvent = {
      event_id: `event-${testEvents.length + 1}`,
      user_id: user_id || null,
      session_id,
      event_type,
      event_category,
      event_action,
      event_label: event_label || null,
      event_value: event_value || null,
      page_url,
      referrer: referrer || null,
      timestamp: new Date().toISOString(),
    };

    testEvents.push(newEvent);

    res.status(201).json({
      message: "Event tracked successfully",
      event_id: newEvent.event_id,
    });
  });

  app.post("/analytics/pageviews", (req, res) => {
    const {
      page_url,
      page_title,
      referrer,
      session_id,
      user_id,
      time_on_page,
      scroll_depth,
    } = req.body;

    if (!page_url || !page_title || !session_id) {
      return res.status(400).json({
        error: "Missing required fields: page_url, page_title, session_id",
      });
    }

    const newPageView = {
      view_id: `view-${testPageViews.length + 1}`,
      user_id: user_id || null,
      session_id,
      page_url,
      page_title,
      referrer: referrer || null,
      time_on_page: time_on_page || null,
      scroll_depth: scroll_depth || null,
      timestamp: new Date().toISOString(),
    };

    testPageViews.push(newPageView);

    res.status(201).json({
      message: "Page view tracked successfully",
      view_id: newPageView.view_id,
    });
  });

  app.post(
    "/analytics/game-interactions",
    (req, res) => {
      const {
        game_id,
        game_title,
        interaction_type,
        interaction_details,
        duration_seconds,
        session_id,
        user_id,
      } = req.body;

      if (!game_id || !game_title || !interaction_type || !session_id) {
        return res.status(400).json({
          error:
            "Missing required fields: game_id, game_title, interaction_type, session_id",
        });
      }

      const newInteraction = {
        interaction_id: `interaction-${testGameInteractions.length + 1}`,
        user_id: user_id || null,
        session_id,
        game_id: parseInt(game_id),
        game_title,
        interaction_type,
        interaction_details: interaction_details || null,
        duration_seconds: duration_seconds || null,
        timestamp: new Date().toISOString(),
      };

      testGameInteractions.push(newInteraction);

      res.status(201).json({
        message: "Game interaction tracked successfully",
        interaction_id: newInteraction.interaction_id,
      });
    }
  );

  app.get("/analytics/dashboard", (req, res) => {
    const { period = "7d" } = req.query;

    const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const filteredEvents = testEvents.filter(
      (event) => new Date(event.timestamp) >= dateFrom
    );
    const filteredPageViews = testPageViews.filter(
      (view) => new Date(view.timestamp) >= dateFrom
    );
    const filteredInteractions = testGameInteractions.filter(
      (interaction) => new Date(interaction.timestamp) >= dateFrom
    );

    const uniqueUsers = new Set([
      ...filteredPageViews.map((view) => view.user_id),
      ...filteredEvents.map((event) => event.user_id),
    ]).size;

    const uniqueSessions = new Set([
      ...filteredPageViews.map((view) => view.session_id),
      ...filteredEvents.map((event) => event.session_id),
    ]).size;

    const topPages = filteredPageViews.reduce((acc, view) => {
      acc[view.page_url] = (acc[view.page_url] || 0) + 1;
      return acc;
    }, {});

    const topPagesArray = Object.entries(topPages)
      .map(([url, count]) => ({ page_url: url, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const deviceBreakdown = [
      { device_type: "desktop", sessions: Math.floor(uniqueSessions * 0.6) },
      { device_type: "mobile", sessions: Math.floor(uniqueSessions * 0.3) },
      { device_type: "tablet", sessions: Math.floor(uniqueSessions * 0.1) },
    ];

    const gameInteractions = filteredInteractions.reduce((acc, interaction) => {
      acc[interaction.interaction_type] =
        (acc[interaction.interaction_type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      period,
      overview: {
        total_views: filteredPageViews.length,
        unique_sessions: uniqueSessions,
        unique_users: uniqueUsers,
        total_events: filteredEvents.length,
        avg_session_duration: Math.floor(Math.random() * 300) + 60,
      },
      top_pages: topPagesArray,
      device_breakdown: deviceBreakdown,
      game_interactions: Object.entries(gameInteractions).map(
        ([type, count]) => ({
          interaction_type: type,
          count,
        })
      ),
    });
  });

  app.get("/analytics/realtime", (req, res) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentEvents = testEvents.filter(
      (event) => new Date(event.timestamp) >= fiveMinutesAgo
    );
    const recentPageViews = testPageViews.filter(
      (view) => new Date(view.timestamp) >= fiveMinutesAgo
    );
    const recentInteractions = testGameInteractions.filter(
      (interaction) => new Date(interaction.timestamp) >= fiveMinutesAgo
    );

    const activeSessions = new Set([
      ...recentPageViews.map((view) => view.session_id),
      ...recentEvents.map((event) => event.session_id),
    ]).size;

    const currentTopPages = recentPageViews.reduce((acc, view) => {
      acc[view.page_url] = (acc[view.page_url] || 0) + 1;
      return acc;
    }, {});

    const currentTopPagesArray = Object.entries(currentTopPages)
      .map(([url, count]) => ({ page_url: url, current_views: count }))
      .sort((a, b) => b.current_views - a.current_views)
      .slice(0, 5);

    res.json({
      active_sessions: activeSessions,
      recent_events: recentEvents.length,
      recent_views: recentPageViews.length,
      current_top_pages: currentTopPagesArray,
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/analytics/reports", (req, res) => {
    const { report_type, date_range } = req.body;

    if (!report_type) {
      return res.status(400).json({
        error: "Missing required field: report_type",
      });
    }

    const reportData = {
      report_id: `report-${Date.now()}`,
      report_type,
      date_range: date_range || "7d",
      generated_at: new Date().toISOString(),
      status: "completed",
      data: {
        summary: {
          total_events: testEvents.length,
          total_page_views: testPageViews.length,
          total_interactions: testGameInteractions.length,
        },
      },
    };

    res.status(201).json({
      message: "Report generated successfully",
      report: reportData,
    });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "healthy", service: "analytics-service" });
  });

  app.get("/metrics", (req, res) => {
    res.set("Content-Type", "text/plain");
    res.send("test_analytics_metrics 1");
  });

  return app;
}

describe("Analytics Service API", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    testEvents = [
      {
        event_id: "event-1",
        user_id: 123,
        session_id: "session-abc",
        event_type: "click",
        event_category: "navigation",
        event_action: "button_click",
        event_label: "header_cta",
        event_value: null,
        page_url: "https://example.com/home",
        referrer: "https://google.com",
        timestamp: new Date().toISOString(),
      },
    ];

    testPageViews = [
      {
        view_id: "view-1",
        user_id: 123,
        session_id: "session-abc",
        page_url: "https://example.com/home",
        page_title: "Home Page",
        referrer: "https://google.com",
        time_on_page: 120,
        scroll_depth: 75.5,
        timestamp: new Date().toISOString(),
      },
    ];

    testGameInteractions = [
      {
        interaction_id: "interaction-1",
        user_id: 123,
        session_id: "session-abc",
        game_id: 1,
        game_title: "Test Game",
        interaction_type: "view",
        duration_seconds: 300,
        timestamp: new Date().toISOString(),
      },
    ];

    requestCounts = {
      events: 0,
      pageviews: 0,
      interactions: 0,
      dashboard: 0,
      realtime: 0,
      reports: 0,
    };
  });

  describe("POST /analytics/events", () => {
    test("should track user events", async () => {
      const eventData = {
        event_type: "click",
        event_category: "navigation",
        event_action: "menu_click",
        event_label: "main_menu",
        page_url: "https://example.com/games",
        session_id: "session-xyz",
        user_id: 456,
      };

      const response = await request(app)
        .post("/analytics/events")
        .send(eventData)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Event tracked successfully"
      );
      expect(response.body).toHaveProperty("event_id");
    });

    test("should return 400 for missing required fields", async () => {
      const incompleteEvent = {
        event_type: "click",
      };

      const response = await request(app)
        .post("/analytics/events")
        .send(incompleteEvent)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });
  });

  describe("POST /analytics/pageviews", () => {
    test("should track page views", async () => {
      const pageViewData = {
        page_url: "https://example.com/games",
        page_title: "Games Page",
        session_id: "session-xyz",
        user_id: 456,
        time_on_page: 180,
        scroll_depth: 85.2,
      };

      const response = await request(app)
        .post("/analytics/pageviews")
        .send(pageViewData)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Page view tracked successfully"
      );
      expect(response.body).toHaveProperty("view_id");
    });

    test("should return 400 for missing required fields", async () => {
      const incompletePageView = {
        page_url: "https://example.com/games",
      };

      const response = await request(app)
        .post("/analytics/pageviews")
        .send(incompletePageView)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });
  });

  describe("POST /analytics/game-interactions", () => {
    test("should track game interactions", async () => {
      const interactionData = {
        game_id: 2,
        game_title: "Test Game 2",
        interaction_type: "purchase",
        session_id: "session-xyz",
        user_id: 456,
        duration_seconds: 420,
      };

      const response = await request(app)
        .post("/analytics/game-interactions")
        .send(interactionData)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Game interaction tracked successfully"
      );
      expect(response.body).toHaveProperty("interaction_id");
    });

    test("should return 400 for missing required fields", async () => {
      const incompleteInteraction = {
        game_id: 2,
      };

      const response = await request(app)
        .post("/analytics/game-interactions")
        .send(incompleteInteraction)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });
  });

  describe("GET /analytics/dashboard", () => {
    test("should return dashboard analytics", async () => {
      const response = await request(app)
        .get("/analytics/dashboard")
        .expect(200);

      expect(response.body).toHaveProperty("period");
      expect(response.body).toHaveProperty("overview");
      expect(response.body).toHaveProperty("top_pages");
      expect(response.body).toHaveProperty("device_breakdown");
      expect(response.body).toHaveProperty("game_interactions");
      expect(response.body.overview).toHaveProperty("total_views");
      expect(response.body.overview).toHaveProperty("unique_sessions");
    });

    test("should accept period parameter", async () => {
      const response = await request(app)
        .get("/analytics/dashboard?period=30d")
        .expect(200);

      expect(response.body.period).toBe("30d");
    });
  });

  describe("GET /analytics/realtime", () => {
    test("should return realtime analytics", async () => {
      const response = await request(app)
        .get("/analytics/realtime")
        .expect(200);

      expect(response.body).toHaveProperty("active_sessions");
      expect(response.body).toHaveProperty("recent_events");
      expect(response.body).toHaveProperty("recent_views");
      expect(response.body).toHaveProperty("current_top_pages");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("POST /analytics/reports", () => {
    test("should generate analytics reports", async () => {
      const reportRequest = {
        report_type: "daily_summary",
        date_range: "7d",
      };

      const response = await request(app)
        .post("/analytics/reports")
        .send(reportRequest)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Report generated successfully"
      );
      expect(response.body).toHaveProperty("report");
      expect(response.body.report).toHaveProperty("report_id");
      expect(response.body.report).toHaveProperty(
        "report_type",
        "daily_summary"
      );
    });

    test("should return 400 for missing report_type", async () => {
      const invalidRequest = {
        date_range: "7d",
      };

      const response = await request(app)
        .post("/analytics/reports")
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty(
        "error",
        "Missing required field: report_type"
      );
    });
  });
});
