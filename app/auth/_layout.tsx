import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack initialRouteName="signup" screenOptions={{ headerShown: false }} />
  );
}
