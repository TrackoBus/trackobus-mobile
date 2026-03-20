import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

const Signup: React.FC = () => {
  const isWeb = Platform.OS === "web";
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const canSubmit = useMemo<boolean>(() => {
    return email.trim().length > 0 && password.length >= 6;
  }, [email, password]);

  const onSignup = (): void => {
    if (!canSubmit) {
      Alert.alert("Invalid input", "Please enter a valid email and password.");
      return;
    }

    Alert.alert("Sign Up", "Ready to connect backend.");
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.card, isWeb ? styles.cardWeb : undefined]}>
        <View style={styles.logoSection}>
          <Ionicons name="bus" size={56} color="#1D4ED8" />
          <Text style={styles.brandText}>
          BusHere
          </Text>
          <Text style={styles.subText}>Welcome back! Let&apos;s get you moving.</Text>
        </View>

        <Text style={styles.fieldLabel}>Email</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            style={styles.inputText}
            placeholderTextColor="#A3A3A3"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.fieldLabel}>Password</Text>
        <View style={styles.inputWrapPassword}>
          <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="********"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.inputText}
            placeholderTextColor="#A3A3A3"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canSubmit ? styles.primaryButtonDisabled : undefined,
          ]}
          disabled={!canSubmit}
          onPress={onSignup}
        >
          <Text style={styles.primaryButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.socialButton}>
          <FontAwesome name="google" size={20} color="#111827" />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.socialButton, styles.facebookButton]}>
          <FontAwesome name="facebook" size={20} color="#111827" />
          <Text style={styles.socialButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <Link href="/login">
            <Text style={styles.loginLink}>
            Login
            </Text>
          </Link>
        </View>
      </View>
    </View>
  );
};

export default Signup;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EDEDED",
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 430,
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderRadius: 18,
    backgroundColor: "#EDEDED",
  },
  cardWeb: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  brandText: {
    marginTop: 8,
    color: "#1D4ED8",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
  },
  subText: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  fieldLabel: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  inputWrap: {
    height: 52,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  inputWrapPassword: {
    height: 52,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  inputText: {
    flex: 1,
    marginLeft: 10,
    color: "#374151",
    fontSize: 16,
    paddingVertical: 0,
  },
  primaryButton: {
    minHeight: 54,
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  primaryButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#9CA3AF",
  },
  socialButton: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  facebookButton: {
    marginBottom: 20,
  },
  socialButtonText: {
    marginLeft: 8,
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  loginRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  loginLink: {
    marginLeft: 4,
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "700",
  },
});