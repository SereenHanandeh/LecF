import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar.jsx";
import {
  getPlans,
  deletePlan,
  getSupervisors,
  getAcceptedSupervisorStats,
  getInitialSupervisorStats,
  setInitialSupervisorStat,
} from "../api.js";

import "../assets/Plan.css";

const API_BASE_URL = "http://localhost:5000";

// =====================================================
// Icons
// =====================================================

const Icons = {
  search: (
    <svg viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  ),

  calendar: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 9h18" />
    </svg>
  ),

  eye: (
    <svg viewBox="0 0 24 24">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),

  excel: (
    <svg viewBox="0 0 24 24">
      <path d="M5 3h10l4 4v14H5z" />
      <path d="M14 3v5h5" />
      <path d="m8 12 4 6M12 12l-4 6" />
    </svg>
  ),

  refresh: (
    <svg viewBox="0 0 24 24">
      <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
    </svg>
  ),

  plus: (
    <svg viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),

  users: (
    <svg viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  assignments: (
    <svg viewBox="0 0 24 24">
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),

  trash: (
    <svg viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 15H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),

  arrow: (
    <svg viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),

  print: (
    <svg viewBox="0 0 24 24">
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
    </svg>
  ),
};

// =====================================================
// Helpers
// =====================================================

const NO_CATEGORY = "بدون فئة";

function toArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.plans)) return res.plans;
  return [];
}

function categoryText(value) {
  if (value === null || value === undefined) return null;

  // فئة على شكل كائن: { id, name }
  if (typeof value === "object") {
    return categoryText(
      value.name ?? value.name_ar ?? value.label ?? value.title ?? null,
    );
  }

  const text = String(value).trim();

  return text || null;
}

// اسم الفئة من أي كائن مشرف (يجرب أسماء الحقول المعروفة ثم يكتشف تلقائيًا)
function pickCategory(item) {
  if (!item || typeof item !== "object") return null;

  const knownKeys = [
    "category",
    "category_name",
    "categoryName",
    "supervisor_category",
    "supervisorCategory",
    "category_title",
    "group_name",
    "groupName",
    "group",
    "type",
    "supervisor_type",
    "class",
    "tier",
    "grade",
    "الفئة",
    "فئة",
  ];

  for (const key of knownKeys) {
    const text = categoryText(item[key]);

    if (text) return text;
  }

  // اكتشاف تلقائي: أي حقل اسمه يحوي category/group/فئة (عدا الـ id)
  for (const [key, value] of Object.entries(item)) {
    if (/id$/i.test(key)) continue;

    if (/categ|group|tier|grade|فئ/i.test(key)) {
      const text = categoryText(value);

      if (text) return text;
    }
  }

  return null;
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateRange(from, to) {
  if (!from || !to) {
    return "-";
  }

  return `${formatDate(from)} — ${formatDate(to)}`;
}

// =====================================================
// Weekday Helpers
// =====================================================

function formatWeekday(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
  }).format(date);
}

function formatWeekdayRange(from, to) {
  if (!from || !to) return "-";

  const dayFrom = formatWeekday(from);
  const dayTo = formatWeekday(to);

  if (!dayFrom && !dayTo) return "-";

  if (dayFrom === dayTo) {
    return dayFrom || "-";
  }

  return `${dayFrom} — ${dayTo}`;
}

// =====================================================
// Plan Status
// =====================================================

function getPlanStatus(plan) {
  return plan.status ?? plan.plan_status ?? plan.planStatus ?? "draft";
}

function getStatus(plan) {
  const status = getPlanStatus(plan);

  if (status === "accepted") {
    return {
      label: "مقبولة",
      className: "status-complete",
    };
  }

  if (status === "rejected") {
    return {
      label: "مرفوضة",
      className: "status-rejected",
    };
  }

  return {
    label: "مسودة",
    className: "status-pending",
  };
}

// =====================================================
// Plans Page
// =====================================================

export default function Plans() {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [deletingPlanId, setDeletingPlanId] = useState(null);

  const [supervisorStats, setSupervisorStats] = useState([]);

  // ✅ قائمة المشرفين (لجلب الفئة)
  const [supervisorsList, setSupervisorsList] = useState([]);

  // ✅ خطة 0: الرصيد الابتدائي لكل مشرف
  const [initialStats, setInitialStats] = useState([]);

  const [editingInitialId, setEditingInitialId] = useState(null);
  const [editingInitialValue, setEditingInitialValue] = useState("");
  const [savingInitialId, setSavingInitialId] = useState(null);

  // لتفادي الحفظ عند الضغط على Escape (يسبب blur)
  const skipInitialSaveRef = useRef(false);

  // ===================================================
  // Load Plans
  // ===================================================

  async function loadPlans(showRefresh = false) {
    console.log("Loading plans...");

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      console.log("➡️ Calling getPlans...");
      const response = await getPlans();

      let statsResponse = null;

      try {
        statsResponse = await getAcceptedSupervisorStats();
      } catch (statsError) {
        console.error("⚠️ Failed to load supervisor statistics:", statsError);

        statsResponse = {
          data: [],
        };
      }

      // ✅ تحميل خطة 0 (لا نُفشل الصفحة لو فشلت)
      let initialResponse = null;

      try {
        initialResponse = await getInitialSupervisorStats();
      } catch (initialError) {
        console.error(
          "⚠️ Failed to load initial stats (plan 0):",
          initialError,
        );

        initialResponse = {
          data: [],
        };
      }

      // ✅ تحميل المشرفين لجلب الفئة (لا نُفشل الصفحة لو فشلت)
      let supervisorsResponse = null;

      try {
        supervisorsResponse = await getSupervisors();
      } catch (supError) {
        console.error("⚠️ Failed to load supervisors (categories):", supError);

        supervisorsResponse = {
          data: [],
        };
      }

      const receivedPlans = toArray(response);
      const receivedStats = toArray(statsResponse);
      const receivedInitial = toArray(initialResponse);
      const receivedSupervisors = toArray(supervisorsResponse);

      console.log("📋 Received plans:", receivedPlans);
      console.log("📊 Received stats:", receivedStats);
      console.log("0️⃣ Received initial stats:", receivedInitial);
      console.log("🏷️ Received supervisors:", receivedSupervisors);
      console.log(
        "🏷️ Supervisor fields (first record):",
        receivedSupervisors[0] ? Object.keys(receivedSupervisors[0]) : [],
      );

      setPlans(receivedPlans);
      setSupervisorStats(receivedStats);
      setInitialStats(receivedInitial);
      setSupervisorsList(receivedSupervisors);
    } catch (err) {
      console.error("🔴 ERROR LOADING PLANS:", err);
      console.error("🔴 error message:", err?.message);
      console.error("🔴 error response:", err?.response);
      console.error("🔴 response data:", err?.response?.data);
      console.error("🔴 response status:", err?.response?.status);
      console.error("🔴 error config:", err?.config);

      let errorMessage = "تعذر تحميل الخطط المقبولة.";

      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setPlans([]);
      setSupervisorStats([]);
      setInitialStats([]);
      setSupervisorsList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  // ===================================================
  // Initial Load
  // ===================================================

  useEffect(() => {
    loadPlans();
  }, []);

  // ===================================================
  // Accepted Plans Only
  // ===================================================

  const acceptedPlans = useMemo(() => {
    return plans.filter((plan) => {
      const status = getPlanStatus(plan);

      return status === "accepted";
    });
  }, [plans]);

  // ===================================================
  // Sequential Plan Numbers (خطة 1، خطة 2 ...)
  // مبني على ترتيب تاريخ الإنشاء تصاعديًا، وثابت حتى مع الفلترة
  // ===================================================

  const planNumbers = useMemo(() => {
    const sorted = [...acceptedPlans].sort((a, b) => {
      const dateA = new Date(a.created_at ?? 0).getTime();
      const dateB = new Date(b.created_at ?? 0).getTime();

      if (Number.isNaN(dateA) || Number.isNaN(dateB)) {
        return Number(a.id) - Number(b.id);
      }

      return dateA - dateB;
    });

    const map = new Map();

    sorted.forEach((plan, index) => {
      map.set(String(plan.id), index + 1);
    });

    return map;
  }, [acceptedPlans]);

  // ===================================================
  // Filter
  // ===================================================

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return acceptedPlans.filter((plan) => {
      const name = String(plan.name || "").toLowerCase();

      const id = String(plan.id || "").toLowerCase();

      const number = String(planNumbers.get(String(plan.id)) ?? "");

      return (
        !query ||
        name.includes(query) ||
        id.includes(query) ||
        number.includes(query)
      );
    });
  }, [acceptedPlans, search, planNumbers]);

  // ===================================================
  // Categories (supervisor_id -> category)
  // ===================================================

  const categoryBySupervisor = useMemo(() => {
    const byId = new Map();
    const byName = new Map();

    supervisorsList.forEach((item) => {
      const category = pickCategory(item);

      if (!category) return;

      const id = item.id ?? item.supervisor_id;

      if (id !== undefined && id !== null) {
        byId.set(String(id), category);
      }

      const name = normalizeName(
        item.name ?? item.supervisor_name ?? item.full_name,
      );

      if (name) {
        byName.set(name, category);
      }
    });

    return { byId, byName };
  }, [supervisorsList]);

  // ===================================================
  // Merged Supervisor Stats
  // = الخطط المقبولة + خطة 0 (الرصيد الابتدائي)
  //
  // يشمل أيضًا المشرفين الذين لديهم رصيد ابتدائي فقط
  // ولم يظهروا بعد في أي خطة مقبولة.
  // ===================================================

  const mergedSupervisorStats = useMemo(() => {
    const map = new Map();

    supervisorStats.forEach((supervisor) => {
      map.set(String(supervisor.supervisor_id), {
        ...supervisor,
        initial_count: 0,
      });
    });

    initialStats.forEach((item) => {
      const key = String(item.supervisor_id);

      const initial = Number(item.initial_count || 0);

      const existing = map.get(key);

      if (existing) {
        existing.initial_count = initial;

        // الفئة قد تأتي من جدول الرصيد الابتدائي
        if (!pickCategory(existing) && pickCategory(item)) {
          existing.category = pickCategory(item);
        }

        return;
      }

      map.set(key, {
        supervisor_id: item.supervisor_id,
        supervisor_name: item.supervisor_name,
        category: pickCategory(item),
        total_periods: 0,
        total_assignments: 0,
        accepted_plans: 0,
        plans: [],
        initial_count: initial,
      });
    });

    return [...map.values()]
      .map((supervisor) => {
        const initial = Number(supervisor.initial_count || 0);

        const category =
          pickCategory(supervisor) ??
          categoryBySupervisor.byId.get(String(supervisor.supervisor_id)) ??
          categoryBySupervisor.byName.get(
            normalizeName(supervisor.supervisor_name),
          ) ??
          NO_CATEGORY;

        return {
          ...supervisor,
          category,
          initial_count: initial,
          // خطة 0 تُضاف إلى الفترات والتعيينات معًا
          grand_periods: Number(supervisor.total_periods || 0) + initial,
          grand_assignments:
            Number(supervisor.total_assignments || 0) + initial,
        };
      })
      .sort((a, b) => {
        if (b.grand_periods !== a.grand_periods) {
          return b.grand_periods - a.grand_periods;
        }

        return String(a.supervisor_name || "").localeCompare(
          String(b.supervisor_name || ""),
          "ar",
        );
      });
  }, [supervisorStats, initialStats, categoryBySupervisor]);

  // ===================================================
  // Stats
  // ===================================================
  const totalPlans = acceptedPlans.length;

  const statsSummary = useMemo(() => {
    const counts = mergedSupervisorStats.map((s) =>
      Number(s.grand_periods || 0),
    );

    const max = counts.length ? Math.max(...counts) : 0;
    const min = counts.length ? Math.min(...counts) : 0;

    return {
      supervisors: mergedSupervisorStats.length,
      totalPeriods: counts.reduce((sum, n) => sum + n, 0),
      max,
      difference: max - min,
    };
  }, [mergedSupervisorStats]);

  // ===================================================
  // Category Stats (كل فئة وكم تم التعيين لها)
  // ===================================================

  const categoryStats = useMemo(() => {
    const map = new Map();

    mergedSupervisorStats.forEach((supervisor) => {
      const key = supervisor.category || NO_CATEGORY;

      const current = map.get(key) ?? {
        category: key,
        supervisors: 0,
        periods: 0,
        assignments: 0,
      };

      map.set(key, {
        ...current,
        supervisors: current.supervisors + 1,
        periods: current.periods + Number(supervisor.grand_periods || 0),
        assignments:
          current.assignments + Number(supervisor.grand_assignments || 0),
      });
    });

    return [...map.values()].sort((a, b) => {
      if (b.assignments !== a.assignments) {
        return b.assignments - a.assignments;
      }

      return String(a.category).localeCompare(String(b.category), "ar");
    });
  }, [mergedSupervisorStats]);

  const categoryTotals = useMemo(
    () => ({
      supervisors: categoryStats.reduce((sum, c) => sum + c.supervisors, 0),
      periods: categoryStats.reduce((sum, c) => sum + c.periods, 0),
      assignments: categoryStats.reduce((sum, c) => sum + c.assignments, 0),
    }),
    [categoryStats],
  );

  const printedAt = useMemo(() => formatDate(new Date()), []);

  // عدد المشرفين/التعيينات لكل خطة (خطة 0 لا تدخل هنا)
  const planSupervisorCounts = useMemo(() => {
    const map = new Map();

    supervisorStats.forEach((supervisor) => {
      (Array.isArray(supervisor.plans) ? supervisor.plans : []).forEach((p) => {
        const key = String(p.plan_id ?? p.id);

        const current = map.get(key) ?? { supervisors: 0, assignments: 0 };

        map.set(key, {
          supervisors: current.supervisors + 1,
          assignments: current.assignments + Number(p.assignments ?? 0),
        });
      });
    });

    return map;
  }, [supervisorStats]);

  // ===================================================
  // Initial Value (خطة 0) — Edit / Save
  // ===================================================

  function startInitialEdit(supervisor) {
    skipInitialSaveRef.current = false;

    setEditingInitialId(String(supervisor.supervisor_id));
    setEditingInitialValue(String(supervisor.initial_count ?? 0));
  }

  function cancelInitialEdit() {
    skipInitialSaveRef.current = true;

    setEditingInitialId(null);
    setEditingInitialValue("");
  }

  async function saveInitialEdit(supervisor) {
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }

    const value = Number(editingInitialValue);

    setEditingInitialId(null);

    if (!Number.isInteger(value) || value < 0) {
      alert("أدخلي رقمًا صحيحًا أكبر من أو يساوي 0.");
      return;
    }

    // لم يتغير شيء
    if (value === Number(supervisor.initial_count || 0)) {
      return;
    }

    try {
      setSavingInitialId(String(supervisor.supervisor_id));

      await setInitialSupervisorStat(supervisor.supervisor_id, value);

      setInitialStats((current) => {
        const exists = current.some(
          (item) =>
            String(item.supervisor_id) === String(supervisor.supervisor_id),
        );

        if (exists) {
          return current.map((item) =>
            String(item.supervisor_id) === String(supervisor.supervisor_id)
              ? { ...item, initial_count: value }
              : item,
          );
        }

        return [
          ...current,
          {
            supervisor_id: supervisor.supervisor_id,
            supervisor_name: supervisor.supervisor_name,
            initial_count: value,
          },
        ];
      });
    } catch (err) {
      console.error("🔴 SAVE INITIAL STAT ERROR:", err);

      alert(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          err?.message ??
          "تعذر حفظ القيمة الابتدائية.",
      );
    } finally {
      setSavingInitialId(null);
    }
  }

  // ===================================================
  // Open Plan
  // ===================================================

  function openPlan(planId) {
    console.log("👁 Opening plan:", planId);

    navigate(`/plan-result/${planId}`);
  }

  function openSupervisorReport(supervisorId) {
    navigate(`/supervisor-report/${supervisorId}`);
  }

  // ===================================================
  // Print
  // ===================================================

  function handlePrintStats() {
    window.print();
  }

  // ===================================================
  // Delete Plan
  // ===================================================

  const handleDeletePlan = async (planId) => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذه الخطة؟\n\nلا يمكن التراجع عن عملية الحذف.",
    );

    if (!confirmed) return;

    try {
      setDeletingPlanId(planId);
      setError("");

      console.log("🗑️ Deleting plan:", planId);

      await deletePlan(planId);

      console.log("🟢 Plan deleted successfully:", planId);

      // إعادة تحميل الخطط من الـ Backend
      await loadPlans(true);
    } catch (err) {
      console.error("🔴 DELETE PLAN ERROR:", err);

      const errorMessage =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        "تعذر حذف الخطة.";

      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setDeletingPlanId(null);
    }
  };

  // ===================================================
  // Render
  // ===================================================

  return (
    <div className="plans-layout" dir="rtl">
      <Sidebar />

      {/* =================================================
          Main
      ================================================= */}

      <main className="plans-main">
        {/* =================================================
            Header
        ================================================= */}

        <header className="plans-header">
          <div>
            <div className="plans-breadcrumb">
              LectureFlow
              <span>/</span>
              الخطط المقبولة
            </div>

            <h1>الخطط المقبولة</h1>

            <p>عرض وإدارة جميع خطط توزيع المشرفين التي تم قبولها.</p>
          </div>

          <button className="new-plan-button" onClick={() => navigate("/")}>
            <span className="button-icon">{Icons.plus}</span>
            إنشاء خطة جديدة
          </button>
        </header>

        <section className="sup-stats-card">
          {/* عنوان يظهر في الطباعة فقط */}
          <div className="print-only sup-print-title">
            <h2>تقرير إحصائيات المشرفين — LectureFlow</h2>
            <span>تاريخ الطباعة: {printedAt}</span>
          </div>

          <div className="sup-stats-head">
            <div>
              <h2>إحصائيات المشرفين</h2>
              <p>
                إجمالي الفترات والتعيينات لكل مشرف في الخطط المقبولة، شاملةً
                رصيده الابتدائي (خطة 0). اضغط على الاسم لعرض خططه.
              </p>
            </div>

            {mergedSupervisorStats.length > 0 && (
              <div className="sup-stats-chips">
                <div className="sup-chip">
                  <span>المشرفون</span>
                  <strong>{statsSummary.supervisors}</strong>
                </div>
                <div className="sup-chip">
                  <span>إجمالي الفترات</span>
                  <strong>{statsSummary.totalPeriods}</strong>
                </div>
                <div className="sup-chip">
                  <span>فرق التوزيع</span>
                  <strong>{statsSummary.difference}</strong>
                </div>
              </div>
            )}
          </div>

          {/* زر الطباعة فوق الجدول */}
          {mergedSupervisorStats.length > 0 && (
            <div className="sup-print-bar no-print">
              <button
                type="button"
                className="sup-print-btn"
                onClick={handlePrintStats}
                title="طباعة كل الإحصائيات"
              >
                <span className="sup-print-icon">{Icons.print}</span>
                طباعة الإحصائيات
              </button>
            </div>
          )}

          {mergedSupervisorStats.length === 0 ? (
            <div className="supervisor-stats-empty">
              لا توجد بيانات إحصائية للخطط المقبولة.
            </div>
          ) : (
            <div className="sup-stats-table-wrap">
              <table className="sup-stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المشرف</th>
                    <th>الفئة</th>
                    <th>الفترات</th>
                    <th>خطة 0</th>
                    <th>التعيينات</th>
                    <th>الخطط</th>
                  </tr>
                </thead>

                <tbody>
                  {mergedSupervisorStats.map((supervisor, index) => {
                    const id = supervisor.supervisor_id;
                    const periods = Number(supervisor.grand_periods || 0);
                    const initial = Number(supervisor.initial_count || 0);
                    const percent = statsSummary.max
                      ? Math.round((periods / statsSummary.max) * 100)
                      : 0;

                    const isEditingInitial = editingInitialId === String(id);

                    const isSavingInitial = savingInitialId === String(id);

                    return (
                      <tr className="sup-row" key={id}>
                        <td>
                          <span
                            className={`sup-rank rank-${index < 3 ? index + 1 : "n"}`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="sup-name-btn no-print"
                            onClick={() => openSupervisorReport(id)}
                            title="عرض تقرير المشرف"
                          >
                            <span className="sup-avatar">
                              {String(supervisor.supervisor_name || "?").charAt(
                                0,
                              )}
                            </span>

                            <span className="sup-name">
                              {supervisor.supervisor_name}
                            </span>

                            <span className="sup-chevron">{Icons.arrow}</span>
                          </button>

                          {/* نص عادي للطباعة بدل الزر */}
                          <span className="print-only sup-print-name">
                            {supervisor.supervisor_name}
                          </span>
                        </td>

                        {/* الفئة */}
                        <td>
                          <span className="sup-category">
                            {supervisor.category}
                          </span>
                        </td>

                        <td>
                          <div className="sup-progress-cell">
                            <span className="stats-period-count">
                              {periods}
                            </span>

                            <div className="sup-progress">
                              <div
                                className="sup-progress-fill"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* ✅ خطة 0 — الرصيد الابتدائي (قابل للتعديل) */}
                        <td
                          className={
                            isSavingInitial ? "sup-initial-saving" : ""
                          }
                        >
                          {/* نص عادي للطباعة بدل الزر */}
                          <span className="print-only sup-print-name">
                            {initial}
                          </span>

                          {isEditingInitial ? (
                            <input
                              className="sup-initial-input no-print"
                              type="number"
                              min="0"
                              step="1"
                              autoFocus
                              value={editingInitialValue}
                              onChange={(e) =>
                                setEditingInitialValue(e.target.value)
                              }
                              onBlur={() => saveInitialEdit(supervisor)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }

                                if (e.key === "Escape") {
                                  cancelInitialEdit();
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="sup-initial-badge no-print"
                              onClick={() => startInitialEdit(supervisor)}
                              title="تعديل الرصيد الابتدائي (خطة 0)"
                            >
                              {initial}
                            </button>
                          )}
                        </td>

                        <td>{Number(supervisor.grand_assignments || 0)}</td>

                        <td>
                          <span className="sup-plans-count">
                            {Number(supervisor.accepted_plans || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================
              التعيينات حسب الفئة
          ================================================= */}

          {categoryStats.length > 0 && (
            <div className="sup-category-block">
              <h3>التعيينات حسب الفئة</h3>

              <table className="sup-stats-table sup-category-table">
                <thead>
                  <tr>
                    <th>الفئة</th>
                    <th>عدد المشرفين</th>
                    <th>الفترات</th>
                    <th>التعيينات</th>
                  </tr>
                </thead>

                <tbody>
                  {categoryStats.map((item) => (
                    <tr key={item.category}>
                      <td>
                        <strong>{item.category}</strong>
                      </td>
                      <td>{item.supervisors}</td>
                      <td>{item.periods}</td>
                      <td>{item.assignments}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td>الإجمالي</td>
                    <td>{categoryTotals.supervisors}</td>
                    <td>{categoryTotals.periods}</td>
                    <td>{categoryTotals.assignments}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="sup-initial-note">
            خطة 0 = رصيد ابتدائي (من جدول المتطلبات السابق) يُضاف إلى الفترات
            والتعيينات معًا. اضغطي على الرقم لتعديله.
          </p>
        </section>
        {/* =================================================
            Statistics
        ================================================= */}

        <section className="plans-stat-grid">
          <div className="plan-stat-card">
            <div className="plan-stat-icon blue">{Icons.assignments}</div>

            <div>
              <span>إجمالي الخطط المقبولة</span>

              <strong>{totalPlans}</strong>
            </div>
          </div>

          <div className="plan-stat-card">
            <div className="plan-stat-icon green">{Icons.calendar}</div>

            <div>
              <span>الخطط المقبولة</span>

              <strong>{acceptedPlans.length}</strong>
            </div>
          </div>

          <div className="plan-stat-card">
            <div className="plan-stat-icon orange">{Icons.refresh}</div>

            <div>
              <span>الخطط المعروضة</span>

              <strong>{filteredPlans.length}</strong>
            </div>
          </div>
        </section>

        {/* =================================================
            Toolbar
        ================================================= */}

        <section className="plans-toolbar">
          <div className="plans-search">
            <span className="search-icon">{Icons.search}</span>

            <input
              type="text"
              placeholder="ابحث باسم الخطة أو رقمها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="plans-filters">
            <button
              className="refresh-button"
              onClick={() => loadPlans(true)}
              disabled={refreshing}
              title="تحديث"
            >
              <span className={refreshing ? "refresh-spinning" : ""}>
                {Icons.refresh}
              </span>
            </button>
          </div>
        </section>

        {/* =================================================
            Content
        ================================================= */}

        <section className="plans-table-card">
          {/* =================================================
              Loading
          ================================================= */}

          {loading && (
            <div className="plans-loading">
              <div className="loading-spinner" />

              <span>جاري تحميل الخطط المقبولة...</span>
            </div>
          )}

          {/* =================================================
              Error
          ================================================= */}

          {!loading && error && (
            <div className="plans-error">
              <div className="error-symbol">!</div>

              <div>
                <strong>حدث خطأ أثناء تحميل الخطط</strong>

                <span>{error}</span>
              </div>

              <button onClick={() => loadPlans()}>إعادة المحاولة</button>
            </div>
          )}

          {/* =================================================
              Empty
          ================================================= */}

          {!loading && !error && filteredPlans.length === 0 && (
            <div className="plans-empty">
              <div className="empty-icon">📋</div>

              <h2>
                {acceptedPlans.length === 0
                  ? "لا توجد خطط مقبولة حتى الآن"
                  : "لا توجد نتائج مطابقة"}
              </h2>

              <p>
                {acceptedPlans.length === 0
                  ? "عند قبول أي خطة ستظهر هنا."
                  : "جربي تغيير كلمة البحث."}
              </p>

              {acceptedPlans.length === 0 && (
                <button onClick={() => navigate("/")}>إنشاء خطة جديدة</button>
              )}
            </div>
          )}

          {/* =================================================
              Table
          ================================================= */}

          {!loading && !error && filteredPlans.length > 0 && (
            <div className="plans-table-wrapper">
              <table className="plans-table">
                <thead>
                  <tr>
                    <th>الخطة</th>

                    <th>المشرفون</th>

                    <th>التعيينات</th>

                    <th>الحالة</th>

                    <th>تاريخ الإنشاء</th>

                    <th>الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPlans.map((plan) => {
                    const status = getStatus(plan);

                    const counts = planSupervisorCounts.get(String(plan.id));

                    const supervisorCount =
                      counts?.supervisors ?? Number(plan.supervisor_count || 0);

                    const assignmentCount =
                      counts?.assignments ??
                      Number(
                        plan.assignment_count ??
                          plan.assignments_count ??
                          plan.assignmentCount ??
                          0,
                      );

                    const isDeleting =
                      Number(deletingPlanId) === Number(plan.id);

                    const planNumber =
                      planNumbers.get(String(plan.id)) ?? plan.id;

                    return (
                      <tr key={plan.id}>
                        {/* Plan */}

                        <td>
                          <div className="plan-name-cell">
                            <div className="plan-mini-icon">
                              {Icons.assignments}
                            </div>

                            <div>
                              <strong>خطة {planNumber}</strong>

                              <span className="plan-name-date">
                                {formatDateRange(plan.date_from, plan.date_to)}
                              </span>

                              <span className="plan-name-weekday">
                                {formatWeekdayRange(
                                  plan.date_from,
                                  plan.date_to,
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Supervisors */}

                        <td>
                          <div className="number-cell">
                            <span className="number-icon">{Icons.users}</span>

                            <strong>{supervisorCount}</strong>

                            <span>مشرف</span>
                          </div>
                        </td>

                        {/* Assignments */}

                        <td>
                          <div className="assignment-count">
                            {assignmentCount}
                          </div>
                        </td>

                        {/* Status */}

                        <td>
                          <span className={`plan-status ${status.className}`}>
                            <i />

                            {status.label}
                          </span>
                        </td>

                        {/* Created */}

                        <td>
                          <span className="created-date">
                            {formatDate(plan.created_at)}
                          </span>
                        </td>

                        {/* Actions */}

                        <td>
                          <div className="plan-actions">
                            <button
                              className="action-view"
                              onClick={() => openPlan(plan.id)}
                              title="فتح الخطة"
                            >
                              {Icons.users}

                              <span>تعديل</span>
                            </button>

                            <button
                              className="action-delete"
                              onClick={() => handleDeletePlan(plan.id)}
                              disabled={isDeleting}
                              title="حذف الخطة"
                            >
                              {Icons.trash}

                              <span>
                                {isDeleting ? "جاري الحذف..." : "حذف"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =================================================
            Footer
        ================================================= */}

        {!loading && !error && filteredPlans.length > 0 && (
          <div className="plans-footer">
            <span>
              عرض {filteredPlans.length} من {acceptedPlans.length} خطة مقبولة
            </span>

            <span>LectureFlow</span>
          </div>
        )}
      </main>
    </div>
  );
}