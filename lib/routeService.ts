import type { RouteListItem, RouteResponse } from "@/constants/types";
import apiClient from "@/lib/apiClient";
import { AxiosError } from "axios";

export async function fetchAvailableRoutes(): Promise<RouteListItem[]> {
  try {
    const { data } = await apiClient.get<RouteListItem[]>("/api/routes");

    if (!Array.isArray(data)) {
      throw new Error("Invalid routes response from server.");
    }

    return data.filter(
      (item) =>
        item &&
        typeof item.id === "number" &&
        typeof item.routeNumber === "string" &&
        typeof item.routeName === "string",
    );
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED" || !error.response) {
        throw new Error("Unable to reach server. Check your connection.");
      }

      throw new Error(error.response?.data?.message ?? "Failed to fetch routes.");
    }

    throw error;
  }
}

export async function fetchRouteByNumber(routeNumber: string): Promise<RouteResponse> {
  try {
    const { data } = await apiClient.get<RouteResponse>(`/api/routes/${encodeURIComponent(routeNumber)}`);

    if (!data || !Array.isArray(data.path)) {
      throw new Error("Invalid route response from server.");
    }

    return data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        throw new Error("Route not found.");
      }

      if (error.code === "ECONNABORTED" || !error.response) {
        throw new Error("Unable to reach server. Check your connection.");
      }

      throw new Error(error.response?.data?.message ?? "Failed to fetch route.");
    }

    throw error;
  }
}
