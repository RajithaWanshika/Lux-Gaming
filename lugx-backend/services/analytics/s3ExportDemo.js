const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();
const clickHouse = require("./clickhouse");

class DemoS3ExportService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = process.env.S3_BUCKET_NAME || "lugx-analytics";
    this.uploadInterval = parseInt(process.env.UPLOAD_INTERVAL_MINUTES) || 10;

    this.lastUploadTime = new Date();

    console.log(
      `Demo S3 Export: Uploading CSV data every ${this.uploadInterval} minutes to ${this.bucketName}`
    );
    console.log(
      `Initial lastUploadTime (UTC): ${this.lastUploadTime.toISOString()}`
    );
    console.log(
      `Initial lastUploadTime (IST): ${this.lastUploadTime.toLocaleString(
        "en-IN",
        { timeZone: "Asia/Kolkata" }
      )}`
    );

    setTimeout(() => this.testS3Connection(), 5000);

    this.startScheduledUploads();
  }

  async testS3Connection() {
    try {
      console.log("Testing S3 connection and credentials...");

      const { ListBucketsCommand } = require("@aws-sdk/client-s3");
      const command = new ListBucketsCommand({});
      const result = await this.s3Client.send(command);

      console.log("S3 Authentication successful!");
      console.log(
        `Available buckets: ${
          result.Buckets?.map((b) => b.Name).join(", ") || "None"
        }`
      );

      const bucketExists = result.Buckets?.some(
        (bucket) => bucket.Name === this.bucketName
      );
      if (bucketExists) {
        console.log(`Target bucket '${this.bucketName}' exists and accessible`);
      } else {
        console.log(
          `Target bucket '${this.bucketName}' NOT found in your AWS account`
        );
        console.log(`You may need to create it or check bucket permissions`);
      }

      return true;
    } catch (error) {
      console.error("S3 Connection test failed:", error.name, error.message);
      if (error.name === "CredentialsError") {
        console.log("Check your AWS credentials");
      } else if (error.name === "UnknownEndpoint") {
        console.log("Check your AWS region setting");
      }
      return false;
    }
  }

  startScheduledUploads() {
    setInterval(async () => {
      console.log("Starting scheduled S3 upload...");
      await this.uploadRecentAnalytics();
    }, this.uploadInterval * 60 * 1000);

    setTimeout(async () => {
      console.log("Initial S3 upload starting...");
      await this.uploadRecentAnalytics();
    }, 30000);
  }

  async uploadRecentAnalytics() {
    try {
      const now = new Date();
      const timestamp = this.formatTimestamp(now);

      const startTime = this.lastUploadTime;
      const endTime = now;

      console.log(`Time window check:`);
      console.log(`  - Start (UTC): ${startTime.toISOString()}`);
      console.log(`  - End (UTC): ${endTime.toISOString()}`);
      console.log(
        `  - Start (IST): ${startTime.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`
      );
      console.log(
        `  - End (IST): ${endTime.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`
      );
      console.log(
        `  - Duration: ${Math.round((endTime - startTime) / 1000)} seconds`
      );

      const hasData = await this.hasMeaningfulData(startTime, endTime);

      if (!hasData) {
        console.log(
          `⏭️ Skipping upload - no meaningful data in specified time range`
        );

        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        console.log(`🔍 Checking for any data in last hour...`);
        const recentData = await this.hasMeaningfulData(oneHourAgo, now);
        console.log(`🔍 Found data in last hour: ${recentData}`);

        this.lastUploadTime = now;
        return { success: true, skipped: true, reason: "no_meaningful_data" };
      }

      console.log(`✅ Found meaningful data, proceeding with upload...`);

      const uploads = await Promise.allSettled([
        this.uploadAggregatedPageViews(startTime, endTime, timestamp),
        this.uploadAggregatedClickEvents(startTime, endTime, timestamp),
        this.uploadAggregatedSessions(startTime, endTime, timestamp),
        this.uploadAggregatedScrollDepth(startTime, endTime, timestamp),
        this.uploadRealTimeMetrics(timestamp),
      ]);

      const successful = uploads.filter(
        (result) => result.status === "fulfilled" && result.value !== null
      ).length;

      if (successful > 0) {
        console.log(
          `✅ S3 Upload completed: ${successful}/${uploads.length} files uploaded`
        );
      } else {
        console.log(`⏭️ All uploads skipped - aggregated data was empty`);
      }

      this.lastUploadTime = now;
      return {
        success: true,
        uploads: successful,
        total: uploads.length,
        timestamp,
      };
    } catch (error) {
      console.error("❌ Error in scheduled S3 upload:", error);
      return { success: false, error: error.message };
    }
  }

  async hasMeaningfulData(startTime, endTime) {
    try {
      const [pageViews, clickEvents, sessions, scrollDepth] = await Promise.all(
        [
          this.getRecordCount("page_views_stream", startTime, endTime),
          this.getRecordCount("click_events_stream", startTime, endTime),
          this.getRecordCount("sessions_stream", startTime, endTime),
          this.getRecordCount("scroll_depth_stream", startTime, endTime),
        ]
      );

      return (
        pageViews > 0 || clickEvents > 0 || sessions > 0 || scrollDepth > 0
      );
    } catch (error) {
      console.error("Error checking for meaningful data:", error);
      return true;
    }
  }

  async getRecordCount(table, startTime, endTime) {
    try {
      if (!clickHouse.isConnected) {
        console.log(`❌ ClickHouse not connected for ${table}`);
        return 0;
      }

      console.log(`🔍 Querying ${table}:`);
      console.log(
        `    Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
      );

      const result = await clickHouse.client.query({
        query: `
          SELECT COUNT(*) as count
          FROM lugx_analytics.${table}
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}'
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
        `,
        format: "JSONEachRow",
      });

      const data = await result.json();
      const count = parseInt(data[0]?.count || 0);
      console.log(`    Result: ${count} records`);

      if (count === 0) {
        try {
          const recentResult = await clickHouse.client.query({
            query: `
              SELECT COUNT(*) as total, MAX(timestamp) as latest 
              FROM lugx_analytics.${table}
            `,
            format: "JSONEachRow",
          });

          const recent = await recentResult.json();
          console.log(
            `    🔍 Table stats: ${
              recent[0]?.total || 0
            } total records, latest: ${recent[0]?.latest || "none"}`
          );
        } catch (e) {
          console.log(`    ⚠️ Could not get table stats: ${e.message}`);
        }
      }

      return count;
    } catch (error) {
      console.error(`❌ Error counting records in ${table}:`, error);
      return 0;
    }
  }

  async uploadAggregatedPageViews(startTime, endTime, timestamp) {
    try {
      const aggregatedData = await this.getAggregatedPageViews(
        startTime,
        endTime
      );

      if (aggregatedData.length === 0) {
        console.log("📄 No page views to upload");
        return null;
      }

      const dateFolder = this.getDateFolder(endTime);
      const fileName = `page-views/${dateFolder}/page_views_${timestamp}.csv`;

      const csvData = this.convertToCSV(aggregatedData, [
        "page_url",
        "page_title",
        "view_count",
        "unique_users",
        "unique_sessions",
        "avg_time_on_page",
        "device",
        "referrer",
        "user_agent",
        "ip_address",
        "avg_viewport_width",
        "avg_viewport_height",
        "time_bucket",
        "date",
        "hour",
        "minute",
      ]);

      await this.uploadCSVToS3(fileName, csvData, {
        dataType: "page_views",
        timeRange: { start: startTime, end: endTime },
        recordCount: aggregatedData.length,
      });

      console.log(
        `📊 Page views uploaded: ${aggregatedData.length} records -> ${fileName}`
      );
      return fileName;
    } catch (error) {
      console.error("Error uploading page views:", error);
      return null;
    }
  }

  async uploadAggregatedClickEvents(startTime, endTime, timestamp) {
    try {
      const aggregatedData = await this.getAggregatedClickEvents(
        startTime,
        endTime
      );

      if (aggregatedData.length === 0) {
        console.log("🖱️ No click events to upload");
        return null;
      }

      const dateFolder = this.getDateFolder(endTime);
      const fileName = `click-events/${dateFolder}/click_events_${timestamp}.csv`;

      const csvData = this.convertToCSV(aggregatedData, [
        "page_url",
        "element_type",
        "element_text",
        "element_id",
        "element_class",
        "click_count",
        "unique_users",
        "unique_sessions",
        "avg_click_x",
        "avg_click_y",
        "time_bucket",
        "date",
        "hour",
        "minute",
      ]);

      await this.uploadCSVToS3(fileName, csvData, {
        dataType: "click_events",
        timeRange: { start: startTime, end: endTime },
        recordCount: aggregatedData.length,
      });

      console.log(
        `🖱️ Click events uploaded: ${aggregatedData.length} records -> ${fileName}`
      );
      return fileName;
    } catch (error) {
      console.error("Error uploading click events:", error);
      return null;
    }
  }

  async uploadAggregatedSessions(startTime, endTime, timestamp) {
    try {
      const sessionData = await this.getSessionSummary(startTime, endTime);

      if (sessionData.length === 0) {
        console.log("🔄 No session data to upload");
        return null;
      }

      const dateFolder = this.getDateFolder(endTime);
      const fileName = `sessions/${dateFolder}/sessions_${timestamp}.csv`;

      const csvData = this.convertToCSV(sessionData, [
        "user_id",
        "session_id",
        "start_time",
        "end_time",
        "duration",
        "page_count",
        "initial_referrer",
        "initial_user_agent",
        "ip_address",
        "hour_bucket",
        "date",
        "hour",
        "minute",
        "session_duration_category",
      ]);

      await this.uploadCSVToS3(fileName, csvData, {
        dataType: "sessions",
        timeRange: { start: startTime, end: endTime },
        recordCount: sessionData.length,
      });

      console.log(
        `🔄 Sessions uploaded: ${sessionData.length} records -> ${fileName}`
      );
      return fileName;
    } catch (error) {
      console.error("Error uploading sessions:", error);
      return null;
    }
  }

  async uploadRealTimeMetrics(timestamp) {
    try {
      const metrics = await this.getRealTimeMetrics();

      if (!this.hasNonZeroMetrics(metrics)) {
        console.log("📈 All metrics are zero - skipping metrics upload");
        return null;
      }

      const dateFolder = this.getDateFolder(new Date());
      const fileName = `metrics/${dateFolder}/metrics_${timestamp}.csv`;

      // Flatten metrics for CSV
      const flatMetrics = [
        {
          timestamp: new Date().toISOString(),
          page_views: metrics.last_hour?.page_views || 0,
          click_events: metrics.last_hour?.click_events || 0,
          active_sessions: metrics.last_hour?.active_sessions || 0,
        },
      ];

      const csvData = this.convertToCSV(flatMetrics, [
        "timestamp",
        "page_views",
        "click_events",
        "active_sessions",
      ]);

      await this.uploadCSVToS3(fileName, csvData, {
        dataType: "real_time_metrics",
        recordCount: 1,
        timestamp: new Date(),
      });

      console.log(`📈 Real-time metrics uploaded -> ${fileName}`);
      return fileName;
    } catch (error) {
      console.error("Error uploading real-time metrics:", error);
      return null;
    }
  }

  hasNonZeroMetrics(metrics) {
    if (!metrics || !metrics.last_hour) return false;

    const { page_views, click_events, active_sessions } = metrics.last_hour;
    return page_views > 0 || click_events > 0 || active_sessions > 0;
  }

  async getAggregatedPageViews(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];

      const result = await clickHouse.client.query({
        query: `
          SELECT 
            page_url,
            page_title,
            COUNT(*) as view_count,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT session_id) as unique_sessions,
            AVG(time_on_page) as avg_time_on_page,
            device,
            referrer,
            user_agent,
            ip_address,
            AVG(viewport_width) as avg_viewport_width,
            AVG(viewport_height) as avg_viewport_height,
            toStartOfMinute(timestamp) as time_bucket,
            toDate(timestamp) as date,
            toHour(timestamp) as hour,
            toMinute(timestamp) as minute
          FROM lugx_analytics.page_views_stream
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}'
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          GROUP BY page_url, page_title, device, referrer, user_agent, ip_address, time_bucket, date, hour, minute
          ORDER BY time_bucket DESC, view_count DESC
        `,
        format: "JSONEachRow",
      });

      const data = await result.json();
      return data || [];
    } catch (error) {
      console.error(`❌ Error getting aggregated page views:`, error);
      return [];
    }
  }

  async getAggregatedClickEvents(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];

      const result = await clickHouse.client.query({
        query: `
          SELECT 
            page_url,
            element_type,
            element_text,
            element_id,
            element_class,
            COUNT(*) as click_count,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT session_id) as unique_sessions,
            AVG(click_x) as avg_click_x,
            AVG(click_y) as avg_click_y,
            formatDateTime(timestamp, '%Y-%m-%d %H:%M:00') as time_bucket,
            toDate(timestamp) as date,
            toHour(timestamp) as hour,
            toMinute(timestamp) as minute
          FROM lugx_analytics.click_events_stream 
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}' 
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          GROUP BY page_url, element_type, element_text, element_id, element_class, time_bucket, date, hour, minute
          ORDER BY time_bucket
        `,
        format: "JSONEachRow",
      });

      return await result.json();
    } catch (error) {
      console.error("Error getting aggregated click events:", error);
      return [];
    }
  }

  async getSessionSummary(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];

      const result = await clickHouse.client.query({
        query: `
          SELECT 
            user_id,
            session_id,
            start_time,
            end_time,
            duration,
            page_count,
            initial_referrer,
            initial_user_agent,
            ip_address,
            formatDateTime(start_time, '%Y-%m-%d %H:00:00') as hour_bucket,
            toDate(start_time) as date,
            toHour(start_time) as hour,
            toMinute(start_time) as minute,
            CASE 
              WHEN duration < 60 THEN '0-1min'
              WHEN duration < 300 THEN '1-5min'
              WHEN duration < 900 THEN '5-15min'
              WHEN duration < 1800 THEN '15-30min'
              ELSE '30min+'
            END as session_duration_category
          FROM lugx_analytics.sessions_stream 
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}' 
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          ORDER BY start_time
        `,
        format: "JSONEachRow",
      });

      return await result.json();
    } catch (error) {
      console.error("Error getting session summary:", error);
      return [];
    }
  }

  async getRealTimeMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [pageViews, clickEvents, activeSessions] = await Promise.all([
        this.getMetricCount("page_views_stream", oneHourAgo),
        this.getMetricCount("click_events_stream", oneHourAgo),
        this.getActiveSessionsCount(oneHourAgo),
      ]);

      return {
        last_hour: {
          page_views: pageViews,
          click_events: clickEvents,
          active_sessions: activeSessions,
          timestamp: now,
        },
      };
    } catch (error) {
      console.error("Error getting real-time metrics:", error);
      return {};
    }
  }

  async getMetricCount(table, since) {
    try {
      if (!clickHouse.isConnected) return 0;

      const result = await clickHouse.client.query({
        query: `
          SELECT COUNT(*) as count
          FROM lugx_analytics.${table}
          WHERE timestamp >= '${this.toClickHouseDateTime(since)}'
        `,
        format: "JSONEachRow",
      });

      const data = await result.json();
      return parseInt(data[0]?.count || 0);
    } catch (error) {
      return 0;
    }
  }

  async getActiveSessionsCount(since) {
    try {
      if (!clickHouse.isConnected) return 0;

      const result = await clickHouse.client.query({
        query: `
          SELECT COUNT(DISTINCT session_id) as count
          FROM lugx_analytics.page_views_stream
          WHERE timestamp >= '${this.toClickHouseDateTime(since)}'
        `,
        format: "JSONEachRow",
      });

      const data = await result.json();
      return parseInt(data[0]?.count || 0);
    } catch (error) {
      return 0;
    }
  }

  async uploadAggregatedScrollDepth(startTime, endTime, timestamp) {
    try {
      const aggregatedData = await this.getAggregatedScrollDepth(
        startTime,
        endTime
      );

      if (aggregatedData.length === 0) {
        console.log("📜 No scroll depth data to upload");
        return null;
      }

      const dateFolder = this.getDateFolder(endTime);
      const fileName = `scroll-depth/${dateFolder}/scroll_depth_${timestamp}.csv`;

      const csvData = this.convertToCSV(aggregatedData, [
        "page_url",
        "total_scrolls",
        "unique_users",
        "unique_sessions",
        "avg_max_scroll_depth",
        "avg_time_to_max_scroll",
        "avg_page_height",
        "avg_viewport_height",
        "reached_25_percent",
        "reached_50_percent",
        "reached_75_percent",
        "reached_100_percent",
        "scroll_milestones",
        "time_bucket",
        "date",
        "hour",
        "minute",
      ]);

      await this.uploadCSVToS3(fileName, csvData, {
        dataType: "scroll_depth",
        timeRange: { start: startTime, end: endTime },
        recordCount: aggregatedData.length,
      });

      console.log(
        `📜 Scroll depth uploaded: ${aggregatedData.length} records -> ${fileName}`
      );
      return fileName;
    } catch (error) {
      console.error("Error uploading scroll depth:", error);
      return null;
    }
  }

  async getAggregatedScrollDepth(startTime, endTime) {
    try {
      if (!clickHouse.isConnected) return [];

      const result = await clickHouse.client.query({
        query: `
          SELECT 
            page_url,
            COUNT(*) as total_scrolls,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT session_id) as unique_sessions,
            AVG(max_scroll_depth) as avg_max_scroll_depth,
            AVG(time_to_max_scroll) as avg_time_to_max_scroll,
            AVG(page_height) as avg_page_height,
            AVG(viewport_height) as avg_viewport_height,
            countIf(max_scroll_depth >= 25) as reached_25_percent,
            countIf(max_scroll_depth >= 50) as reached_50_percent,
            countIf(max_scroll_depth >= 75) as reached_75_percent,
            countIf(max_scroll_depth >= 100) as reached_100_percent,
            scroll_milestones,
            formatDateTime(timestamp, '%Y-%m-%d %H:%M:00') as time_bucket,
            toDate(timestamp) as date,
            toHour(timestamp) as hour,
            toMinute(timestamp) as minute
          FROM lugx_analytics.scroll_depth_stream 
          WHERE timestamp >= '${this.toClickHouseDateTime(startTime)}' 
          AND timestamp <= '${this.toClickHouseDateTime(endTime)}'
          GROUP BY page_url, scroll_milestones, time_bucket, date, hour, minute
          ORDER BY time_bucket
        `,
        format: "JSONEachRow",
      });

      return await result.json();
    } catch (error) {
      console.error("Error getting aggregated scroll depth:", error);
      return [];
    }
  }

  formatTimestamp(date) {
    return date
      .toISOString()
      .replace(/[:.]/g, "")
      .replace("T", "_")
      .split("Z")[0];
  }

  toClickHouseDateTime(date) {
    return date
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "");
  }

  // CSV conversion utility
  convertToCSV(data, columns) {
    if (!data || data.length === 0) return "";

    // Create header row
    const header = columns.join(",");

    // Create data rows
    const rows = data.map((row) => {
      return columns
        .map((column) => {
          const value = row[column];
          // Handle values that need to be quoted (contain commas, quotes, or newlines)
          if (value === null || value === undefined) {
            return "";
          }
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            // Escape quotes and wrap in quotes
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",");
    });

    return [header, ...rows].join("\n");
  }

  async uploadCSVToS3(fileName, csvData, metadata) {
    try {
      console.log(`🔍 S3 CSV Upload Debug for ${fileName}:`);
      console.log(`  - dataType: ${metadata.dataType}`);
      console.log(
        `  - recordCount: ${
          metadata.recordCount
        } (type: ${typeof metadata.recordCount})`
      );

      const params = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: csvData,
        ContentType: "text/csv",
        Metadata: {
          dataType: metadata.dataType || "unknown",
          recordCount: (metadata.recordCount || 0).toString(),
          uploadedAt: new Date().toISOString(),
        },
      };

      const command = new PutObjectCommand(params);
      const result = await this.s3Client.send(command);

      console.log(`✅ S3 CSV Upload successful: ${fileName}`);
      return result;
    } catch (error) {
      console.error(`❌ S3 CSV Upload failed: ${fileName}`, error);
      throw error;
    }
  }

  async triggerManualUpload() {
    console.log("🎯 Manual upload triggered for demo");
    return await this.uploadRecentAnalytics();
  }

  getDateFolder(date) {
    return date.toISOString().split("T")[0];
  }
}

module.exports = new DemoS3ExportService();
