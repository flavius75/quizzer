"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  // State to hold the authentication token
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem('token');
      const storedUsername = localStorage.getItem("username");
      const storedRole = localStorage.getItem("role");

      if (storedToken) setToken(storedToken);
      if (storedUsername) setUsername(storedUsername);
      if (storedRole) setRole(storedRole);
    }
  }, []);


  useEffect(() => {
    if (token) {
      localStorage.setItem('token',token);
      localStorage.setItem('username',username);
      localStorage.setItem('role',role);
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('role')
    }
  }, [role, token, username]);

  // Memoized value of the authentication context
  const contextValue = useMemo(
    () => ({
      token,
      setToken,
      username,
      setUsername,
      role, 
      setRole
    }),
    [token, username, role]
  );

  // Provide the authentication context to the children components
  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthProvider;
