import axios from "axios";

const API_URL = "https://myblogs-fr9t.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

/*
==================================================
REQUEST INTERCEPTOR
==================================================
*/

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
==================================================
RESPONSE INTERCEPTOR
==================================================
*/

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    const code =
      error.response?.data?.code;

    const authFailure =
      status === 401 &&
      (
        !code ||
        [
          "TOKEN_EXPIRED",
          "INVALID_TOKEN",
          "AUTH_FAILED",
          "NO_TOKEN",
          "UNAUTHORIZED",
        ].includes(code)
      );

    if (authFailure) {

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      /*
      AuthContext is listening to this event.
      */
      window.dispatchEvent(
        new Event("auth:logout")
      );
    }

    return Promise.reject(error);
  }
);

export default api;
