/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = await API.auth.getCurrentUser();
        setUser(currentUser);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login: async (email, password) => {
        const loggedInUser = await API.auth.login({ email, password });
        setUser(loggedInUser);
        return loggedInUser;
      },
      register: async (payload) => {
        const registrationResponse = await API.auth.register(payload);
        // Registration doesn't automatically log user in
        // Return the response (contains message and email)
        return registrationResponse;
      },
      logout: async () => {
        await API.auth.logout();
        setUser(null);
      },
      updateProfile: async (payload) => {
        if (!user?.id) {
          throw new Error("You must be logged in to update your profile.");
        }

        const updatedUser = await API.auth.updateProfile(user.id, payload);
        setUser(updatedUser);
        return updatedUser;
      },
      changePassword: async (payload) => API.auth.changePassword(payload),
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
