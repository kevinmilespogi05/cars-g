import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, signOut } = useAuthStore();

  return {
    user,
    isAuthenticated,
    signOut,
  };
}; 