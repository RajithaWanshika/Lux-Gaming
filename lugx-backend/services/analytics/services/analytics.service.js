const { client } = require("../db/clickhouse");

class AnalyticsService {
  static async getConversionFunnel(startDate, endDate, gameId = null) {
    try {
      let gameFilter = "";
      if (gameId) {
        gameFilter = `AND game_id = ${parseInt(gameId)}`;
      }

      const result = await client.query({
        query: `
          SELECT 
            funnel_step,
            COUNT(DISTINCT user_id) as users,
            COUNT(DISTINCT session_id) as sessions,
            AVG(step_duration_seconds) as avg_duration
          FROM conversion_funnel 
          WHERE timestamp BETWEEN '${startDate}' AND '${endDate}' ${gameFilter}
          GROUP BY funnel_step
          ORDER BY step_order ASC
        `,
        format: "JSONEachRow",
      });

      const funnelData = await result.json();

      let previousUsers = null;
      const funnelWithRates = funnelData.map((step) => {
        const conversionRate = previousUsers
          ? (step.users / previousUsers) * 100
          : 100;
        previousUsers = step.users;

        return {
          ...step,
          conversion_rate: Math.round(conversionRate * 100) / 100,
        };
      });

      return funnelWithRates;
    } catch (error) {
      console.error("Error calculating conversion funnel:", error);
      throw error;
    }
  }

  static async getUserBehaviorAnalytics(startDate, endDate) {
    try {
      const sessionAnalysisResult = await client.query({
        query: `
          SELECT 
            quantile(0.5)(duration_seconds) as median_session_duration,
            quantile(0.95)(duration_seconds) as p95_session_duration,
            AVG(page_views) as avg_page_views,
            AVG(events) as avg_events,
            SUM(bounce) * 100.0 / COUNT(*) as bounce_rate
          FROM user_sessions 
          WHERE start_time BETWEEN '${startDate}' AND '${endDate}'
            AND duration_seconds IS NOT NULL
        `,
        format: "JSONEachRow",
      });

      const userFlowsResult = await client.query({
        query: `
          SELECT 
            entry_page,
            exit_page,
            COUNT(*) as session_count,
            AVG(duration_seconds) as avg_duration
          FROM user_sessions 
          WHERE start_time BETWEEN '${startDate}' AND '${endDate}'
            AND exit_page IS NOT NULL
          GROUP BY entry_page, exit_page
          HAVING session_count > 10
          ORDER BY session_count DESC
          LIMIT 20
        `,
        format: "JSONEachRow",
      });

      const deviceAnalysisResult = await client.query({
        query: `
          SELECT 
            device_type,
            browser,
            COUNT(*) as sessions,
            AVG(duration_seconds) as avg_duration,
            SUM(bounce) * 100.0 / COUNT(*) as bounce_rate
          FROM user_sessions 
          WHERE start_time BETWEEN '${startDate}' AND '${endDate}'
          GROUP BY device_type, browser
          HAVING sessions > 5
          ORDER BY sessions DESC
        `,
        format: "JSONEachRow",
      });

      const [sessionAnalysis, userFlows, deviceAnalysis] = await Promise.all([
        sessionAnalysisResult.json(),
        userFlowsResult.json(),
        deviceAnalysisResult.json(),
      ]);

      return {
        session_analysis: sessionAnalysis[0] || {},
        user_flows: userFlows,
        device_analysis: deviceAnalysis,
      };
    } catch (error) {
      console.error("Error getting user behavior analytics:", error);
      throw error;
    }
  }

  static async getGamePerformanceMetrics(startDate, endDate) {
    try {
      const result = await client.query({
        query: `
          SELECT 
            game_id,
            game_title,
            countIf(interaction_type = 'view') as views,
            countIf(interaction_type = 'wishlist_add') as wishlist_adds,
            countIf(interaction_type = 'cart_add') as cart_adds,
            countIf(interaction_type = 'purchase') as purchases,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(duration_seconds) as avg_interaction_duration,
            purchases * 100.0 / views as conversion_rate
          FROM game_interactions 
          WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
          GROUP BY game_id, game_title
          HAVING views > 0
          ORDER BY views DESC
          LIMIT 50
        `,
        format: "JSONEachRow",
      });

      const gameMetrics = await result.json();

      return gameMetrics.map((game) => ({
        ...game,
        conversion_rate: Math.round((game.conversion_rate || 0) * 100) / 100,
      }));
    } catch (error) {
      console.error("Error getting game performance metrics:", error);
      throw error;
    }
  }

  static async getTrafficSourcesAnalysis(startDate, endDate) {
    try {
      const result = await client.query({
        query: `
          SELECT 
            CASE 
              WHEN utm_source IS NOT NULL THEN utm_source
              WHEN referrer LIKE '%google%' THEN 'Google'
              WHEN referrer LIKE '%facebook%' THEN 'Facebook'
              WHEN referrer LIKE '%twitter%' THEN 'Twitter'
              WHEN referrer LIKE '%youtube%' THEN 'YouTube'
              WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
              ELSE 'Other'
            END as source,
            utm_medium,
            utm_campaign,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(*) as page_views,
            AVG(time_on_page) as avg_time_on_page,
            COUNT(DISTINCT user_id) as unique_users
          FROM page_views 
          WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
          GROUP BY source, utm_medium, utm_campaign
          ORDER BY sessions DESC
        `,
        format: "JSONEachRow",
      });

      return await result.json();
    } catch (error) {
      console.error("Error getting traffic sources analysis:", error);
      throw error;
    }
  }

  static async getRealTimeMetrics() {
    try {
      const activeUsersResult = await client.query({
        query: `
          SELECT 
            'last_5min' as period,
            COUNT(DISTINCT session_id) as active_sessions,
            COUNT(*) as page_views
          FROM page_views 
          WHERE timestamp >= now() - INTERVAL 5 MINUTE
          
          UNION ALL
          
          SELECT 
            'last_30min' as period,
            COUNT(DISTINCT session_id) as active_sessions,
            COUNT(*) as page_views
          FROM page_views 
          WHERE timestamp >= now() - INTERVAL 30 MINUTE
          
          UNION ALL
          
          SELECT 
            'last_hour' as period,
            COUNT(DISTINCT session_id) as active_sessions,
            COUNT(*) as page_views
          FROM page_views 
          WHERE timestamp >= now() - INTERVAL 1 HOUR
        `,
        format: "JSONEachRow",
      });

      const recentEventsResult = await client.query({
        query: `
          SELECT 
            event_category,
            event_action,
            COUNT(*) as event_count
          FROM user_events 
          WHERE timestamp >= now() - INTERVAL 10 MINUTE
          GROUP BY event_category, event_action
          ORDER BY event_count DESC
          LIMIT 10
        `,
        format: "JSONEachRow",
      });

      const [activeUsers, recentEvents] = await Promise.all([
        activeUsersResult.json(),
        recentEventsResult.json(),
      ]);

      const activeUsersMap = {};
      activeUsers.forEach((period) => {
        activeUsersMap[period.period] = {
          active_sessions: period.active_sessions,
          page_views: period.page_views,
        };
      });

      return {
        active_users: activeUsersMap,
        recent_events: recentEvents,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting real-time metrics:", error);
      throw error;
    }
  }

  static async generateCustomReport(config) {
    try {
      const {
        metrics,
        dimensions,
        filters,
        startDate,
        endDate,
        limit = 100,
      } = config;

      let selectClause = dimensions.join(", ");
      if (metrics.length > 0) {
        selectClause += ", " + metrics.join(", ");
      }

      let whereClause = `timestamp BETWEEN '${startDate}' AND '${endDate}'`;
      if (filters && filters.length > 0) {
        whereClause += " AND " + filters.join(" AND ");
      }

      const query = `
        SELECT ${selectClause}
        FROM page_views 
        WHERE ${whereClause}
        GROUP BY ${dimensions.join(", ")}
        ORDER BY ${metrics[0] || dimensions[0]} DESC
        LIMIT ${limit}
      `;

      const result = await client.query({
        query,
        format: "JSONEachRow",
      });

      return await result.json();
    } catch (error) {
      console.error("Error generating custom report:", error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
