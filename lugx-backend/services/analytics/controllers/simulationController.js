const { client } = require("../db/clickhouse");
const { v4: uuidv4 } = require("uuid");

const SAMPLE_PAGES = [
  { url: "http://localhost:3000/", title: "Lux Gaming - Home" },
  { url: "http://localhost:3000/games", title: "Games Library" },
  { url: "http://localhost:3000/games/1", title: "Game Details - Action Game" },
  {
    url: "http://localhost:3000/games/2",
    title: "Game Details - Adventure Game",
  },
  {
    url: "http://localhost:3000/games/3",
    title: "Game Details - Strategy Game",
  },
  { url: "http://localhost:3000/cart", title: "Shopping Cart" },
  { url: "http://localhost:3000/checkout", title: "Checkout" },
  { url: "http://localhost:3000/profile", title: "User Profile" },
  { url: "http://localhost:3000/orders", title: "My Orders" },
];

const SAMPLE_GAMES = [
  { id: 1, title: "Epic Action Adventure" },
  { id: 2, title: "Strategy Master" },
  { id: 3, title: "Racing Champions" },
  { id: 4, title: "RPG Fantasy World" },
  { id: 5, title: "Puzzle Quest" },
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0",
];

const COUNTRIES = ["US", "UK", "CA", "DE", "FR", "JP", "AU", "BR", "IN", "NL"];
const CITIES = [
  "New York",
  "London",
  "Toronto",
  "Berlin",
  "Paris",
  "Tokyo",
  "Sydney",
  "São Paulo",
  "Mumbai",
  "Amsterdam",
];
const DEVICES = ["desktop", "mobile", "tablet"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Opera"];
const OS_LIST = ["Windows", "macOS", "Linux", "iOS", "Android"];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSessionId() {
  return uuidv4();
}

function generateUserSession() {
  const deviceType = getRandomElement(DEVICES);
  const country = getRandomElement(COUNTRIES);
  const city = getRandomElement(CITIES);

  return {
    session_id: generateSessionId(),
    user_id: Math.random() > 0.3 ? getRandomNumber(1, 100) : null,
    user_agent: getRandomElement(USER_AGENTS),
    ip_address: `${getRandomNumber(1, 255)}.${getRandomNumber(
      1,
      255
    )}.${getRandomNumber(1, 255)}.${getRandomNumber(1, 255)}`,
    country,
    city,
    device_type: deviceType,
    browser: getRandomElement(BROWSERS),
    os: getRandomElement(OS_LIST),
    screen_resolution: deviceType === "mobile" ? "375x812" : "1920x1080",
    viewport_size: deviceType === "mobile" ? "375x667" : "1920x967",
  };
}

exports.simulateRealtimeData = async (req, res) => {
  try {
    const { sessions = 10, duration = 30 } = req.query;
    const sessionCount = Math.min(parseInt(sessions), 50);
    const durationMinutes = Math.min(parseInt(duration), 120);

    console.log(
      `🎯 Starting simulation: ${sessionCount} sessions over ${durationMinutes} minutes`
    );

    const promises = [];

    for (let i = 0; i < sessionCount; i++) {
      promises.push(simulateUserSession(durationMinutes));
    }

    await Promise.all(promises);

    res.json({
      message: "Simulation completed successfully",
      sessions_simulated: sessionCount,
      duration_minutes: durationMinutes,
      estimated_events: sessionCount * 15,
    });
  } catch (error) {
    console.error("Simulation error:", error);
    res.status(500).json({ error: "Failed to run simulation" });
  }
};

async function simulateUserSession(durationMinutes = 30) {
  const session = generateUserSession();
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const pageViews = getRandomNumber(3, 12);
  let currentTime = new Date(startTime);

  for (let i = 0; i < pageViews; i++) {
    const page = getRandomElement(SAMPLE_PAGES);
    const timeOnPage = getRandomNumber(15, 300);
    const scrollDepth = getRandomNumber(20, 100);

    const pageViewData = {
      view_id: uuidv4(),
      user_id: session.user_id,
      session_id: session.session_id,
      page_url: page.url,
      page_title: page.title,
      referrer:
        i === 0 ? "https://google.com" : SAMPLE_PAGES[i - 1]?.url || null,
      utm_source:
        i === 0
          ? getRandomElement(["google", "facebook", "direct", "twitter"])
          : null,
      utm_medium:
        i === 0
          ? getRandomElement(["organic", "cpc", "social", "email"])
          : null,
      utm_campaign:
        i === 0
          ? getRandomElement(["summer_sale", "new_games", "weekend_deals"])
          : null,
      user_agent: session.user_agent,
      ip_address: session.ip_address,
      country: session.country,
      city: session.city,
      device_type: session.device_type,
      browser: session.browser,
      os: session.os,
      screen_resolution: session.screen_resolution,
      viewport_size: session.viewport_size,
      time_on_page: timeOnPage,
      scroll_depth: scrollDepth,
      timestamp: currentTime.toISOString(),
    };

    await client.insert({
      table: "page_views",
      values: [pageViewData],
      format: "JSONEachRow",
    });

    const eventsOnPage = getRandomNumber(2, 8);
    for (let j = 0; j < eventsOnPage; j++) {
      const eventTime = new Date(
        currentTime.getTime() + (j * timeOnPage * 1000) / eventsOnPage
      );

      const eventData = {
        event_id: uuidv4(),
        user_id: session.user_id,
        session_id: session.session_id,
        event_type: getRandomElement([
          "click",
          "scroll",
          "hover",
          "form_submit",
          "search",
        ]),
        event_category: getRandomElement([
          "navigation",
          "interaction",
          "engagement",
          "conversion",
        ]),
        event_action: getRandomElement([
          "button_click",
          "link_click",
          "scroll_50",
          "scroll_100",
          "search_submit",
        ]),
        event_label: getRandomElement([
          "header_nav",
          "footer_link",
          "product_card",
          "cta_button",
        ]),
        event_value: Math.random() > 0.7 ? getRandomNumber(1, 100) : null,
        page_url: page.url,
        referrer: pageViewData.referrer,
        user_agent: session.user_agent,
        ip_address: session.ip_address,
        country: session.country,
        city: session.city,
        device_type: session.device_type,
        browser: session.browser,
        os: session.os,
        screen_resolution: session.screen_resolution,
        viewport_size: session.viewport_size,
        timestamp: eventTime.toISOString(),
      };

      await client.insert({
        table: "user_events",
        values: [eventData],
        format: "JSONEachRow",
      });
    }

    if (page.url.includes("/games/")) {
      const gameId = parseInt(page.url.split("/games/")[1]);
      const game = SAMPLE_GAMES.find((g) => g.id === gameId) || SAMPLE_GAMES[0];

      const interactionData = {
        interaction_id: uuidv4(),
        user_id: session.user_id,
        session_id: session.session_id,
        game_id: game.id,
        game_title: game.title,
        interaction_type: getRandomElement([
          "view",
          "wishlist_add",
          "cart_add",
          "purchase",
        ]),
        interaction_details: JSON.stringify({
          source: "game_page",
          category: "action",
        }),
        duration_seconds: timeOnPage,
        user_agent: session.user_agent,
        ip_address: session.ip_address,
        country: session.country,
        city: session.city,
        device_type: session.device_type,
        browser: session.browser,
        os: session.os,
        timestamp: currentTime.toISOString(),
      };

      await client.insert({
        table: "game_interactions",
        values: [interactionData],
        format: "JSONEachRow",
      });
    }

    currentTime = new Date(currentTime.getTime() + timeOnPage * 1000);
  }

  const sessionData = {
    session_id: session.session_id,
    user_id: session.user_id,
    start_time: startTime.toISOString(),
    end_time: currentTime.toISOString(),
    duration_seconds: Math.floor((currentTime - startTime) / 1000),
    page_views: pageViews,
    events: pageViews * getRandomNumber(2, 8),
    bounce: pageViews === 1,
    conversion_events: pageViews > 5 ? getRandomNumber(0, 2) : 0,
    entry_page: SAMPLE_PAGES[0].url,
    exit_page: SAMPLE_PAGES[pageViews - 1]?.url || SAMPLE_PAGES[0].url,
    referrer: "https://google.com",
    utm_source: getRandomElement(["google", "facebook", "direct"]),
    utm_medium: getRandomElement(["organic", "cpc", "social"]),
    utm_campaign: getRandomElement(["summer_sale", "new_games"]),
    user_agent: session.user_agent,
    ip_address: session.ip_address,
    country: session.country,
    city: session.city,
    device_type: session.device_type,
    browser: session.browser,
    os: session.os,
  };

  await client.insert({
    table: "user_sessions",
    values: [sessionData],
    format: "JSONEachRow",
  });
}

exports.simulateHistoricalData = async (req, res) => {
  try {
    const { days = 7, sessions_per_day = 50 } = req.query;
    const dayCount = Math.min(parseInt(days), 30);
    const sessionsPerDay = Math.min(parseInt(sessions_per_day), 200);

    console.log(
      `📈 Generating historical data: ${dayCount} days, ${sessionsPerDay} sessions/day`
    );

    for (let day = dayCount; day >= 0; day--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - day);
      dayStart.setHours(0, 0, 0, 0);

      for (let session = 0; session < sessionsPerDay; session++) {
        const sessionStart = new Date(
          dayStart.getTime() + Math.random() * 24 * 60 * 60 * 1000
        );
        await simulateHistoricalSession(sessionStart);
      }
    }

    res.json({
      message: "Historical data simulation completed",
      days_generated: dayCount,
      sessions_per_day: sessionsPerDay,
      total_sessions: dayCount * sessionsPerDay,
    });
  } catch (error) {
    console.error("Historical simulation error:", error);
    res.status(500).json({ error: "Failed to generate historical data" });
  }
};

async function simulateHistoricalSession(startTime) {
  const session = generateUserSession();
  const sessionDuration = getRandomNumber(60, 1800);
  const endTime = new Date(startTime.getTime() + sessionDuration * 1000);

  const pageViews = getRandomNumber(1, 8);
  let currentTime = new Date(startTime);

  for (let i = 0; i < pageViews; i++) {
    const page = getRandomElement(SAMPLE_PAGES);
    const timeOnPage = getRandomNumber(10, 180);

    const pageViewData = {
      view_id: uuidv4(),
      user_id: session.user_id,
      session_id: session.session_id,
      page_url: page.url,
      page_title: page.title,
      referrer: i === 0 ? "https://google.com" : null,
      utm_source: getRandomElement([
        "google",
        "facebook",
        "direct",
        null,
        null,
      ]),
      utm_medium: getRandomElement(["organic", "cpc", "social", null, null]),
      utm_campaign: getRandomElement(["summer_sale", "new_games", null, null]),
      user_agent: session.user_agent,
      ip_address: session.ip_address,
      country: session.country,
      city: session.city,
      device_type: session.device_type,
      browser: session.browser,
      os: session.os,
      screen_resolution: session.screen_resolution,
      viewport_size: session.viewport_size,
      time_on_page: timeOnPage,
      scroll_depth: getRandomNumber(10, 100),
      timestamp: currentTime.toISOString(),
    };

    await client.insert({
      table: "page_views",
      values: [pageViewData],
      format: "JSONEachRow",
    });

    currentTime = new Date(currentTime.getTime() + timeOnPage * 1000);
  }
}

exports.clearAnalyticsData = async (req, res) => {
  try {
    const { confirm } = req.query;

    if (confirm !== "yes") {
      return res.status(400).json({
        error: "Please add ?confirm=yes to clear all analytics data",
      });
    }

    await client.command({ query: "TRUNCATE TABLE user_events" });
    await client.command({ query: "TRUNCATE TABLE page_views" });
    await client.command({ query: "TRUNCATE TABLE game_interactions" });
    await client.command({ query: "TRUNCATE TABLE user_sessions" });
    await client.command({ query: "TRUNCATE TABLE performance_metrics" });

    res.json({
      message: "All analytics data cleared successfully",
    });
  } catch (error) {
    console.error("Clear data error:", error);
    res.status(500).json({ error: "Failed to clear analytics data" });
  }
};
