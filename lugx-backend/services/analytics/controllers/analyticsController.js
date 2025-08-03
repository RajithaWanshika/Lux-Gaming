const { client } = require("../db/clickhouse");
const { v4: uuidv4 } = require("uuid");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

exports.trackEvent = async (req, res) => {
  try {
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

    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const geo = geoip.lookup(ipAddress);
    const ua = UAParser(userAgent);

    const eventData = {
      event_id: uuidv4(),
      user_id: user_id || null,
      session_id,
      event_type,
      event_category,
      event_action,
      event_label: event_label || null,
      event_value: event_value || null,
      page_url,
      referrer: referrer || null,
      user_agent: userAgent,
      ip_address: ipAddress,
      country: geo?.country || null,
      city: geo?.city || null,
      device_type: ua.device.type || "desktop",
      browser: ua.browser.name || "unknown",
      os: ua.os.name || "unknown",
      screen_resolution: req.body.screen_resolution || null,
      viewport_size: req.body.viewport_size || null,
      timestamp: new Date().toISOString(),
    };

    await client.insert({
      table: "user_events",
      values: [eventData],
      format: "JSONEachRow",
    });

    res.status(201).json({
      message: "Event tracked successfully",
      event_id: eventData.event_id,
    });
  } catch (error) {
    console.error("Error tracking event:", error);
    res.status(500).json({ error: "Failed to track event" });
  }
};

exports.trackPageView = async (req, res) => {
  try {
    const {
      page_url,
      page_title,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
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

    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const geo = geoip.lookup(ipAddress);
    const ua = UAParser(userAgent);

    const pageViewData = {
      view_id: uuidv4(),
      user_id: user_id || null,
      session_id,
      page_url,
      page_title,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      user_agent: userAgent,
      ip_address: ipAddress,
      country: geo?.country || null,
      city: geo?.city || null,
      device_type: ua.device.type || "desktop",
      browser: ua.browser.name || "unknown",
      os: ua.os.name || "unknown",
      screen_resolution: req.body.screen_resolution || null,
      viewport_size: req.body.viewport_size || null,
      time_on_page: time_on_page || null,
      scroll_depth: scroll_depth || null,
      timestamp: new Date().toISOString(),
    };

    await client.insert({
      table: "page_views",
      values: [pageViewData],
      format: "JSONEachRow",
    });

    res.status(201).json({
      message: "Page view tracked successfully",
      view_id: pageViewData.view_id,
    });
  } catch (error) {
    console.error("Error tracking page view:", error);
    res.status(500).json({ error: "Failed to track page view" });
  }
};

exports.trackGameInteraction = async (req, res) => {
  try {
    const {
      interaction_type,
      game_id,
      interaction_details,
      session_id,
      user_id,
      duration,
    } = req.body;

    if (!interaction_type || !game_id || !session_id) {
      return res.status(400).json({
        error: "Missing required fields: interaction_type, game_id, session_id",
      });
    }

    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const geo = geoip.lookup(ipAddress);
    const ua = UAParser(userAgent);

    const interactionData = {
      interaction_id: uuidv4(),
      user_id: user_id || null,
      session_id,
      interaction_type,
      game_id: parseInt(game_id),
      interaction_details: interaction_details || null,
      user_agent: userAgent,
      ip_address: ipAddress,
      country: geo?.country || null,
      city: geo?.city || null,
      device_type: ua.device.type || "desktop",
      browser: ua.browser.name || "unknown",
      os: ua.os.name || "unknown",
      duration: duration || null,
      timestamp: new Date().toISOString(),
    };

    await client.insert({
      table: "game_interactions",
      values: [interactionData],
      format: "JSONEachRow",
    });

    res.status(201).json({
      message: "Game interaction tracked successfully",
      interaction_id: interactionData.interaction_id,
    });
  } catch (error) {
    console.error("Error tracking game interaction:", error);
    res.status(500).json({ error: "Failed to track game interaction" });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { period = "7d", timezone = "UTC" } = req.query;

    let dateFilter = "";
    switch (period) {
      case "1d":
        dateFilter = "timestamp >= now() - INTERVAL 1 DAY";
        break;
      case "7d":
        dateFilter = "timestamp >= now() - INTERVAL 7 DAY";
        break;
      case "30d":
        dateFilter = "timestamp >= now() - INTERVAL 30 DAY";
        break;
      case "90d":
        dateFilter = "timestamp >= now() - INTERVAL 90 DAY";
        break;
      default:
        dateFilter = "timestamp >= now() - INTERVAL 7 DAY";
    }

    const pageViewsResult = await client.query({
      query: `
        SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT session_id) as unique_sessions,
          COUNT(DISTINCT user_id) as unique_users
        FROM page_views 
        WHERE ${dateFilter}
      `,
      format: "JSONEachRow",
    });

    const topPagesResult = await client.query({
      query: `
        SELECT 
          page_url,
          COUNT(*) as views,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM page_views 
        WHERE ${dateFilter}
        GROUP BY page_url
        ORDER BY views DESC
        LIMIT 10
      `,
      format: "JSONEachRow",
    });

    const deviceBreakdownResult = await client.query({
      query: `
        SELECT 
          device_type,
          COUNT(*) as sessions,
          COUNT(*) * 100.0 / (SELECT COUNT(*) FROM page_views WHERE ${dateFilter}) as percentage
        FROM page_views 
        WHERE ${dateFilter}
        GROUP BY device_type
        ORDER BY sessions DESC
      `,
      format: "JSONEachRow",
    });

    const topCountriesResult = await client.query({
      query: `
        SELECT 
          country,
          COUNT(DISTINCT session_id) as sessions
        FROM page_views 
        WHERE ${dateFilter} AND country IS NOT NULL
        GROUP BY country
        ORDER BY sessions DESC
        LIMIT 10
      `,
      format: "JSONEachRow",
    });

    const gameInteractionsResult = await client.query({
      query: `
        SELECT 
          interaction_type,
          COUNT(*) as count
        FROM game_interactions 
        WHERE ${dateFilter}
        GROUP BY interaction_type
        ORDER BY count DESC
      `,
      format: "JSONEachRow",
    });

    const [
      pageViews,
      topPages,
      deviceBreakdown,
      topCountries,
      gameInteractions,
    ] = await Promise.all([
      pageViewsResult.json(),
      topPagesResult.json(),
      deviceBreakdownResult.json(),
      topCountriesResult.json(),
      gameInteractionsResult.json(),
    ]);

    res.json({
      period,
      timezone,
      overview: pageViews[0] || {
        total_views: 0,
        unique_sessions: 0,
        unique_users: 0,
      },
      top_pages: topPages,
      device_breakdown: deviceBreakdown,
      top_countries: topCountries,
      game_interactions: gameInteractions,
    });
  } catch (err) {
    console.error("Get dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

exports.getRealTimeAnalytics = async (req, res) => {
  try {
    const activeUsersResult = await client.query({
      query: `
        SELECT COUNT(DISTINCT session_id) as active_sessions
        FROM page_views 
        WHERE timestamp >= now() - INTERVAL 5 MINUTE
      `,
      format: "JSONEachRow",
    });

    const recentViewsResult = await client.query({
      query: `
        SELECT 
          toStartOfInterval(timestamp, INTERVAL 5 MINUTE) as time_bucket,
          COUNT(*) as page_views
        FROM page_views 
        WHERE timestamp >= now() - INTERVAL 1 HOUR
        GROUP BY time_bucket
        ORDER BY time_bucket DESC
      `,
      format: "JSONEachRow",
    });

    const currentPagesResult = await client.query({
      query: `
        SELECT 
          page_url,
          COUNT(*) as current_views
        FROM page_views 
        WHERE timestamp >= now() - INTERVAL 10 MINUTE
        GROUP BY page_url
        ORDER BY current_views DESC
        LIMIT 5
      `,
      format: "JSONEachRow",
    });

    const [activeUsers, recentViews, currentPages] = await Promise.all([
      activeUsersResult.json(),
      recentViewsResult.json(),
      currentPagesResult.json(),
    ]);

    res.json({
      active_sessions: activeUsers[0]?.active_sessions || 0,
      recent_views: recentViews,
      current_top_pages: currentPages,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Get real-time analytics error:", err);
    res.status(500).json({ error: "Failed to fetch real-time analytics" });
  }
};
