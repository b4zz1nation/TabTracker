import React, { createContext, useContext } from 'react';

type AuthContextType = {
  /** Call this after saving the user profile to immediately unlock navigation. */
  markProfileReady: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  markProfileReady: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
