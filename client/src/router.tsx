import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatPage from "./components/ChatPage";
import { SignIn, SignUp, useUser } from "@clerk/react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }
  return children;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages */}
        <Route
          path="/sign-in"
          element={
            <div className="h-screen w-screen flex items-center justify-center">
              <SignIn fallbackRedirectUrl="/app" />
            </div>
          }
        />

        <Route
          path="/sign-up"
          element={
            <div className="h-screen w-screen flex items-center justify-center">
              <SignUp fallbackRedirectUrl="/app" />
            </div>
          }
        />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/chat/:id"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
