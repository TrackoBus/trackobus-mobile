import Constants from "expo-constants";
import { Platform } from "react-native";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const hostUri = Constants.expoConfig?.hostUri;
const expoLanHost = hostUri?.split(":")[0];

const lanBaseUrl = expoLanHost ? `http://${expoLanHost}:8080/trck` : "";
const emulatorBaseUrl =
	Platform.OS === "android"
		? "http://10.0.2.2:8080/trck"
		: "http://localhost:8080/trck";

export const API_BASE_URL = trimTrailingSlash(
	envBaseUrl || lanBaseUrl || emulatorBaseUrl,
);