import React, { useState } from "react";
import { createPlan, generatePlan, getPlan } from "../api";

export default function PlanGenerator({ excelBatchId, onGenerated }) {
  const [plans, setPlans] = useState([]);

  const handleGenerate = async () => {
    const res = await createPlan({
      name: `Plan ${plans.length + 1}`,
      excelBatchId,
      dateFrom: "2025-01-01",
      dateTo: "2025-01-31",
    });

    const planId = res.data.data.id; // ✅ backend => data.id

    await generatePlan(planId, 1);
    const planRes = await getPlan(planId);

    // planRes.data.data هي المصفوفة مباشرة
    const assignments = planRes.data.data;

    setPlans([...plans, { id: planId, assignments }]);
    onGenerated(assignments);
  };

  return (
    <div>
      <h3>⚙️ Plan Generator</h3>
      <button onClick={handleGenerate}>Generate New Plan</button>
      {plans.map((p) => (
        <div key={p.id}>
          <h4>{`Plan ${p.id}`}</h4>
          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>Session</th>
                <th>Supervisor</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(p.assignments) &&
                p.assignments.map((a, i) => (
                  <tr key={i}>
                    <td>{a.session_group_id}</td>
                    <td>{a.supervisor_name}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
