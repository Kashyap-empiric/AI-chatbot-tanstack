import { SignIn, SignUp, useUser } from "@clerk/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChatPage from "../pages/ChatPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return children;
}

const protectedChatPage = (
  <ProtectedRoute>
    <ChatPage />
  </ProtectedRoute>
);

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
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

        <Route path="/app" element={protectedChatPage} />
        <Route path="/app/chat" element={protectedChatPage} />
        <Route path="/app/chat/:id" element={protectedChatPage} />

        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
