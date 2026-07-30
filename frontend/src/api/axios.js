import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

// Render's free tier spins the backend down after ~15 min idle; the first
// request after that can take 30-50s to wake it up. A generous timeout (with
// the auth:network-error signal below) lets the UI say "waking up the
// server" instead of hanging forever or looking broken.
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: { "Content-Type": "application/json" },
  // Required so the browser sends/receives the httpOnly refresh-token cookie.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kb_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

const flushQueue = (error, token = null) => {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  queue = [];
};

// axios.js runs outside the React tree (no access to useNavigate), so a
// forced logout is broadcast as an event. AuthContext - which does live
// inside the router - listens for this and performs a client-side redirect.
// This avoids window.location.href, which would trigger a full-page request
// for a route like /login that only exists client-side.
const forceLogout = () => {
  localStorage.removeItem("kb_access_token");
  localStorage.removeItem("kb_user");
  window.dispatchEvent(new CustomEvent("auth:force-logout"));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // No response at all (timeout, DNS/network failure, or a Render cold
    // start) is not an authentication failure - flag it so callers can show
    // a "server is waking up" message instead of being treated as a 401.
    if (!error.response) {
      error.isNetworkError = true;
      return Promise.reject(error);
    }

    if (
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token travels as an httpOnly cookie - nothing to send here.
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 45000 },
        );
        localStorage.setItem("kb_access_token", data.accessToken);
        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        flushQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        // Only a real "refresh token invalid/expired" response means the
        // session is actually over. A network/timeout error here just means
        // the backend was unreachable (e.g. still waking up) - leave the
        // session intact so the user's next action can succeed on retry
        // instead of being logged out because Render was cold.
        if (refreshError.response) {
          forceLogout();
        } else {
          refreshError.isNetworkError = true;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
