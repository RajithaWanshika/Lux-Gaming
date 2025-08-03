const { createClient } = require("@clickhouse/client");
require("dotenv").config();

const getDbConfig = () => {
  if (process.env.NODE_ENV === "production") {
    return {
      url: process.env.CLICKHOUSE_URL,
      username: process.env.CLICKHOUSE_USERNAME,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE,
    };
  } else if (process.env.NODE_ENV === "development") {
    return {
      url: process.env.CLICKHOUSE_URL_DEV,
      username: process.env.CLICKHOUSE_USERNAME_DEV,
      password: process.env.CLICKHOUSE_PASSWORD_DEV,
      database: process.env.CLICKHOUSE_DATABASE_DEV,
    };
  } else {
    return {
      url: process.env.CLICKHOUSE_URL_TEST,
      username: process.env.CLICKHOUSE_USERNAME_TEST,
      password: process.env.CLICKHOUSE_PASSWORD_TEST,
      database: process.env.CLICKHOUSE_DATABASE_TEST,
    };
  }
};

const config = getDbConfig();
const client = createClient({
  ...config,
  clickhouse_settings: {
    async_insert: 1,
    wait_for_async_insert: 0,
  },
});

async function initDB() {
  try {
    await client.command({
      query: `CREATE DATABASE IF NOT EXISTS ${config.database}`,
    });

    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS user_events (
          event_id String,
          user_id Nullable(UInt32),
          session_id String,
          event_type String,
          event_category String,
          event_action String,
          event_label Nullable(String),
          event_value Nullable(Float32),
          page_url String,
          referrer Nullable(String),
          user_agent String,
          ip_address String,
          country Nullable(String),
          city Nullable(String),
          device_type String,
          browser String,
          os String,
          screen_resolution Nullable(String),
          viewport_size Nullable(String),
          timestamp DateTime64(3),
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (timestamp, event_type, user_id)
        TTL timestamp + INTERVAL 2 YEAR
      `,
    });

    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS page_views (
          view_id String,
          user_id Nullable(UInt32),
          session_id String,
          page_url String,
          page_title String,
          referrer Nullable(String),
          utm_source Nullable(String),
          utm_medium Nullable(String),
          utm_campaign Nullable(String),
          user_agent String,
          ip_address String,
          country Nullable(String),
          city Nullable(String),
          device_type String,
          browser String,
          os String,
          screen_resolution Nullable(String),
          viewport_size Nullable(String),
          time_on_page Nullable(UInt32),
          scroll_depth Nullable(Float32),
          timestamp DateTime64(3),
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (timestamp, page_url, user_id)
        TTL timestamp + INTERVAL 2 YEAR
      `,
    });

    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS game_interactions (
          interaction_id String,
          user_id Nullable(UInt32),
          session_id String,
          game_id UInt32,
          game_title String,
          interaction_type String,
          interaction_details Nullable(String),
          duration_seconds Nullable(UInt32),
          user_agent String,
          ip_address String,
          country Nullable(String),
          city Nullable(String),
          device_type String,
          browser String,
          os String,
          timestamp DateTime64(3),
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (timestamp, game_id, interaction_type, user_id)
        TTL timestamp + INTERVAL 2 YEAR
      `,
    });

    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS user_sessions (
          session_id String,
          user_id Nullable(UInt32),
          start_time DateTime64(3),
          end_time Nullable(DateTime64(3)),
          duration_seconds Nullable(UInt32),
          page_views UInt32 DEFAULT 0,
          events UInt32 DEFAULT 0,
          bounce Boolean DEFAULT false,
          conversion_events UInt32 DEFAULT 0,
          entry_page String,
          exit_page Nullable(String),
          referrer Nullable(String),
          utm_source Nullable(String),
          utm_medium Nullable(String),
          utm_campaign Nullable(String),
          user_agent String,
          ip_address String,
          country Nullable(String),
          city Nullable(String),
          device_type String,
          browser String,
          os String,
          created_at DateTime DEFAULT now()
        ) ENGINE = ReplacingMergeTree()
        PARTITION BY toYYYYMM(start_time)
        ORDER BY (session_id, start_time)
        TTL start_time + INTERVAL 2 YEAR
      `,
    });

    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS performance_metrics (
          metric_id String,
          user_id Nullable(UInt32),
          session_id String,
          page_url String,
          metric_type String,
          metric_name String,
          metric_value Float32,
          metric_unit String,
          user_agent String,
          device_type String,
          browser String,
          os String,
          timestamp DateTime64(3),
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (timestamp, metric_type, metric_name)
        TTL timestamp + INTERVAL 1 YEAR
      `,
    });

    console.log("✅ ClickHouse analytics database initialized successfully");

    const result = await client.query({
      query: "SELECT now() as current_time",
      format: "JSONEachRow",
    });
    const data = await result.json();
    console.log(
      "📡 ClickHouse connection established at:",
      data[0].current_time
    );
  } catch (error) {
    console.error(
      "❌ Failed to initialize ClickHouse analytics database:",
      error
    );
    throw error;
  }
}

async function checkDBHealth() {
  try {
    const result = await client.query({
      query: "SELECT 1 as status",
      format: "JSONEachRow",
    });
    await result.json();
    return { status: "healthy", timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("ClickHouse health check failed:", error);
    return {
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function closeDB() {
  try {
    await client.close();
    console.log("📊 ClickHouse analytics connection closed");
  } catch (error) {
    console.error("Error closing ClickHouse connection:", error);
  }
}

process.on("SIGINT", closeDB);
process.on("SIGTERM", closeDB);

module.exports = {
  client,
  initDB,
  checkDBHealth,
  closeDB,
};
