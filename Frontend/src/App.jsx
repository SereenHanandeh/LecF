import React from "react";
import Dashboard from "./pages/Dashboard";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PlanResult from "./components/PlanResult";
import "./App.css";
import Plans from "./components/Plans.jsx";
import Supervisors from "./components/Supervisors.jsx";
import Settings from "./components/Settings.jsx";
import SupervisorReport from "./components/SupervisorReport.jsx";
import RoomsPage from "./components/RoomsPage.jsx";


function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan-result/:planId" element={<PlanResult />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/supervisors" element={<Supervisors />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/supervisor-report/:supervisorId"
            element={<SupervisorReport />}
          />
          <Route path="/rooms" element={<RoomsPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
