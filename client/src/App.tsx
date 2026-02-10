import "./index.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { LoginPage, AuthCallback, MailPage } from "@/pages";
import { ProtectedRoute } from "@/components/auth";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MailPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

