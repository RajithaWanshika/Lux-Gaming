/**
 * LUGX Gaming Analytics Tracker
 * Tracks user interactions and sends data to the analytics service
 */

class LugxAnalytics {
  constructor() {
    this.analyticsUrl = "http://localhost:3004"; // Analytics service URL
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.pageStartTime = Date.now();
    this.maxScrollDepth = 0;
    this.scrollMilestones = [];
    this.isTracking = true;

    // Initialize tracking
    this.init();
  }

  // Generate a unique session ID
  generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // Get or create user ID from localStorage
  getUserId() {
    let userId = localStorage.getItem("lugx_user_id");
    if (!userId) {
      userId =
        "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("lugx_user_id", userId);
    }
    return userId;
  }

  // Initialize all tracking
  init() {
    this.trackPageView();
    this.trackClicks();
    this.trackScrollDepth();
    this.trackSession();
    this.trackCustomEvents();

    // Track page unload for session end
    window.addEventListener("beforeunload", () => {
      this.trackSessionEnd();
    });
  }

  // Track page view
  trackPageView() {
    const pageData = {
      userId: this.userId,
      sessionId: this.sessionId,
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
      timeOnPage: 0,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    this.sendAnalytics("/track/pageview", pageData);
  }

  // Track click events
  trackClicks() {
    document.addEventListener("click", (event) => {
      if (!this.isTracking) return;

      const target = event.target;
      const clickData = {
        userId: this.userId,
        sessionId: this.sessionId,
        pageUrl: window.location.href,
        elementType: target.tagName.toLowerCase(),
        elementText: target.textContent?.trim().substring(0, 100) || "",
        elementId: target.id || "",
        elementClass: target.className || "",
        clickPosition: {
          x: event.clientX,
          y: event.clientY,
        },
      };

      this.sendAnalytics("/track/click", clickData);
    });
  }

  // Track scroll depth
  trackScrollDepth() {
    let scrollTimeout;

    window.addEventListener("scroll", () => {
      if (!this.isTracking) return;

      clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const pageHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollDepth = Math.round(
          (scrollTop / (pageHeight - viewportHeight)) * 100
        );

        // Update max scroll depth
        if (scrollDepth > this.maxScrollDepth) {
          this.maxScrollDepth = scrollDepth;
        }

        // Track scroll milestones (25%, 50%, 75%, 100%)
        const milestones = [25, 50, 75, 100];
        milestones.forEach((milestone) => {
          if (
            scrollDepth >= milestone &&
            !this.scrollMilestones.includes(milestone)
          ) {
            this.scrollMilestones.push(milestone);
          }
        });
      }, 100);
    });

    // Send scroll data when page is about to unload
    window.addEventListener("beforeunload", () => {
      this.sendScrollData();
    });
  }

  // Send scroll depth data
  sendScrollData() {
    const scrollData = {
      userId: this.userId,
      sessionId: this.sessionId,
      pageUrl: window.location.href,
      maxScrollDepth: this.maxScrollDepth,
      scrollMilestones: this.scrollMilestones,
      pageHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      timeToMaxScroll: Date.now() - this.pageStartTime,
    };

    this.sendAnalytics("/track/scroll", scrollData);
  }

  // Track session start
  trackSession() {
    const sessionData = {
      userId: this.userId,
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      pageCount: 1,
      initialReferrer: document.referrer,
    };

    this.sendAnalytics("/track/session", sessionData);
  }

  // Track session end
  trackSessionEnd() {
    const sessionData = {
      userId: this.userId,
      sessionId: this.sessionId,
      endTime: new Date().toISOString(),
      duration: Date.now() - this.pageStartTime,
    };

    // Use sendBeacon for reliable data sending on page unload
    const data = JSON.stringify(sessionData);
    
    // Try sendBeacon first, fallback to fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(`${this.analyticsUrl}/track/session`, blob);
    } else {
      // Fallback for browsers that don't support sendBeacon
      fetch(`${this.analyticsUrl}/track/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
        keepalive: true // Keep the request alive even after page unload
      }).catch(error => {
        console.warn('Session end tracking failed:', error);
      });
    }
  }

  // Track custom events
  trackCustomEvents() {
    // Track form submissions
    document.addEventListener("submit", (event) => {
      const form = event.target;
      this.trackEvent("form_submit", {
        formId: form.id || "unknown",
        formAction: form.action || "unknown",
        formMethod: form.method || "unknown",
      });
    });

    // Track search functionality
    const searchForm = document.getElementById("search");
    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        const searchInput = document.getElementById("searchText");
        if (searchInput) {
          this.trackEvent("search", {
            query: searchInput.value,
            searchType: "main_search",
          });
        }
      });
    }

    // Track newsletter subscription
    const subscribeForm = document.getElementById("subscribe");
    if (subscribeForm) {
      subscribeForm.addEventListener("submit", (event) => {
        const emailInput = document.getElementById("exampleInputEmail1");
        if (emailInput) {
          this.trackEvent("newsletter_signup", {
            email: emailInput.value,
          });
        }
      });
    }

    // Track navigation clicks
    document.querySelectorAll("nav a, .main-button a").forEach((link) => {
      link.addEventListener("click", (event) => {
        this.trackEvent("navigation_click", {
          linkText: link.textContent?.trim(),
          linkHref: link.href,
          linkType: link.classList.contains("main-button")
            ? "cta_button"
            : "nav_link",
        });
      });
    });

    // Track game category clicks
    document.querySelectorAll(".item a").forEach((link) => {
      link.addEventListener("click", (event) => {
        const item = link.closest(".item");
        const categoryTitle = item?.querySelector("h4")?.textContent;

        this.trackEvent("category_click", {
          category: categoryTitle || "unknown",
          linkHref: link.href,
        });
      });
    });
  }

  // Track custom event
  trackEvent(eventName, properties = {}) {
    if (!this.isTracking) return;

    const eventData = {
      userId: this.userId,
      sessionId: this.sessionId,
      pageUrl: window.location.href,
      eventType: "custom",
      eventName: eventName,
      properties: properties,
    };

    this.sendAnalytics("/track/event", eventData);
  }

  // Send analytics data to the service
  async sendAnalytics(endpoint, data) {
    try {
      const response = await fetch(`${this.analyticsUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.warn("Analytics tracking failed:", response.statusText);
      }
    } catch (error) {
      console.warn("Analytics tracking error:", error.message);
    }
  }

  // Enable/disable tracking
  setTracking(enabled) {
    this.isTracking = enabled;
  }

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      pageStartTime: this.pageStartTime,
      maxScrollDepth: this.maxScrollDepth,
    };
  }
}

// Initialize analytics when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.lugxAnalytics = new LugxAnalytics();

  // Make analytics available globally for manual tracking
  window.trackEvent = (eventName, properties) => {
    if (window.lugxAnalytics) {
      window.lugxAnalytics.trackEvent(eventName, properties);
    }
  };
});

// Track page visibility changes
document.addEventListener("visibilitychange", () => {
  if (window.lugxAnalytics) {
    if (document.hidden) {
      window.lugxAnalytics.trackEvent("page_hidden");
    } else {
      window.lugxAnalytics.trackEvent("page_visible");
    }
  }
});

// Track window resize
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (window.lugxAnalytics) {
      window.lugxAnalytics.trackEvent("window_resize", {
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, 250);
});
