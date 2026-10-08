import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Registration from "./pages/Registration";
import Pos from "./pages/Pos";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/pos" element={<Pos />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
