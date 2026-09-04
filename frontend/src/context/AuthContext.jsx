import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  verifyEmail,
  signInWithGoogle,
} from "../api/auth";
import { onSessionExpired } from "../api/client";
import {
  clearTokens,
  getRefreshToken,
  hasSession,
  setTokens,
} from "../utils/tokenStorage";

const AuthContext = createContext(null);

// "loading" — resolving an existing session on first load
// "authenticated" / "unauthenticated" — settled states the UI can route on
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    onSessionExpired(clearSession);
  }, [clearSession]);

  useEffect(() => {
    if (!hasSession()) {
      setStatus("unauthenticated");
      return;
    }

    fetchCurrentUser()
      .then((profile) => {
        setUser(profile);
        setStatus("authenticated");
      })
      .catch(() => {
        clearSession();
      });
  }, [clearSession]);

  // Shared by every path that ends with "here are real tokens" — password
  // login, completing email verification, and Google sign-in.
  const settleSession = useCallback(async (tokens) => {
    setTokens(tokens);
    const profile = await fetchCurrentUser();
    setUser(profile);
    setStatus("authenticated");
    return profile;
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await loginUser({ username, password });

    if (result.verification_required) {
      return {
        verificationRequired: true,
        verificationToken: result.verification_token,
      };
    }

    const profile = await settleSession(result);
    return { verificationRequired: false, profile };
  }, [settleSession]);

  const completeVerification = useCallback(async (verificationToken, code) => {
    const tokens = await verifyEmail({ verificationToken, code });
    return settleSession(tokens);
  }, [settleSession]);

  const loginWithGoogle = useCallback(async (credential) => {
    const tokens = await signInWithGoogle(credential);
    return settleSession(tokens);
  }, [settleSession]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch {
      // Best-effort: even if revocation fails server-side, clear the local session.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchCurrentUser();
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      completeVerification,
      loginWithGoogle,
      logout,
      refreshProfile,
    }),
    [user, status, login, completeVerification, loginWithGoogle, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
