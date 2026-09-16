import React, { useEffect, useState } from "react";
import { listSupervisors } from "../api.js";

export default function SupervisorSelector({
  selected = [],
  setSelected,
  affinityMode = false,
  value = "",
  onValueChange = () => {},
}) {
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await listSupervisors();

        console.log("SUPERVISORS RESPONSE:", res);

        setSupervisors(
          Array.isArray(res?.supervisors)
            ? res.supervisors
            : []
        );
      } catch (error) {
        console.error("❌ Failed to load supervisors:", error);
        setSupervisors([]);
      }
    }

    fetchData();
  }, []);

  // ---------------------------------------------------------
  // Always normalize selected values to numeric IDs.
  // Supports both:
  // [1, 2, 3]
  // and temporarily:
  // [{ id: 1, name: "..." }, { id: 2, name: "..." }]
  // ---------------------------------------------------------

  const selectedIds = selected
    .map((item) => {
      if (item && typeof item === "object") {
        return Number(item.id);
      }

      return Number(item);
    })
    .filter((id) => Number.isInteger(id));

  // =========================================================
  // AFFINITY MODE
  // اختيار مشرف واحد لأستاذ معيّن
  // =========================================================

  if (affinityMode) {
    return (
      <div style={{ marginTop: "10px" }}>
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "14px",
            background: "#fff",
          }}
        >
          <option value="">-- Select Supervisor --</option>

          {supervisors.map((sup) => (
            <option key={sup.id} value={sup.id}>
              {sup.name}
            </option>
          ))}
        </select>

        {supervisors.length === 0 && (
          <p style={{ color: "#c00", marginTop: "8px" }}>
            ❌ No supervisors available
          </p>
        )}
      </div>
    );
  }

  // =========================================================
  // NORMAL MODE
  // اختيار المشرفين المناوبين
  // =========================================================

  const toggleSupervisor = (id) => {
    const numericId = Number(id);

    if (!Number.isInteger(numericId)) {
      return;
    }

    if (selectedIds.includes(numericId)) {
      setSelected(
        selectedIds.filter(
          (supervisorId) => supervisorId !== numericId
        )
      );
    } else {
      setSelected([
        ...selectedIds,
        numericId,
      ]);
    }
  };

  const selectAll = () => {
    const allIds = supervisors
      .map((sup) => Number(sup.id))
      .filter((id) => Number.isInteger(id));

    setSelected(allIds);
  };

  const clearAll = () => {
    setSelected([]);
  };

  return (
    <div
      className="supervisor-box"
      style={{
        marginTop: "20px",
        padding: "15px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#fff",
      }}
    >
      <h3 style={{ marginTop: 0 }}>
        👥 Select Supervisors
      </h3>

      {/* عدد المشرفين المختارين */}
      <div
        style={{
          marginBottom: "12px",
          padding: "10px",
          background: "#f5f5f5",
          borderRadius: "6px",
        }}
      >
        <strong>
          Selected: {selectedIds.length}
        </strong>
      </div>

      {/* أزرار اختيار الكل / مسح الكل */}
      <div style={{ marginBottom: "15px" }}>
        <button
          type="button"
          onClick={selectAll}
          style={{
            marginRight: "8px",
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          Select All
        </button>

        <button
          type="button"
          onClick={clearAll}
          style={{
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          Clear All
        </button>
      </div>

      {/* قائمة المشرفين */}
      {supervisors.map((sup) => {
        const supervisorId = Number(sup.id);

        return (
          <label
            key={supervisorId}
            style={{
              display: "block",
              marginBottom: "7px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(supervisorId)}
              onChange={() =>
                toggleSupervisor(supervisorId)
              }
              style={{
                marginRight: "8px",
              }}
            />

            {sup.name}
          </label>
        );
      })}

      {supervisors.length === 0 && (
        <p style={{ color: "#c00" }}>
          ❌ No supervisors available
        </p>
      )}
    </div>
  );
}