import axios from "axios";

const VITE_ENDPOINT_URL = import.meta.env.VITE_ENDPOINT_URL;

const client = axios.create({
  baseURL: `${VITE_ENDPOINT_URL}`, // Base URL for the API
  headers: {
    "Content-Type": "application/json",
  },
});

// Dynamically attach token before each request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: response interceptor
client.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
