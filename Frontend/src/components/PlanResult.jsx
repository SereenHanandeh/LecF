import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "../assets/planResult.css";
import { getPlan, listSupervisors, moveAssignment } from "../api.js";

// =====================================================
// Date Helper
// خارج الـ component لأنها لا تعتمد على state أو props
// =====================================================

const formatDate = (value) => {
  if (!value) return "-";

  // إذا كانت القيمة أصلًا بصيغة YYYY-MM-DD
  if (typeof value === "string") {
    const trimmed = value.trim();

    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
    }

    // DD/MM/YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (slashMatch) {
      return `${String(slashMatch[1]).padStart(2, "0")}/${String(
        slashMatch[2],
      ).padStart(2, "0")}/${slashMatch[3]}`;
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// =====================================================
// Date Value Helper
// =====================================================

const getDateValue = (dateValue) => {
  if (dateValue === null || dateValue === undefined || dateValue === "") {
    return "";
  }

  // Date object
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      return "";
    }

    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (typeof dateValue === "string") {
    const value = dateValue.trim();

    if (!value) {
      return "";
    }

    // YYYY-MM-DD
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
    }

    // DD/MM/YYYY
    const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (slashMatch) {
      const day = String(slashMatch[1]).padStart(2, "0");
      const month = String(slashMatch[2]).padStart(2, "0");
      const year = slashMatch[3];

      return `${year}-${month}-${day}`;
    }

    // ISO timestamp
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);

    if (isoMatch) {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      }

      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    return value;
  }

  return "";
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

const formatTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
};

const timeToMinutes = (value) => {
  if (value === null || value === undefined || value === "") {
    return Number.MAX_SAFE_INTEGER;
  }

  const text = String(value).trim().toUpperCase();

  // 12-hour format
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

  // 24-hour format
  const match24 = text.match(/^(\d{1,2}):(\d{2})$/);

  if (match24) {
    return Number(match24[1]) * 60 + Number(match24[2]);
  }

  // 24-hour with seconds
  const match24Seconds = text.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);

  if (match24Seconds) {
    return Number(match24Seconds[1]) * 60 + Number(match24Seconds[2]);
  }

  return Number.MAX_SAFE_INTEGER;
};

// =====================================================
// Assignment Helpers
// =====================================================

const getSessionGroupId = (assignment) =>
  assignment.session_group_id ??
  assignment.sessionGroupId ??
  assignment.group_id ??
  assignment.groupId ??
  null;

const getSupervisorId = (assignment) =>
  assignment.supervisor_id ?? assignment.supervisorId ?? null;

const getSupervisorName = (assignment) =>
  assignment.supervisor_name ??
  assignment.supervisorName ??
  assignment.supervisor ??
  assignment.name ??
  "-";

const getProfessorName = (assignment) =>
  assignment.professor_name ??
  assignment.professorName ??
  assignment.professor ??
  "-";

const getPeriod = (assignment) =>
  assignment.period_label ?? assignment.period ?? "-";

// =====================================================
// Component
// =====================================================

export default function PlanResult() {
  const location = useLocation();
  const { planId: routePlanId } = useParams();

  const statePlanId = location.state?.planId;

  const planId = routePlanId || statePlanId;

  const downloadUrl = location.state?.downloadUrl;

  // =====================================================
  // State
  // =====================================================

  const [planData, setPlanData] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [affinities, setAffinities] = useState([]);
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
  // Selected supervisor from statistics
  // =====================================================

  const [selectedStatsSupervisor, setSelectedStatsSupervisor] = useState("");

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

  console.log("=================================");
  console.log("🔎 PLAN RESULT DEBUG");
  console.log("🔎 routePlanId:", routePlanId);
  console.log("🔎 statePlanId:", statePlanId);
  console.log("🔎 final planId:", planId);
  console.log("🔎 API URL:", `/plan/${planId}`);
  console.log("=================================");

  // =====================================================
  // Load Plan
  // =====================================================

  // =====================================================
  // Load Plan
  // =====================================================

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      setError("لم يتم العثور على رقم الخطة.");
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("=================================");
        console.log("📥 FETCHING PLAN");
        console.log("📌 planId:", planId);
        console.log("📌 API:", `/plan/${planId}`);
        console.log("=================================");

        const res = await getPlan(planId);

        console.log("=================================");
        console.log("📦 PLAN RESPONSE:");
        console.log(res);
        console.log("=================================");

        if (!res?.success) {
          throw new Error(res?.message || res?.error || "Failed to load plan");
        }

        const data = res.data || {};

        const planAffinities = Array.isArray(data.affinities)
          ? data.affinities
          : [];

        console.log("🔗 PLAN AFFINITIES:", planAffinities);

        if (!cancelled) {
          setAffinities(planAffinities);
        }

        // =================================================
        // Assignments
        // =================================================

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

        console.log("📋 Assignments before enrichment:", assignments.length);

        // =================================================
        // Groups
        // =================================================

        const groups = Array.isArray(data.groups) ? data.groups : [];

        const groupsMap = new Map();

        groups.forEach((group) => {
          const groupId =
            group.id ?? group.session_group_id ?? group.sessionGroupId;

          if (groupId !== null && groupId !== undefined) {
            groupsMap.set(String(groupId), group);
          }
        });

        // =================================================
        // Enrich Assignments
        // =================================================

        assignments = assignments.map((assignment) => {
          const groupId =
            assignment.session_group_id ??
            assignment.sessionGroupId ??
            assignment.group_id ??
            assignment.groupId ??
            null;

          const group = groupsMap.get(String(groupId));

          if (!group) {
            return assignment;
          }

          return {
            ...group,
            ...assignment,

            session_group_id:
              assignment.session_group_id ??
              assignment.sessionGroupId ??
              group.session_group_id ??
              group.sessionGroupId ??
              group.id ??
              null,

            sessionGroupId:
              assignment.session_group_id ??
              assignment.sessionGroupId ??
              group.session_group_id ??
              group.sessionGroupId ??
              group.id ??
              null,

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

        // =================================================
        // Remove duplicate assignment IDs
        // =================================================

        const uniqueAssignments = [];
        const seenAssignmentIds = new Set();

        assignments.forEach((assignment) => {
          const assignmentId = assignment.id;

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

        // =================================================
        // Conflicts
        // =================================================

        const planConflicts = Array.isArray(data.conflicts)
          ? data.conflicts
          : [];

        // =================================================
        // Save plan data
        // =================================================

        if (!cancelled) {
          setPlanData(assignments);
          setConflicts(planConflicts);
        }

        console.log("✅ TOTAL ASSIGNMENTS:", assignments.length);

        console.table(
          assignments.map((x) => ({
            assignmentId: x.id,
            sessionGroupId: x.session_group_id,
            crn: x.crn,
            date: x.date,
            period: x.period_label,
            professor: x.professor_name,
            supervisor: x.supervisor_name,
          })),
        );

        // =================================================
        // Supervisors
        // =================================================

        let planSupervisors = [];

        // =================================================
        // Selected Supervisors / Duty Pool
        // =================================================
        // مهم جدًا:
        // نريد فقط المشرفين الذين تم اختيارهم لهذه الخطة.
        // لا نريد جميع مشرفي النظام.

        // 1. Duty Pool - الأفضلية الأولى
        if (Array.isArray(data.dutyPool)) {
          planSupervisors = data.dutyPool;
        }

        // 2. snake_case
        if (!planSupervisors.length && Array.isArray(data.duty_pool)) {
          planSupervisors = data.duty_pool;
        }

        // 3. إذا الـ backend رجع supervisors وفيهم فقط المختارين
        if (!planSupervisors.length && Array.isArray(data.supervisors)) {
          planSupervisors = data.supervisors;
        }

        console.log("🎯 SELECTED SUPERVISORS FROM PLAN:", planSupervisors);

        // =================================================
        // Load ALL supervisors once
        // =================================================

        try {
          const supervisorsRes = await listSupervisors();

          console.log("👥 ALL SUPERVISORS:", supervisorsRes);

          let allSupervisors = [];

          if (Array.isArray(supervisorsRes?.supervisors)) {
            allSupervisors = supervisorsRes.supervisors;
          } else if (Array.isArray(supervisorsRes?.data)) {
            allSupervisors = supervisorsRes.data;
          } else if (Array.isArray(supervisorsRes?.data?.supervisors)) {
            allSupervisors = supervisorsRes.data.supervisors;
          } else if (Array.isArray(supervisorsRes?.data?.data)) {
            allSupervisors = supervisorsRes.data.data;
          }

          // =================================================
          // Convert IDs -> supervisor objects
          // =================================================

          // =================================================
          // Convert Duty Pool IDs -> Supervisor Objects
          // =================================================
          // إذا الـ duty pool رجع IDs فقط، نحولهم إلى objects
          // باستخدام قائمة جميع المشرفين كمصدر أسماء فقط.

          if (
            planSupervisors.length &&
            !planSupervisors.every((item) => item && typeof item === "object")
          ) {
            planSupervisors = planSupervisors
              .map((item) => {
                const id =
                  typeof item === "object"
                    ? (item.id ?? item.supervisor_id ?? item.supervisorId)
                    : item;

                return allSupervisors.find(
                  (sup) => String(sup.id) === String(id),
                );
              })
              .filter(Boolean);
          }

          // =================================================
          // Remove duplicates
          // =================================================

          const uniqueSupervisors = [];
          const seenIds = new Set();

          planSupervisors.forEach((supervisor) => {
            const id = supervisor?.id ?? supervisor?.supervisor_id;

            if (id === null || id === undefined) {
              return;
            }

            const key = String(id);

            if (seenIds.has(key)) {
              return;
            }

            seenIds.add(key);
            uniqueSupervisors.push(supervisor);
          });

          // =================================================
          // Fallback:
          // supervisors actually used in assignments
          // =================================================

          if (!uniqueSupervisors.length) {
            const usedIds = new Set();

            assignments.forEach((assignment) => {
              const id = assignment.supervisor_id ?? assignment.supervisorId;

              if (id !== null && id !== undefined) {
                usedIds.add(String(id));
              }
            });

            planSupervisors = allSupervisors.filter((sup) =>
              usedIds.has(String(sup.id)),
            );
          } else {
            planSupervisors = uniqueSupervisors;
          }

          console.log("🎯 PLAN SUPERVISORS ONLY:", planSupervisors);

          if (!cancelled) {
            setSupervisors(
              Array.isArray(planSupervisors) ? planSupervisors : [],
            );
          }
        } catch (supervisorError) {
          console.warn("⚠️ Could not load supervisors list:", supervisorError);

          // =================================================
          // Fallback from assignments
          // =================================================

          const map = new Map();

          assignments.forEach((assignment) => {
            const id = assignment.supervisor_id ?? assignment.supervisorId;

            const name =
              assignment.supervisor_name ??
              assignment.supervisorName ??
              assignment.supervisor;

            if (id !== null && id !== undefined && name) {
              map.set(String(id), {
                id,
                name,
              });
            }
          });

          if (!cancelled) {
            setSupervisors(Array.from(map.values()));
          }
        }

        console.log("✅ PLAN LOADED SUCCESSFULLY");
      } catch (err) {
        console.error("❌ Error fetching plan:", err?.response?.data || err);

        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.response?.data?.message ||
              err?.message ||
              "Error loading plan",
          );

          setPlanData([]);
          setConflicts([]);
          setSupervisors([]);
        }
      } finally {
        // =================================================
        // IMPORTANT
        // بدون هذا السطر الصفحة تظل Loading للأبد
        // =================================================

        if (!cancelled) {
          setLoading(false);

          console.log("🏁 PLAN LOADING FINISHED");
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [planId]);

  // =====================================================
  // Professor Options
  // =====================================================

  const professorOptions = useMemo(() => {
    return [
      ...new Set(
        planData
          .map(getProfessorName)
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
        planData.map(getPeriod).filter((value) => value && value !== "-"),
      ),
    ].sort((a, b) => String(a).localeCompare(String(b), "ar"));
  }, [planData]);

  // =====================================================
  // Supervisor Options
  // =====================================================

  const supervisorOptions = useMemo(() => {
    const names = new Set();

    supervisors.forEach((supervisor) => {
      const name = supervisor.name ?? supervisor.supervisor_name;

      if (name) {
        names.add(String(name));
      }
    });

    return [...names].sort((a, b) => a.localeCompare(b, "ar"));
  }, [supervisors]);

  // =====================================================
  // Filtered Data
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

      // =================================================
      // Search
      // =================================================

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

      // Supervisor filter
      if (filterSupervisor && supervisor !== filterSupervisor) {
        return false;
      }

      // Professor filter
      if (filterProfessor && professor !== filterProfessor) {
        return false;
      }

      // Date filter
      if (filterDate && getDateValue(assignment.date) !== filterDate) {
        return false;
      }

      // Period filter
      if (filterPeriod && period !== filterPeriod) {
        return false;
      }

      return true;
    });

    // =================================================
    // Sort
    // =================================================

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
  // =====================================================

  const supervisorStats = useMemo(() => {
    const stats = {};

    planData.forEach((assignment) => {
      const supervisorId = getSupervisorId(assignment);

      const supervisorName = getSupervisorName(assignment);

      if (
        supervisorId === null ||
        supervisorId === undefined ||
        !supervisorName ||
        supervisorName === "-"
      ) {
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
      .sort((a, b) => {
        if (b.periods.size !== a.periods.size) {
          return b.periods.size - a.periods.size;
        }

        return a.name.localeCompare(b.name, "ar");
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        count: item.periods.size,
      }));
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
  // Total Days
  // =====================================================

  const totalDays = useMemo(() => {
    return new Set(
      planData.map((item) => getDateValue(item.date)).filter(Boolean),
    ).size;
  }, [planData]);

  // =====================================================
  // Total Professors
  // =====================================================

  const totalProfessors = useMemo(() => {
    return new Set(
      planData.map(getProfessorName).filter((name) => name && name !== "-"),
    ).size;
  }, [planData]);

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
    setSelectedStatsSupervisor("");
  };

  // =====================================================
  // Click Supervisor Statistics
  // =====================================================

  const handleSupervisorStatsClick = (supervisorName) => {
    setSelectedStatsSupervisor(supervisorName);

    setFilterSupervisor(supervisorName);

    setTimeout(() => {
      document.getElementById("assignments-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // =====================================================
  // Clear Supervisor Selection
  // =====================================================

  const clearSupervisorSelection = () => {
    setSelectedStatsSupervisor("");
    setFilterSupervisor("");
  };

  // =====================================================
  // Start Editing
  // =====================================================

  // =====================================================
  // Get Affinity Supervisor
  // =====================================================

  const getProfessorAffinitySupervisorId = (assignment) => {
    const professorId = assignment.professor_id ?? assignment.professorId;

    if (
      professorId === null ||
      professorId === undefined ||
      professorId === ""
    ) {
      return null;
    }

    const affinity = affinities.find((item) => {
      const affinityProfessorId = item.professor_id ?? item.professorId;

      return String(affinityProfessorId) === String(professorId);
    });

    if (!affinity) {
      return null;
    }

    return affinity.supervisor_id ?? affinity.supervisorId ?? null;
  };

  // =====================================================
  // Start Editing
  // =====================================================

  const startEditing = (assignment) => {
    const id = getSessionGroupId(assignment);

    console.log("=================================");
    console.log("✏️ EDIT BUTTON CLICKED");
    console.log("📦 assignment:", assignment);
    console.log("🆔 sessionGroupId:", id);
    console.log("👤 current supervisor:", getSupervisorId(assignment));

    const affinitySupervisorId = getProfessorAffinitySupervisorId(assignment);

    console.log("🔗 affinity supervisor:", affinitySupervisorId);

    if (id === null || id === undefined || id === "") {
      console.error("❌ Cannot edit: Session Group ID is missing", assignment);

      alert("❌ لا يمكن تعديل هذا السجل لأن Session Group ID غير موجود.");

      return;
    }

    const supervisorId = affinitySupervisorId ?? getSupervisorId(assignment);

    console.log("🎯 supervisor selected for editing:", supervisorId);

    setEditingId(String(id));

    setEditingSupervisor(
      supervisorId !== null && supervisorId !== undefined
        ? String(supervisorId)
        : "",
    );

    console.log("✅ Editing started for:", String(id));

    console.log("=================================");
  };

  // =====================================================
  // Cancel Editing
  // =====================================================

  const cancelEditing = () => {
    console.log("❌ EDIT CANCELLED");

    setEditingId(null);
    setEditingSupervisor("");
  };

  // =====================================================
  // Save Assignment
  // =====================================================

const saveAssignment = async (assignment) => {
  const sessionGroupId = getSessionGroupId(assignment);

  const currentSupervisorId = getSupervisorId(assignment);

  const targetSupervisorId = Number(editingSupervisor);

  console.log("=================================");
  console.log("💾 SAVE ASSIGNMENT");
  console.log("📌 planId:", planId);
  console.log("📌 sessionGroupId:", sessionGroupId);
  console.log("📌 currentSupervisorId:", currentSupervisorId);
  console.log("📌 editingSupervisor:", editingSupervisor);
  console.log("📌 targetSupervisorId:", targetSupervisorId);
  console.log("=================================");

  if (
    sessionGroupId === null ||
    sessionGroupId === undefined ||
    sessionGroupId === ""
  ) {
    alert("❌ Session Group ID is missing.");
    return;
  }

  if (
    currentSupervisorId === null ||
    currentSupervisorId === undefined ||
    currentSupervisorId === "" ||
    !Number.isInteger(Number(currentSupervisorId))
  ) {
    alert("❌ Current Supervisor ID is missing.");
    return;
  }

  if (
    !editingSupervisor ||
    !Number.isInteger(targetSupervisorId)
  ) {
    alert("⚠️ Please select a valid supervisor.");
    return;
  }

  const affinitySupervisorId =
    getProfessorAffinitySupervisorId(assignment);

  if (
    affinitySupervisorId !== null &&
    affinitySupervisorId !== undefined &&
    String(targetSupervisorId) !== String(affinitySupervisorId)
  ) {
    alert(
      "⚠️ هذا الأستاذ مرتبط بمشرف محدد ولا يمكن تغييره إلى مشرف آخر."
    );

    setEditingSupervisor(
      String(affinitySupervisorId)
    );

    return;
  }

  if (
    String(currentSupervisorId) ===
    String(targetSupervisorId)
  ) {
    cancelEditing();
    return;
  }

  try {
    setSavingId(sessionGroupId);

    const payload = {
      sessionGroupId: Number(sessionGroupId),
      fromSupervisorId: Number(currentSupervisorId),
      toSupervisorId: targetSupervisorId,
    };

    console.log("🚀 MOVE ASSIGNMENT REQUEST");
    console.log("📌 planId:", planId);
    console.log("📦 payload:", payload);

    await moveAssignment(planId, payload);

    const selectedSupervisor = supervisors.find(
      (supervisor) =>
        String(supervisor.id) ===
        String(targetSupervisorId),
    );

    const newSupervisorName =
      selectedSupervisor?.name ??
      selectedSupervisor?.supervisor_name ??
      "";

    setPlanData((prev) =>
      prev.map((item) => {
        const itemId = getSessionGroupId(item);

        if (
          String(itemId) !==
          String(sessionGroupId)
        ) {
          return item;
        }

        return {
          ...item,

          supervisor_id: targetSupervisorId,

          supervisorId: targetSupervisorId,

          supervisor_name: newSupervisorName,

          supervisor: newSupervisorName,
        };
      }),
    );

    cancelEditing();

  } catch (err) {
    console.error(
      "❌ Error moving assignment:",
      err,
    );

    console.error(
      "📦 Backend response:",
      err?.response?.data,
    );

    alert(
      err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update assignment.",
    );

  } finally {
    setSavingId(null);
  }
};

  // =====================================================
  // Print
  // =====================================================

  const printPlan = () => {
    window.print();
  };

  // =====================================================
  // Download Excel
  // =====================================================

  const downloadExcel = () => {
    if (!downloadUrl) {
      alert("⚠️ Excel download link is not available.");
      return;
    }

    const link = document.createElement("a");

    link.href = downloadUrl;

    link.download = `plan_${planId}.xlsx`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  // =====================================================
  // No Plan
  // =====================================================

  if (!planId) {
    return (
      <div className="plan-empty">
        <div className="empty-icon">📋</div>

        <h2>No Plan Selected</h2>

        <p>Please generate a plan first.</p>
      </div>
    );
  }

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div className="plan-loading">
        <div className="loading-spinner" />

        <h3>Loading Plan...</h3>

        <p>Please wait while the plan is being loaded.</p>
      </div>
    );
  }

  // =====================================================
  // Error
  // =====================================================

  if (error) {
    return (
      <div className="plan-error">
        <div className="error-icon">⚠️</div>

        <h2>Unable to Load Plan</h2>

        <p>{error}</p>
      </div>
    );
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="plan-page">
      {/* =================================================
          Header
      ================================================= */}

      <header className="plan-header">
        <div className="plan-header-content">
          <div>
            <div className="plan-eyebrow">LECTURE SUPERVISOR SYSTEM</div>

            <h1>📅 Plan Result</h1>

            <p>Generated supervision schedule</p>
          </div>

          <div className="plan-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={printPlan}
            >
              🖨️
              <span>Print Plan</span>
            </button>

            {downloadUrl && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={downloadExcel}
              >
                📥
                <span>Download Excel</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="plan-content">
        {/* =================================================
            Selected Supervisor Banner
        ================================================= */}

        {selectedStatsSupervisor && (
          <div className="selected-supervisor-banner">
            <div className="selected-supervisor-info">
              <span className="selected-icon">👤</span>

              <div>
                <span>Showing assignments for</span>

                <strong>{selectedStatsSupervisor}</strong>
              </div>
            </div>

            <button type="button" onClick={clearSupervisorSelection}>
              ✕ Show All Supervisors
            </button>
          </div>
        )}

        {/* =================================================
            Summary Cards
        ================================================= */}

        <section className="summary-grid">
          <div className="summary-card blue">
            <div className="summary-icon">📋</div>

            <div>
              <span>Total Assignments</span>

              <strong>{planData.length}</strong>
            </div>
          </div>

          <div className="summary-card purple">
            <div className="summary-icon">👨‍🏫</div>

            <div>
              <span>Professors</span>

              <strong>{totalProfessors}</strong>
            </div>
          </div>

          <div className="summary-card green">
            <div className="summary-icon">👥</div>

            <div>
              <span>Supervisors</span>

              <strong>{supervisorStats.length}</strong>
            </div>
          </div>

          <div className="summary-card orange">
            <div className="summary-icon">📅</div>

            <div>
              <span>Plan Days</span>

              <strong>{totalDays}</strong>
            </div>
          </div>

          <div className="summary-card teal">
            <div className="summary-icon">⚖️</div>

            <div>
              <span>Fairness Difference</span>

              <strong>{fairness.difference}</strong>
            </div>
          </div>
        </section>

        {/* =================================================
            Filters
        ================================================= */}

        {planData.length > 0 && (
          <section className="panel filters-panel">
            <div className="panel-heading">
              <div>
                <h2>🔎 Search & Filters</h2>

                <p>Find and filter plan assignments</p>
              </div>

              <button
                type="button"
                className="clear-btn"
                onClick={clearFilters}
              >
                ✕ Clear
              </button>
            </div>

            <div className="search-wrapper">
              <span className="search-icon">🔍</span>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Session Group, CRN, Professor, Supervisor..."
              />

              {search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className="filters-grid">
              <div className="filter-field">
                <label>👥 Supervisor</label>

                <select
                  value={filterSupervisor}
                  onChange={(e) => {
                    setFilterSupervisor(e.target.value);
                    setSelectedStatsSupervisor(e.target.value);
                  }}
                >
                  <option value="">All Selected Supervisors</option>

                  {supervisorOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-field">
                <label>👨‍🏫 Professor</label>

                <select
                  value={filterProfessor}
                  onChange={(e) => setFilterProfessor(e.target.value)}
                >
                  <option value="">All Professors</option>

                  {professorOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-field">
                <label>📅 Date</label>

                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div className="filter-field">
                <label>🕐 Period</label>

                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                >
                  <option value="">All Periods</option>

                  {periodOptions.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filter-result">
              Showing <strong>{filteredPlanData.length}</strong> of{" "}
              <strong>{planData.length}</strong> assignments
            </div>
          </section>
        )}

        {/* =================================================
            Supervisor Statistics
        ================================================= */}

        {supervisorStats.length > 0 && (
          <section className="panel statistics-panel">
            <div className="panel-heading">
              <div>
                <h2>👥 Supervisor Statistics</h2>

                <p>Click a supervisor to view only their assignments</p>
              </div>

              <div className="fairness-badge">
                Difference:
                <strong>{fairness.difference}</strong>
              </div>
            </div>

            <div className="stats-table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Supervisor</th>
                    <th>Periods</th>
                    <th>View</th>
                  </tr>
                </thead>

                <tbody>
                  {supervisorStats.map((item, index) => {
                    const isSelected = selectedStatsSupervisor === item.name;

                    return (
                      <tr
                        key={item.id ?? item.name}
                        className={isSelected ? "selected-stat-row" : ""}
                      >
                        <td>
                          <span className="rank-number">{index + 1}</span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="supervisor-name-button"
                            onClick={() =>
                              handleSupervisorStatsClick(item.name)
                            }
                          >
                            <span className="avatar">
                              {String(item.name).charAt(0)}
                            </span>

                            <span>{item.name}</span>
                          </button>
                        </td>

                        <td>
                          <span className="period-count">{item.count}</span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={
                              isSelected ? "view-btn active" : "view-btn"
                            }
                            onClick={() =>
                              handleSupervisorStatsClick(item.name)
                            }
                          >
                            {isSelected ? "✓ Viewing" : "View Plan"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* =================================================
            Columns
        ================================================= */}

        {planData.length > 0 && (
          <section className="panel columns-panel">
            <div className="panel-heading compact">
              <div>
                <h2>👁️ Table Columns</h2>
              </div>
            </div>

            <div className="column-options">
              {[
                ["sessionGroup", "Session Group"],
                ["crn", "CRN"],
                ["professor", "Professor"],
                ["date", "Date"],
                ["period", "Period"],
                ["timeFrom", "From"],
                ["timeTo", "To"],
                ["supervisor", "Supervisor"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className={
                    visibleColumns[key]
                      ? "column-option active"
                      : "column-option"
                  }
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[key]}
                    onChange={() => toggleColumn(key)}
                  />

                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* =================================================
            Assignments
        ================================================= */}

        <section
          id="assignments-section"
          className="panel assignments-panel print-plan-table"
        >
          <div className="panel-heading">
            <div>
              <h2>📋 Assignments</h2>

              <p>
                {selectedStatsSupervisor
                  ? `Assignments for ${selectedStatsSupervisor}`
                  : "Complete supervision plan"}
              </p>
            </div>

            <div className="assignment-count">{filteredPlanData.length}</div>
          </div>

          {planData.length > 0 ? (
            <div className="table-container">
              {/* =================================================
                  SCREEN TABLE
                  يتأثر بـ visibleColumns
              ================================================= */}

              <table className="assignments-table screen-plan-table">
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

                    <th className="action-column">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPlanData.length > 0 ? (
                    filteredPlanData.map((assignment, index) => {
                      const rowId = getSessionGroupId(assignment);

                      const isEditing =
                        editingId !== null &&
                        editingId !== undefined &&
                        rowId !== null &&
                        rowId !== undefined &&
                        String(editingId) === String(rowId);

                      const isSaving =
                        savingId !== null &&
                        savingId !== undefined &&
                        rowId !== null &&
                        rowId !== undefined &&
                        String(savingId) === String(rowId);

                      const affinitySupervisorId =
                        getProfessorAffinitySupervisorId(assignment);

                      return (
                        <tr key={`${rowId}-${index}`}>
                          {/* Session Group */}
                          {visibleColumns.sessionGroup && (
                            <td>
                              <span className="session-group-badge">
                                {rowId ?? "-"}
                              </span>
                            </td>
                          )}

                          {/* CRN */}
                          {visibleColumns.crn && (
                            <td>
                              <span className="crn-text">
                                {assignment.crn ?? "-"}
                              </span>
                            </td>
                          )}

                          {/* Professor */}
                          {visibleColumns.professor && (
                            <td>
                              <div className="professor-cell">
                                <span className="professor-dot" />

                                <span>{getProfessorName(assignment)}</span>
                              </div>
                            </td>
                          )}

                          {/* Date */}
                          {visibleColumns.date && (
                            <td>
                              <span className="date-badge">
                                {formatDate(assignment.date)}
                              </span>
                            </td>
                          )}

                          {/* Period */}
                          {visibleColumns.period && (
                            <td>
                              <span className="period-badge">
                                {getPeriod(assignment)}
                              </span>
                            </td>
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
                                <div>
                                  <select
                                    className="edit-supervisor-select"
                                    value={editingSupervisor}
                                    onChange={(e) =>
                                      setEditingSupervisor(e.target.value)
                                    }
                                    disabled={
                                      isSaving || affinitySupervisorId !== null
                                    }
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

                                        {String(supervisor.id) ===
                                        String(affinitySupervisorId)
                                          ? " 🔗"
                                          : ""}
                                      </option>
                                    ))}
                                  </select>

                                  {affinitySupervisorId !== null && (
                                    <small className="affinity-note">
                                      🔗 هذا الأستاذ مرتبط بهذا المشرف
                                    </small>
                                  )}
                                </div>
                              ) : (
                                <div className="supervisor-cell">
                                  <span className="supervisor-avatar">
                                    {String(
                                      getSupervisorName(assignment),
                                    ).charAt(0)}
                                  </span>

                                  <span>{getSupervisorName(assignment)}</span>
                                </div>
                              )}
                            </td>
                          )}

                          {/* Action */}
                          <td className="action-column">
                            {isEditing ? (
                              <div className="edit-actions">
                                <button
                                  type="button"
                                  className="save-btn"
                                  onClick={() => saveAssignment(assignment)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? "⏳" : "✓"}

                                  <span>{isSaving ? "Saving" : "Save"}</span>
                                </button>

                                <button
                                  type="button"
                                  className="cancel-btn"
                                  onClick={cancelEditing}
                                  disabled={isSaving}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="edit-btn"
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
                          Object.values(visibleColumns).filter(Boolean).length +
                          1
                        }
                        className="no-results"
                      >
                        <div>
                          <span>🔍</span>

                          <strong>No results found</strong>

                          <p>Try changing the filters or search term.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* =================================================
                  PRINT TABLE

                  هذا الجدول مستقل عن visibleColumns.
                  لذلك عند الطباعة تظهر كل الأعمدة دائمًا.
              ================================================= */}

              <div className="print-only-table">
                <table className="assignments-table print-table">
                  <colgroup>
                    <col className="print-col-group" />
                    <col className="print-col-crn" />
                    <col className="print-col-professor" />
                    <col className="print-col-date" />
                    <col className="print-col-period" />
                    <col className="print-col-time" />
                    <col className="print-col-time" />
                    <col className="print-col-supervisor" />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>Session Group</th>

                      <th>CRN</th>

                      <th>Professor</th>

                      <th>Date</th>

                      <th>Period</th>

                      <th>From</th>

                      <th>To</th>

                      <th>Supervisor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPlanData.length > 0 ? (
                      filteredPlanData.map((assignment, index) => {
                        const rowId = getSessionGroupId(assignment);

                        return (
                          <tr key={`print-${rowId}-${index}`}>
                            <td>{rowId ?? "-"}</td>

                            <td>{assignment.crn ?? "-"}</td>

                            <td className="print-professor" dir="auto">
                              {getProfessorName(assignment)}
                            </td>

                            <td>{formatDate(assignment.date)}</td>

                            <td>{getPeriod(assignment)}</td>

                            <td>{formatTime(getTimeFrom(assignment))}</td>

                            <td>{formatTime(getTimeTo(assignment))}</td>

                            <td className="print-supervisor" dir="auto">
                              {getSupervisorName(assignment)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="print-no-results">
                          No assignments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-plan-data">⚠️ No assignments found.</div>
          )}
        </section>

        {/* =================================================
            Conflicts
        ================================================= */}

        <section className="panel conflicts-panel">
          <div className="panel-heading">
            <div>
              <h2>⚠️ Unassigned / Conflicts</h2>

              <p>Items that could not be assigned automatically</p>
            </div>

            <span
              className={
                conflicts.length > 0
                  ? "conflict-count danger"
                  : "conflict-count success"
              }
            >
              {conflicts.length}
            </span>
          </div>

          {conflicts.length > 0 ? (
            <div className="table-container">
              <table className="conflicts-table">
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
                          conflict.time_from ??
                            conflict.timeFrom ??
                            conflict.from,
                        )}
                      </td>

                      <td>
                        {formatTime(
                          conflict.time_to ?? conflict.timeTo ?? conflict.to,
                        )}
                      </td>

                      <td>
                        <span className="reason-text">
                          {conflict.reason ??
                            conflict.message ??
                            "Unable to assign"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-conflicts">
              <div className="success-check">✓</div>

              <div>
                <strong>No conflicts found</strong>

                <p>All assignments were successfully distributed.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
