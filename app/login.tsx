import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Link } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 6;
  }, [email, password]);

  const onLogin = () => {
    if (!canSubmit) {
      Alert.alert("Invalid input", "Please enter a valid email and password.");
      return;
    }

    Alert.alert("Login", "Login action is ready to be connected to backend.");
  };

  return (
    <View className="flex-1 bg-gray-100 px-6 justify-center">
      <View className="items-center mb-8">
        <Ionicons name="bus" size={50} color="#1D4ED8" />
        <Text className="text-xl font-bold text-blue-600 mt-2">BusHere</Text>
        <Text className="text-gray-500 text-center mt-2">
          Welcome back! Let&apos;s get you moving.
        </Text>
      </View>

      <Text className="text-gray-700 mb-1">Email</Text>
      <View className="flex-row items-center border border-gray-300 rounded-lg px-3 mb-4 bg-white">
        <Ionicons name="mail-outline" size={20} color="gray" />
        <TextInput
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          className="flex-1 p-3 ml-2"
        />
      </View>

      <Text className="text-gray-700 mb-1">Password</Text>
      <View className="flex-row items-center border border-gray-300 rounded-lg px-3 mb-6 bg-white">
        <Ionicons name="lock-closed-outline" size={20} color="gray" />
        <TextInput
          placeholder="********"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="flex-1 p-3 ml-2"
        />
      </View>

      <TouchableOpacity
        className={`p-4 rounded-xl mb-6 ${canSubmit ? "bg-blue-600" : "bg-blue-300"}`}
        disabled={!canSubmit}
        onPress={onLogin}
      >
        <Text className="text-white text-center font-semibold text-lg">Login</Text>
      </TouchableOpacity>

      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-[1px] bg-gray-300" />
        <Text className="mx-3 text-gray-500">Or</Text>
        <View className="flex-1 h-[1px] bg-gray-300" />
      </View>

      <TouchableOpacity className="flex-row items-center justify-center border border-gray-300 p-4 rounded-lg mb-3 bg-white">
        <FontAwesome name="google" size={18} color="black" />
        <Text className="ml-2">Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-row items-center justify-center border border-gray-300 p-4 rounded-lg mb-6 bg-white">
        <FontAwesome name="facebook" size={18} color="black" />
        <Text className="ml-2">Continue with Facebook</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center">
        <Text className="text-gray-400">Don&apos;t have an account? </Text>
        <Link href="/signup">
          <Text className="text-blue-500 font-semibold">Sign Up</Text>
        </Link>
      </View>
    </View>
  );
}