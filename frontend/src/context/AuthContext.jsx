import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../api/axios";

const AuthContext =
  createContext(null);

export const AuthProvider = ({
  children,
}) => {

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /*
  ==================================================
  SAVE AUTH DATA
  ==================================================
  */

  const saveAuthData = useCallback(
    (token, currentUser) => {

      if (token) {
        localStorage.setItem(
          "token",
          token
        );
      }

      if (currentUser) {
        localStorage.setItem(
          "user",
          JSON.stringify(
            currentUser
          )
        );

        setUser(
          currentUser
        );
      }
    },
    []
  );

  /*
  ==================================================
  CLEAR AUTH
  ==================================================
  */

  const clearAuth = useCallback(
    () => {

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      setUser(null);

    },
    []
  );

  /*
  ==================================================
  LOAD CURRENT USER
  ==================================================
  */

  const loadUser =
    useCallback(async () => {

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {

        const response =
          await api.get(
            "/auth/me"
          );

        if (
          response.data?.success &&
          response.data?.user
        ) {

          const currentUser =
            response.data.user;

          setUser(
            currentUser
          );

          localStorage.setItem(
            "user",
            JSON.stringify(
              currentUser
            )
          );

        } else {

          clearAuth();

        }

      } catch (error) {

        console.error(
          "LOAD USER ERROR:",
          error
        );

        clearAuth();

      } finally {

        setLoading(false);

      }

    }, [clearAuth]);

  /*
  ==================================================
  INITIAL AUTH CHECK
  ==================================================
  */

  useEffect(() => {

    loadUser();

  }, [loadUser]);

  /*
  ==================================================
  TOKEN EXPIRED EVENT
  ==================================================
  */

  useEffect(() => {

    const handleAuthLogout =
      () => {

        clearAuth();

      };

    window.addEventListener(
      "auth:logout",
      handleAuthLogout
    );

    return () => {

      window.removeEventListener(
        "auth:logout",
        handleAuthLogout
      );

    };

  }, [clearAuth]);

  /*
  ==================================================
  LOGIN
  ==================================================
  */

  const login = async (
    email,
    password
  ) => {

    const response =
      await api.post(
        "/auth/login",
        {
          email:
            email.trim(),
          password,
        }
      );

    if (
      !response.data?.success
    ) {

      throw new Error(
        response.data?.message ||
          "Login failed"
      );

    }

    const token =
      response.data?.token;

    const loggedUser =
      response.data?.user;

    if (!token) {
      throw new Error(
        "Login successful but token was not received."
      );
    }

    if (!loggedUser) {
      throw new Error(
        "Login successful but user data was not received."
      );
    }

    saveAuthData(
      token,
      loggedUser
    );

    return loggedUser;
  };

  /*
  ==================================================
  SIGNUP
  ==================================================
  */

  const signup = async (
    name,
    email,
    password
  ) => {

    const response =
      await api.post(
        "/auth/signup",
        {
          name:
            name.trim(),
          email:
            email.trim(),
          password,
        }
      );

    if (
      !response.data?.success
    ) {

      throw new Error(
        response.data?.message ||
          "Signup failed"
      );

    }

    const token =
      response.data?.token;

    const createdUser =
      response.data?.user;

    /*
    If signup API returns token,
    user becomes logged in immediately.
    */

    if (
      token &&
      createdUser
    ) {

      saveAuthData(
        token,
        createdUser
      );

      return {
        user: createdUser,
        authenticated: true,
      };

    }

    /*
    If backend doesn't return token.
    */

    return {
      user:
        createdUser || null,
      authenticated: false,
    };
  };

  /*
  ==================================================
  LOGOUT
  ==================================================
  */

  const logout = async () => {

    try {

      const token =
        localStorage.getItem(
          "token"
        );

      if (token) {

        await api.post(
          "/auth/logout"
        );

      }

    } catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );

    } finally {

      clearAuth();

    }
  };

  /*
  ==================================================
  AUTH CONTEXT
  ==================================================
  */

  const value = {

    user,

    loading,

    login,

    signup,

    logout,

    loadUser,

    isAuthenticated:
      Boolean(user),

  };

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {

  const context =
    useContext(
      AuthContext
    );

  if (!context) {

    throw new Error(
      "useAuth must be used inside AuthProvider"
    );

  }

  return context;
};