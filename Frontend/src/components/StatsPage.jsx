import React, { useEffect, useState } from "react";
import { getStats } from "../api";

export default function StatsPage({ planId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats(planId).then((res) => setStats(res.data.data)); // ✅ backend => data
  }, [planId]);

  return (
    <div>
      <h3>📊 Stats</h3>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}