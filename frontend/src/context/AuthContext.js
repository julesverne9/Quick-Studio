import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

let SecureStore;
try {
  SecureStore = require("expo-secure-store");
} catch {
  SecureStore = null;
}

const TOKEN_KEY = "quickstudio_jwt";
const USER_KEY = "quickstudio_user";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://quickstudio-backend.onrender.com";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

const CONNECTION_ERROR_MESSAGE =
  "Unable to reach the server. Please check your internet connection or IP configuration.";

const buildAuthError = (error, fallbackMessage) => {
  // Timeout error
  if (error.code === "ECONNABORTED") {
    return {
      success: false,
      title: "Request Timeout",
      message:
        "The server took too long to respond. Please check your connection and try again.",
      isNetworkError: true,
    };
  }

  // No response at all (network error, DNS failure, etc.)
  if (!error.response) {
    return {
      success: false,
      title: "Connection Error",
      message: CONNECTION_ERROR_MESSAGE,
      isNetworkError: true,
    };
  }

  // Non-JSON response (e.g. localtunnel HTML warning page)
  const contentType = error.response.headers?.["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return {
      success: false,
      title: "Connection Error",
      message:
        "Received an unexpected response from the server. If using a tunnel, visit the tunnel URL in a browser first to accept any warning pages.",
      isNetworkError: true,
    };
  }

  return {
    success: false,
    title: "Authentication Failed",
    status: error.response.status,
    message: error.response.data?.message || fallbackMessage,
  };
};

const saveSession = async ({ token, user }) => {
  if (!SecureStore) return;

  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

const getStoredSession = async () => {
  if (!SecureStore) return { token: null, user: null };

  const [storedToken, storedUser] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);

  return {
    token: storedToken,
    user: storedUser ? JSON.parse(storedUser) : null,
  };
};

const deleteSession = async () => {
  if (!SecureStore) return;

  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return () => api.interceptors.request.eject(interceptor);
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredSession();
        if (!stored.token) {
          setIsLoading(false);
          return;
        }

        setToken(stored.token);
        if (stored.user) {
          setUser(stored.user);
        }

        const { data } = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${stored.token}` },
        });

        setUser(data.user);
        await saveSession({ token: stored.token, user: data.user });
      } catch {
        await deleteSession();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const applyAuthPayload = useCallback(async (data) => {
    await saveSession({ token: data.token, user: data.user });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name, email, password) => {
      try {
        const { data } = await api.post("/auth/register", {
          name,
          email,
          password,
        });

        await applyAuthPayload(data);
        return { success: true, user: data.user, token: data.token };
      } catch (error) {
        return buildAuthError(error, "Registration failed. Please try again.");
      }
    },
    [applyAuthPayload]
  );

  const login = useCallback(
    async (email, password) => {
      try {
        const { data } = await api.post("/auth/login", { email, password });

        await applyAuthPayload(data);
        return { success: true, user: data.user, token: data.token };
      } catch (error) {
        return buildAuthError(error, "Login failed. Please try again.");
      }
    },
    [applyAuthPayload]
  );

  const logout = useCallback(async () => {
    await deleteSession();
    setToken(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await api.delete("/auth/me");
      await deleteSession();
      setToken(null);
      setUser(null);
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Unable to delete your account right now.";
      return { success: false, message };
    }
  }, []);

  const checkProAccess = useCallback(
    (featureName) => {
      if (!user) return { allowed: false, reason: "not_authenticated" };
      if (user.subscriptionTier === "pro") return { allowed: true };
      return {
        allowed: false,
        reason: "pro_required",
        feature: featureName,
      };
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      register,
      login,
      logout,
      deleteAccount,
      checkProAccess,
      api,
    }),
    [
      user,
      token,
      isLoading,
      register,
      login,
      logout,
      deleteAccount,
      checkProAccess,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return ctx;
}

export default AuthContext;
