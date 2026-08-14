import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    // ==================================================
    // COMPLETE REACT ERROR INFORMATION
    // ==================================================

    const errorData = {
      type: "REACT_ERROR",

      message:
        error?.message ||
        "Unknown React Error",

      stack:
        error?.stack ||
        "No stack trace available",

      componentStack:
        errorInfo?.componentStack ||
        "No component stack available",

      // Current complete browser URL
      url:
        window.location.href ||
        "Unknown",

      // Only pathname
      pathname:
        window.location.pathname ||
        "Unknown",

      // Query string
      search:
        window.location.search ||
        "",

      // Hash
      hash:
        window.location.hash ||
        "",

      // Time of error
      timestamp: new Date().toISOString(),

      // Browser information
      userAgent:
        navigator?.userAgent ||
        "Unknown",
    };

    // Console me complete error information
    console.error(
      "========================================"
    );

    console.error(
      "REACT ERROR"
    );

    console.error(
      "========================================"
    );

    console.error(
      "URL:",
      errorData.url
    );

    console.error(
      "PATH:",
      errorData.pathname
    );

    console.error(
      "MESSAGE:",
      errorData.message
    );

    console.error(
      "STACK:",
      errorData.stack
    );

    console.error(
      "COMPONENT STACK:",
      errorData.componentStack
    );

    console.error(
      "========================================"
    );

    // ==================================================
    // SEND ERROR TO BACKEND
    // ==================================================

    fetch(
      "http://localhost:8000/api/logs/client",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(errorData),
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Logging API returned ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        console.log(
          "Frontend error logged successfully:",
          data
        );
      })
      .catch((err) => {
        console.error(
          "Logging failed:",
          err
        );
      });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "50px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h2>
            Kuch technical issue aa gaya hai!
          </h2>

          <p>
            Humne is error ko server logs me
            record kar liya hai.
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            style={{
              padding: "10px 20px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;