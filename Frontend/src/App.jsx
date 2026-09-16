import React from "react";
import Dashboard from "./pages/Dashboard";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PlanResult from "./components/PlanResult";
import "./App.css";

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan-result/:planId" element={<PlanResult />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
