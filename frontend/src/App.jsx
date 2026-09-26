import { Route, Routes } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";

import Landing from "./pages/public/Landing";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";

import Dashboard from "./pages/app/Dashboard";
import { RequireAuth, RequireRole } from "./auth/RouteGuards";
import InstrumentsList from "./pages/app/InstrumentsList";
import InstrumentNew from "./pages/app/InstrumentNew";
import InstrumentDetails from "./pages/app/InstrumentDetails";
import SessionsList from "./pages/app/SessionsList";
import SessionNew from "./pages/app/SessionNew";
import Review from "./pages/app/Review";
import Reports from "./pages/app/Reports";
import Repository from "./pages/app/Repository";
import History from "./pages/app/History";
import Rulesets from "./pages/app/Rulesets";
import Settings from "./pages/app/Settings";
import TestPlan from "./pages/app/TestPlan";
import TestSessionWizard from "./pages/app/TestSessionWizard";
import TestResults from "./pages/app/TestResults";
import ReviewSession from "./pages/app/ReviewSession";

export default function App() {
  return (
    <Routes>
      {/* ---------- public ---------- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* ---------- application ---------- */}
      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="instruments" element={<InstrumentsList />} />
        <Route path="instruments/new" element={<RequireRole roles={["Tester", "Admin"]}><InstrumentNew /></RequireRole>} />
        <Route path="instruments/:instrumentId" element={<InstrumentDetails />} />
        <Route path="instruments/:instrumentId/test-plan" element={<RequireRole roles={["Tester", "Admin"]}><TestPlan /></RequireRole>} />
        <Route path="sessions" element={<SessionsList />} />
        <Route path="sessions/new" element={<RequireRole roles={["Tester", "Admin"]}><SessionNew /></RequireRole>} />
        <Route path="sessions/:sessionId/results" element={<TestResults />} />
        <Route path="sessions/:sessionId" element={<RequireRole roles={["Tester", "Admin"]}><TestSessionWizard /></RequireRole>} />
        <Route path="review" element={<RequireRole roles={["Reviewer", "Admin"]}><Review /></RequireRole>} />
        <Route path="review/:sessionId" element={<RequireRole roles={["Reviewer", "Admin"]}><ReviewSession /></RequireRole>} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:sessionId" element={<Reports />} />
        <Route path="repository" element={<Repository />} />
        <Route path="history" element={<History />} />
        <Route path="rulesets" element={<RequireRole roles={["Admin"]}><Rulesets /></RequireRole>} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
