import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { authService } from "@/services/authService";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, token, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (token && !isAuthenticated) {
      authService
        .getProfile()
        .then((user) => {
          setUser(user);
          setLoading(false);
        })
        .catch(() => {
          useAuthStore.getState().logout();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token, isAuthenticated, setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
