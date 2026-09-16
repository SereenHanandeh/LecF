import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { getPlan, listSupervisors, moveAssignment } from "../api.js";

import "./PlanResult.css";

export default function PlanResult() {
  const location = useLocation();

  const { planId, downloadUrl } = location.state || {};

  // =====================================================
  // State
  // =====================================================

  const [planData, setPlanData] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // Search / Filters
  // =====================================================

  const [search, setSearch] = useState("");

  const [filterSupervisor, setFilterSupervisor] = useState("");

  const [filterProfessor, setFilterProfessor] = useState("");

  const [filterDate, setFilterDate] = useState("");

  const [filterPeriod, setFilterPeriod] = useState("");

  // =====================================================
  // Column Visibility
  // =====================================================

  const [visibleColumns, setVisibleColumns] = useState({
    sessionGroup: true,
    crn: true,
    professor: true,
    date: true,
    period: true,
    timeFrom: true,
    timeTo: true,
    supervisor: true,
  });

  // =====================================================
  // Editing
  // =====================================================

  const [editingId, setEditingId] = useState(null);

  const [editingSupervisor, setEditingSupervisor] = useState("");

  const [savingId, setSavingId] = useState(null);

  // =====================================================
  // Date Helpers
  // =====================================================

  /*
   * مهم:
   * نتعامل مع التاريخ كـ Calendar Date وليس كـ UTC Date
   * حتى لا يتحول مثل:
   *
   * 2025-11-05
   *
   * إلى:
   *
   * 2025-11-04
   */

  const getDateValue = (dateValue) => {
    if (dateValue === null || dateValue === undefined || dateValue === "") {
      return "";
    }

    // =====================================================
    // String
    // =====================================================

    if (typeof dateValue === "string") {
      const value = dateValue.trim();

      // ---------------------------------------------
      // Date only:
      // 2025-11-05
      // لا نستخدم new Date حتى لا يحصل shift
      // ---------------------------------------------
      const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (dateOnlyMatch) {
        return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
      }

      // ---------------------------------------------
      // DD/MM/YYYY
      // ---------------------------------------------
      const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

      if (slashMatch) {
        const day = String(slashMatch[1]).padStart(2, "0");
        const month = String(slashMatch[2]).padStart(2, "0");
        const year = slashMatch[3];

        return `${year}-${month}-${day}`;
      }

      // ---------------------------------------------
      // ISO timestamp:
      // 2025-11-04T21:00:00.000Z
      //
      // نستخدم الوقت المحلي للسعودية
      // حتى يصبح 21:00 UTC = 00:00 Saudi
      // فيظهر اليوم الصحيح
      // ---------------------------------------------
      const isoDateTimeMatch = value.match(/^\d{4}-\d{2}-\d{2}T/);

      if (isoDateTimeMatch) {
        const parsed = new Date(value);

        if (!Number.isNaN(parsed.getTime())) {
          const year = parsed.getFullYear();

          const month = String(parsed.getMonth() + 1).padStart(2, "0");

          const day = String(parsed.getDate()).padStart(2, "0");

          return `${year}-${month}-${day}`;
        }
      }

      // ---------------------------------------------
      // Fallback
      // ---------------------------------------------
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();

        const month = String(parsed.getMonth() + 1).padStart(2, "0");

        const day = String(parsed.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      }

      return value;
    }

    // =====================================================
    // Date object
    // =====================================================

    if (dateValue instanceof Date) {
      if (Number.isNaN(dateValue.getTime())) {
        return "";
      }

      const year = dateValue.getFullYear();

      const month = String(dateValue.getMonth() + 1).padStart(2, "0");

      const day = String(dateValue.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    return "";
  };

  // =====================================================
  // Format Date
  // =====================================================

  const formatDate = (dateValue) => {
    const normalized = getDateValue(dateValue);

    if (!normalized) {
      return "-";
    }

    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return normalized;
    }

    return `${match[3]}/${match[2]}/${match[1]}`;
  };

  // =====================================================
  // Time Helpers
  // =====================================================

  const getTimeFrom = (assignment) =>
    assignment.time_from ??
    assignment.timeFrom ??
    assignment.from ??
    assignment.start_time ??
    assignment.startTime ??
    "-";

  const getTimeTo = (assignment) =>
    assignment.time_to ??
    assignment.timeTo ??
    assignment.to ??
    assignment.end_time ??
    assignment.endTime ??
    "-";

  // =====================================================
  // Convert Time To Minutes
  // =====================================================

  const timeToMinutes = (value) => {
    if (value === null || value === undefined || value === "") {
      return Number.MAX_SAFE_INTEGER;
    }

    const text = String(value).trim().toUpperCase();

    // ---------------------------------------------
    // HH:MM AM / PM
    // ---------------------------------------------

    const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

    if (match12) {
      let hour = Number(match12[1]);

      const minute = Number(match12[2]);

      const meridiem = match12[3];

      if (meridiem === "AM" && hour === 12) {
        hour = 0;
      }

      if (meridiem === "PM" && hour !== 12) {
        hour += 12;
      }

      return hour * 60 + minute;
    }

    // ---------------------------------------------
    // HH:MM
    // ---------------------------------------------

    const match24 = text.match(/^(\d{1,2}):(\d{2})$/);

    if (match24) {
      return Number(match24[1]) * 60 + Number(match24[2]);
    }

    // ---------------------------------------------
    // HH:MM:SS
    // ---------------------------------------------

    const match24Seconds = text.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);

    if (match24Seconds) {
      return Number(match24Seconds[1]) * 60 + Number(match24Seconds[2]);
    }

    return Number.MAX_SAFE_INTEGER;
  };

  // =====================================================
  // Format Time
  // =====================================================

  const formatTime = (value) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    return String(value);
  };

  // =====================================================
  // Fetch Plan + Supervisors
  // =====================================================

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // -----------------------------------------------
        // Load Plan
        // -----------------------------------------------

        const res = await getPlan(planId);

        console.log("📦 PLAN RESPONSE:", res);

        if (!res?.success) {
          throw new Error(res?.message || "Failed to load plan");
        }

        const data = res.data || {};

        // -----------------------------------------------
        // Assignments
        // -----------------------------------------------

        let assignments = [];

        if (Array.isArray(data)) {
          assignments = data;
        } else if (Array.isArray(data.assignments)) {
          assignments = data.assignments;
        } else if (Array.isArray(data.result)) {
          assignments = data.result;
        } else if (Array.isArray(data.data)) {
          assignments = data.data;
        }

        // -----------------------------------------------
        // Groups
        //
        // نستخدم groups لإضافة From / To
        // إذا لم تكن موجودة داخل assignment.
        // -----------------------------------------------

        const groups = Array.isArray(data.groups) ? data.groups : [];

        const groupsMap = new Map();

        groups.forEach((group) => {
          const groupId =
            group.id ?? group.session_group_id ?? group.sessionGroupId;

          if (groupId !== null && groupId !== undefined) {
            groupsMap.set(String(groupId), group);
          }
        });

        // -----------------------------------------------
        // Enrich assignments
        // -----------------------------------------------

        assignments = assignments.map((assignment) => {
          const groupId =
            assignment.session_group_id ??
            assignment.sessionGroupId ??
            assignment.id;

          const group = groupsMap.get(String(groupId));

          if (!group) {
            return assignment;
          }

          return {
            ...group,
            ...assignment,

            // Assignment wins if it has values
            time_from:
              assignment.time_from ??
              assignment.timeFrom ??
              group.time_from ??
              group.timeFrom ??
              null,

            time_to:
              assignment.time_to ??
              assignment.timeTo ??
              group.time_to ??
              group.timeTo ??
              null,

            period_label:
              assignment.period_label ??
              assignment.period ??
              group.period_label ??
              group.period ??
              null,

            date: assignment.date ?? group.date ?? null,

            crn: assignment.crn ?? group.crn ?? null,

            professor_name:
              assignment.professor_name ??
              assignment.professor ??
              group.professor_name ??
              group.professor ??
              null,
          };
        });

        // -----------------------------------------------
        // Remove accidental duplicate assignment objects
        // -----------------------------------------------

        const uniqueAssignments = [];
        const seenAssignmentIds = new Set();

        assignments.forEach((assignment) => {
          const assignmentId = assignment.id;

          // If assignment has a real DB ID,
          // use it as the unique identity.
          if (
            assignmentId !== null &&
            assignmentId !== undefined &&
            assignmentId !== ""
          ) {
            const key = String(assignmentId);

            if (seenAssignmentIds.has(key)) {
              return;
            }

            seenAssignmentIds.add(key);
          }

          uniqueAssignments.push(assignment);
        });

        assignments = uniqueAssignments;
        // -----------------------------------------------
        // Conflicts
        // -----------------------------------------------

        const planConflicts = Array.isArray(data.conflicts)
          ? data.conflicts
          : [];

        setPlanData(assignments);

        console.log("=================================");
console.log("FINAL PLAN DATA:", assignments.length);

console.table(
  assignments.map((x) => ({
    assignmentId: x.id,
    sessionGroupId: x.session_group_id,
    crn: x.crn,
    date: x.date,
    period: x.period_label,
    professor: x.professor_name,
    supervisor: x.supervisor_name,
  }))
);

console.log(
  "DUPLICATE ASSIGNMENT IDS:",
  assignments.filter(
    (item, index, arr) =>
      arr.findIndex((x) => String(x.id) === String(item.id)) !== index
  )
);

console.log(
  "DUPLICATE SESSION GROUP IDS:",
  assignments.filter(
    (item, index, arr) =>
      arr.findIndex(
        (x) =>
          String(x.session_group_id) === String(item.session_group_id)
      ) !== index
  )
);

console.log("=================================");

        console.log("TOTAL ASSIGNMENTS:", assignments.length);

        console.log(
          "ASSIGNMENT IDS:",
          assignments.map((x) => x.id),
        );

        console.log(
          "SESSION GROUP IDS:",
          assignments.map((x) => x.session_group_id),
        );

        setConflicts(planConflicts);

        // -----------------------------------------------
        // Supervisors from Plan
        // -----------------------------------------------

        let supervisorList = [];

        if (Array.isArray(data.supervisors)) {
          supervisorList = data.supervisors;
        }

        // -----------------------------------------------
        // Load Supervisors API
        // -----------------------------------------------

        try {
          const supervisorsRes = await listSupervisors();

          console.log("👥 SUPERVISORS:", supervisorsRes);

          if (Array.isArray(supervisorsRes?.data)) {
            supervisorList = supervisorsRes.data;
          } else if (Array.isArray(supervisorsRes?.data?.data)) {
            supervisorList = supervisorsRes.data.data;
          } else if (Array.isArray(supervisorsRes?.data?.supervisors)) {
            supervisorList = supervisorsRes.data.supervisors;
          }
        } catch (supervisorError) {
          console.warn("⚠️ Could not load supervisors list:", supervisorError);
        }

        setSupervisors(Array.isArray(supervisorList) ? supervisorList : []);
      } catch (err) {
        console.error("❌ Error fetching plan:", err);

        setError(err.message || "Error loading plan");

        setPlanData([]);
        setConflicts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId]);

  // =====================================================
  // Assignment Helpers
  // =====================================================

  const getSessionGroupId = (assignment) =>
    assignment.session_group_id ?? assignment.sessionGroupId ?? null;

  const getSupervisorId = (assignment) =>
    assignment.supervisor_id ?? assignment.supervisorId;

  const getSupervisorName = (assignment) =>
    assignment.supervisor_name ??
    assignment.name ??
    assignment.supervisor ??
    "-";

  const getProfessorName = (assignment) =>
    assignment.professor_name ?? assignment.professor ?? "-";

  const getPeriod = (assignment) =>
    assignment.period_label ?? assignment.period ?? "-";

  // =====================================================
  // Unique Professor Options
  // =====================================================

  const professorOptions = useMemo(() => {
    return [
      ...new Set(
        planData
          .map((item) => getProfessorName(item))
          .filter((value) => value && value !== "-"),
      ),
    ].sort((a, b) => String(a).localeCompare(String(b), "ar"));
  }, [planData]);

  // =====================================================
  // Period Options
  // =====================================================

  const periodOptions = useMemo(() => {
    return [
      ...new Set(
        planData
          .map((item) => getPeriod(item))
          .filter((value) => value && value !== "-"),
      ),
    ];
  }, [planData]);

  // =====================================================
  // Supervisor Options
  // =====================================================

  const supervisorOptions = useMemo(() => {
    const names = new Set();

    // Supervisors from API
    supervisors.forEach((supervisor) => {
      const name = supervisor.name ?? supervisor.supervisor_name;

      if (name) {
        names.add(String(name));
      }
    });

    // Supervisors already appearing
    // in the plan
    planData.forEach((assignment) => {
      const name = getSupervisorName(assignment);

      if (name && name !== "-") {
        names.add(String(name));
      }
    });

    return [...names].sort((a, b) => a.localeCompare(b, "ar"));
  }, [supervisors, planData]);

  // =====================================================
  // Filtered + Sorted Assignments
  // =====================================================

  const filteredPlanData = useMemo(() => {
    const text = search.trim().toLowerCase();

    const filtered = planData.filter((assignment) => {
      const sessionGroup = String(getSessionGroupId(assignment) ?? "");

      const crn = String(assignment.crn ?? "");

      const professor = String(getProfessorName(assignment));

      const supervisor = String(getSupervisorName(assignment));

      const date = String(formatDate(assignment.date));

      const period = String(getPeriod(assignment));

      const timeFrom = String(getTimeFrom(assignment));

      const timeTo = String(getTimeTo(assignment));

      // ---------------------------------------------
      // Search
      // ---------------------------------------------

      const matchesSearch =
        !text ||
        sessionGroup.toLowerCase().includes(text) ||
        crn.toLowerCase().includes(text) ||
        professor.toLowerCase().includes(text) ||
        supervisor.toLowerCase().includes(text) ||
        date.toLowerCase().includes(text) ||
        period.toLowerCase().includes(text) ||
        timeFrom.toLowerCase().includes(text) ||
        timeTo.toLowerCase().includes(text);

      if (!matchesSearch) {
        return false;
      }

      // ---------------------------------------------
      // Supervisor
      // ---------------------------------------------

      if (filterSupervisor && supervisor !== filterSupervisor) {
        return false;
      }

      // ---------------------------------------------
      // Professor
      // ---------------------------------------------

      if (filterProfessor && professor !== filterProfessor) {
        return false;
      }

      // ---------------------------------------------
      // Date
      // ---------------------------------------------

      if (filterDate && getDateValue(assignment.date) !== filterDate) {
        return false;
      }

      // ---------------------------------------------
      // Period
      // ---------------------------------------------

      if (filterPeriod && period !== filterPeriod) {
        return false;
      }

      return true;
    });

    // ===================================================
    // SORT
    //
    // 1. Date
    // 2. From
    // 3. To
    // 4. Period
    // 5. Session Group
    // ===================================================

    return [...filtered].sort((a, b) => {
      const dateA = getDateValue(a.date);

      const dateB = getDateValue(b.date);

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const fromA = timeToMinutes(getTimeFrom(a));

      const fromB = timeToMinutes(getTimeFrom(b));

      if (fromA !== fromB) {
        return fromA - fromB;
      }

      const toA = timeToMinutes(getTimeTo(a));

      const toB = timeToMinutes(getTimeTo(b));

      if (toA !== toB) {
        return toA - toB;
      }

      const periodA = String(getPeriod(a));

      const periodB = String(getPeriod(b));

      const periodCompare = periodA.localeCompare(periodB, "ar");

      if (periodCompare !== 0) {
        return periodCompare;
      }

      const groupA = Number(getSessionGroupId(a));

      const groupB = Number(getSessionGroupId(b));

      if (Number.isFinite(groupA) && Number.isFinite(groupB)) {
        return groupA - groupB;
      }

      return String(getSessionGroupId(a)).localeCompare(
        String(getSessionGroupId(b)),
      );
    });
  }, [
    planData,
    search,
    filterSupervisor,
    filterProfessor,
    filterDate,
    filterPeriod,
  ]);

  // =====================================================
  // Supervisor Statistics
  //
  // نعد الفترات الفعلية:
  // نفس المشرف + نفس اليوم + نفس الفترة = فترة واحدة
  // =====================================================

  const supervisorStats = useMemo(() => {
    const stats = {};

    planData.forEach((assignment) => {
      const supervisorId = getSupervisorId(assignment);

      const supervisorName = getSupervisorName(assignment);

      if (!supervisorId || !supervisorName || supervisorName === "-") {
        return;
      }

      const key = String(supervisorId);

      if (!stats[key]) {
        stats[key] = {
          id: supervisorId,
          name: supervisorName,
          periods: new Set(),
        };
      }

      const date = getDateValue(assignment.date);

      const period = getPeriod(assignment);

      if (date && period && period !== "-") {
        stats[key].periods.add(`${date}|${period}`);
      }
    });

    return Object.values(stats)
      .map((item) => ({
        id: item.id,
        name: item.name,
        count: item.periods.size,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.name.localeCompare(b.name, "ar");
      });
  }, [planData]);

  // =====================================================
  // Fairness
  // =====================================================

  const fairness = useMemo(() => {
    if (!supervisorStats.length) {
      return {
        min: 0,
        max: 0,
        difference: 0,
      };
    }

    const counts = supervisorStats.map((item) => item.count);

    const min = Math.min(...counts);

    const max = Math.max(...counts);

    return {
      min,
      max,
      difference: max - min,
    };
  }, [supervisorStats]);

  // =====================================================
  // Column Toggle
  // =====================================================

  const toggleColumn = (column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // =====================================================
  // Clear Filters
  // =====================================================

  const clearFilters = () => {
    setSearch("");
    setFilterSupervisor("");
    setFilterProfessor("");
    setFilterDate("");
    setFilterPeriod("");
  };

  // =====================================================
  // Start Editing
  // =====================================================

  const startEditing = (assignment) => {
    const id = getSessionGroupId(assignment);

    setEditingId(id);

    setEditingSupervisor(String(getSupervisorId(assignment) ?? ""));
  };

  // =====================================================
  // Cancel Editing
  // =====================================================

  const cancelEditing = () => {
    setEditingId(null);
    setEditingSupervisor("");
  };

  // =====================================================
  // Save Assignment
  // =====================================================

  const saveAssignment = async (assignment) => {
    const sessionGroupId = getSessionGroupId(assignment);

    if (
      sessionGroupId === null ||
      sessionGroupId === undefined ||
      sessionGroupId === ""
    ) {
      alert("❌ Session Group ID is missing.");
      return;
    }

    if (!editingSupervisor) {
      alert("⚠️ Please select a supervisor.");
      return;
    }

    const currentSupervisorId = getSupervisorId(assignment);

    // ---------------------------------------------
    // Nothing changed
    // ---------------------------------------------

    if (String(currentSupervisorId ?? "") === String(editingSupervisor)) {
      cancelEditing();
      return;
    }

    try {
      setSavingId(sessionGroupId);

      // ---------------------------------------------
      // IMPORTANT:
      // Backend expects:
      //
      // sessionGroupId
      // fromSupervisorId
      // toSupervisorId
      // ---------------------------------------------

      await moveAssignment(planId, {
        sessionGroupId: Number(sessionGroupId),

        fromSupervisorId: Number(currentSupervisorId),

        toSupervisorId: Number(editingSupervisor),
      });

      // ---------------------------------------------
      // Find selected supervisor
      // ---------------------------------------------

      const selectedSupervisor = supervisors.find(
        (supervisor) => String(supervisor.id) === String(editingSupervisor),
      );

      const newSupervisorName =
        selectedSupervisor?.name ?? selectedSupervisor?.supervisor_name ?? "";

      // ---------------------------------------------
      // Update locally
      // ---------------------------------------------

      setPlanData((prev) =>
        prev.map((item) => {
          const itemId = getSessionGroupId(item);

          if (String(itemId) !== String(sessionGroupId)) {
            return item;
          }

          return {
            ...item,

            supervisor_id: Number(editingSupervisor),

            supervisorId: Number(editingSupervisor),

            supervisor_name: newSupervisorName,

            supervisor: newSupervisorName,

            name: newSupervisorName,
          };
        }),
      );

      cancelEditing();
    } catch (err) {
      console.error("❌ Error moving assignment:", err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to update assignment.",
      );
    } finally {
      setSavingId(null);
    }
  };

  // =====================================================
  // No Plan
  // =====================================================

  if (!planId) {
    return (
      <div
        style={{
          padding: "20px",
        }}
      >
        <p>⚠️ No plan selected.</p>
      </div>
    );
  }

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
        }}
      >
        <p>⏳ Loading plan data...</p>
      </div>
    );
  }

  // =====================================================
  // Error
  // =====================================================

  if (error) {
    return (
      <div
        style={{
          padding: "20px",
        }}
      >
        <p>❌ {error}</p>
      </div>
    );
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="plan-page">
      {/* =================================================
          Title
      ================================================= */}

      <h2>📅 Plan Result</h2>

      {/* =================================================
          Summary
      ================================================= */}

      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          marginTop: "15px",
          marginBottom: "25px",
        }}
      >
        <div>
          <strong>Total assignments:</strong> {planData.length}
        </div>

        <div>
          <strong>Showing:</strong> {filteredPlanData.length}
        </div>

        <div>
          <strong>Supervisors:</strong> {supervisorStats.length}
        </div>

        <div>
          <strong>Min periods:</strong> {fairness.min}
        </div>

        <div>
          <strong>Max periods:</strong> {fairness.max}
        </div>

        <div>
          <strong>Difference:</strong> {fairness.difference}
        </div>
      </div>

      {/* =================================================
          Search & Filters
      ================================================= */}

      {planData.length > 0 && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "20px",
            background: "#fafafa",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            🔎 Search & Filters
          </h3>

          {/* Search */}

          <div
            style={{
              marginBottom: "15px",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Session Group, CRN, Professor, Supervisor, Date, Period, From or To..."
              style={{
                width: "100%",
                maxWidth: "750px",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Filters */}

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {/* Supervisor */}

            <select
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
              style={{
                padding: "9px",
                minWidth: "180px",
              }}
            >
              <option value="">All Supervisors</option>

              {supervisorOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Professor */}

            <select
              value={filterProfessor}
              onChange={(e) => setFilterProfessor(e.target.value)}
              style={{
                padding: "9px",
                minWidth: "180px",
              }}
            >
              <option value="">All Professors</option>

              {professorOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Date */}

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                padding: "8px",
              }}
            />

            {/* Period */}

            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              style={{
                padding: "9px",
                minWidth: "150px",
              }}
            >
              <option value="">All Periods</option>

              {periodOptions.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>

            {/* Clear */}

            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              ✖ Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          Column Visibility
      ================================================= */}

      {planData.length > 0 && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            👁️ Columns
          </h3>

          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={visibleColumns.sessionGroup}
                onChange={() => toggleColumn("sessionGroup")}
              />{" "}
              Session Group
            </label>

            <label>
              <input
                type="checkbox"
                checked={visibleColumns.crn}
                onChange={() => toggleColumn("crn")}
              />{" "}
              CRN
            </label>

            <label>
              <input
                type="checkbox"
                checked={visibleColumns.professor}
                onChange={() => toggleColumn("professor")}
              />{" "}
              Professor
            </label>

            <label>
              <input
                type="checkbox"
                checked={visibleColumns.date}
                onChange={() => toggleColumn("date")}
              />{" "}
              Date
            </label>

            <label>
              <input
                type="checkbox"
                checked={visibleColumns.period}
                onChange={() => toggleColumn("period")}
              />{" "}
              Period
            </label>

            <label>
              <input
                type="checkbox"
                checked={visibleColumns.timeFrom}
                onChange={() => toggleColumn("timeFrom")}
              />{" "}
              From
            </label>

            <label>
              <input
                type="checkbox"
                checked={visibleColumns.timeTo}
                onChange={() => toggleColumn("timeTo")}
              />{" "}
              To
            </label>

            <label>
              <input
                type="checkbox"
                checked={visibleColumns.supervisor}
                onChange={() => toggleColumn("supervisor")}
              />{" "}
              Supervisor
            </label>
          </div>
        </div>
      )}

      {/* =================================================
          Main Assignments Table
      ================================================= */}

      {planData.length > 0 ? (
        <>
          <h3>📋 Assignments</h3>

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              border="1"
              cellPadding="8"
              style={{
                marginTop: "15px",
                borderCollapse: "collapse",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  {visibleColumns.sessionGroup && <th>Session Group</th>}

                  {visibleColumns.crn && <th>CRN</th>}

                  {visibleColumns.professor && <th>Professor</th>}

                  {visibleColumns.date && <th>Date</th>}

                  {visibleColumns.period && <th>Period</th>}

                  {visibleColumns.timeFrom && <th>From</th>}

                  {visibleColumns.timeTo && <th>To</th>}

                  {visibleColumns.supervisor && <th>Supervisor</th>}

                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredPlanData.length > 0 ? (
                  filteredPlanData.map((assignment, index) => {
                    const rowId = getSessionGroupId(assignment);

                    const isEditing = String(editingId) === String(rowId);

                    const isSaving = String(savingId) === String(rowId);

                    return (
                      <tr key={`${rowId}-${index}`}>
                        {/* Session Group */}

                        {visibleColumns.sessionGroup && <td>{rowId ?? "-"}</td>}

                        {/* CRN */}

                        {visibleColumns.crn && <td>{assignment.crn ?? "-"}</td>}

                        {/* Professor */}

                        {visibleColumns.professor && (
                          <td>{getProfessorName(assignment)}</td>
                        )}

                        {/* Date */}

                        {visibleColumns.date && (
                          <td>{formatDate(assignment.date)}</td>
                        )}

                        {/* Period */}

                        {visibleColumns.period && (
                          <td>{getPeriod(assignment)}</td>
                        )}

                        {/* From */}

                        {visibleColumns.timeFrom && (
                          <td>
                            <span className="time-badge">
                              {formatTime(getTimeFrom(assignment))}
                            </span>
                          </td>
                        )}

                        {/* To */}

                        {visibleColumns.timeTo && (
                          <td>
                            <span className="time-badge">
                              {formatTime(getTimeTo(assignment))}
                            </span>
                          </td>
                        )}

                        {/* Supervisor */}

                        {visibleColumns.supervisor && (
                          <td>
                            {isEditing ? (
                              <select
                                value={editingSupervisor}
                                onChange={(e) =>
                                  setEditingSupervisor(e.target.value)
                                }
                                disabled={isSaving}
                                style={{
                                  padding: "6px",
                                  minWidth: "180px",
                                }}
                              >
                                <option value="">
                                  -- Select Supervisor --
                                </option>

                                {supervisors.map((supervisor) => (
                                  <option
                                    key={supervisor.id}
                                    value={supervisor.id}
                                  >
                                    {supervisor.name ??
                                      supervisor.supervisor_name ??
                                      "-"}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              getSupervisorName(assignment)
                            )}
                          </td>
                        )}

                        {/* Action */}

                        <td>
                          {isEditing ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => saveAssignment(assignment)}
                                disabled={isSaving}
                              >
                                {isSaving ? "⏳ Saving..." : "💾 Save"}
                              </button>

                              <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={isSaving}
                              >
                                ✖ Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditing(assignment)}
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={
                        Object.values(visibleColumns).filter(Boolean).length + 1
                      }
                      style={{
                        textAlign: "center",
                        padding: "20px",
                      }}
                    >
                      🔍 No results match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>⚠️ No assignments found.</p>
      )}

      {/* =================================================
          Supervisor Statistics
      ================================================= */}

      {supervisorStats.length > 0 && (
        <div
          style={{
            marginTop: "40px",
          }}
        >
          <h3>👥 Supervisor Statistics</h3>

          <table
            border="1"
            cellPadding="8"
            style={{
              marginTop: "15px",
              borderCollapse: "collapse",
              width: "100%",
              maxWidth: "700px",
            }}
          >
            <thead>
              <tr>
                <th>#</th>

                <th>Supervisor</th>

                <th>Periods</th>
              </tr>
            </thead>

            <tbody>
              {supervisorStats.map((item, index) => (
                <tr key={item.id ?? item.name}>
                  <td>{index + 1}</td>

                  <td>{item.name}</td>

                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =================================================
          Unassigned / Conflicts
      ================================================= */}

      <div
        style={{
          marginTop: "40px",
        }}
      >
        <h3>⚠️ Unassigned / Conflicts</h3>

        {conflicts.length > 0 ? (
          <table
            border="1"
            cellPadding="8"
            style={{
              marginTop: "15px",
              borderCollapse: "collapse",
              width: "100%",
            }}
          >
            <thead>
              <tr>
                <th>Session Group</th>

                <th>CRN</th>

                <th>Date</th>

                <th>Period</th>

                <th>From</th>

                <th>To</th>

                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              {conflicts.map((conflict, index) => (
                <tr key={index}>
                  <td>
                    {conflict.session_group_id ?? conflict.group_id ?? "-"}
                  </td>

                  <td>{conflict.crn ?? "-"}</td>

                  <td>{formatDate(conflict.date)}</td>

                  <td>{conflict.period_label ?? conflict.period ?? "-"}</td>

                  <td>
                    {formatTime(
                      conflict.time_from ?? conflict.timeFrom ?? conflict.from,
                    )}
                  </td>

                  <td>
                    {formatTime(
                      conflict.time_to ?? conflict.timeTo ?? conflict.to,
                    )}
                  </td>

                  <td>
                    {conflict.reason ?? conflict.message ?? "Unable to assign"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>✅ No conflicts found.</p>
        )}
      </div>

      {/* =================================================
          Download
      ================================================= */}

      {downloadUrl && (
        <div
          style={{
            marginTop: "30px",
          }}
        >
          <a href={downloadUrl} download>
            📥 Download Plan File
          </a>
        </div>
      )}
    </div>
  );
}
