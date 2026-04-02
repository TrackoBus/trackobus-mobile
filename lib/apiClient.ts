import { API_BASE_URL } from "@/constants/api";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import axios, { AxiosHeaders } from "axios";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const currentUser = FIREBASE_AUTH.currentUser;

    if (currentUser) {
      const token = await currentUser.getIdToken();
      const headers = AxiosHeaders.from(config.headers);

      if (!headers.get("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      config.headers = headers;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
