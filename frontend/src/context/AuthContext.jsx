import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, loginUser, logoutUser, verifyLoginOtp } from "../api/auth";
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

  const login = useCallback(async (username, password) => {
    const result = await loginUser({ username, password });

    if (result.mfa_required) {
      return { mfaRequired: true, mfaToken: result.mfa_token };
    }

    setTokens(result);
    const profile = await fetchCurrentUser();
    setUser(profile);
    setStatus("authenticated");
    return { mfaRequired: false, profile };
  }, []);

  const completeMfaLogin = useCallback(async (mfaToken, code) => {
    const tokens = await verifyLoginOtp({ mfaToken, code });
    setTokens(tokens);
    const profile = await fetchCurrentUser();
    setUser(profile);
    setStatus("authenticated");
    return profile;
  }, []);

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
    () => ({ user, status, login, completeMfaLogin, logout, refreshProfile }),
    [user, status, login, completeMfaLogin, logout, refreshProfile]
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
