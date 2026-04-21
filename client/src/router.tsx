import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatPage from "./components/ChatPage";
import ChatHome from "./components/chat/ChatHome";
import { SignIn, SignUp, useUser } from "@clerk/react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return children;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
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

        {/* Protected app layout */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<ChatHome />} />
          <Route path="chat/:id" element={<ChatHome />} />
        </Route>

        {/* fallback */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
