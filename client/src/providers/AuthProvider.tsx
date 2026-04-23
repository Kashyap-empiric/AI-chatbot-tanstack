import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { setAuthTokenGetter } from "../services/http";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      setAuthTokenGetter(getToken);
    }
  }, [getToken, isLoaded]);

  if (!isLoaded) return null;

  return <>{children}</>;
}
