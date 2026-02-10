import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, setLoading } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const picture = searchParams.get("picture");

    if (token && email && name) {
      const user = { email, name, picture: picture || "" };
      login(token, user);
      navigate("/", { replace: true });
    } else {
      setLoading(false);
      navigate("/login", { replace: true });
    }
  }, [searchParams, login, setLoading, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p>Signing you in...</p>
      </div>
    </div>
  );
}
