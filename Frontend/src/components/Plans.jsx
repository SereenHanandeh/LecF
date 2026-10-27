import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar.jsx";
import { getPlans, deletePlan, getAcceptedSupervisorStats } from "../api.js";

import "../assets/Plan.css";

// عدد الخطط التي تظهر افتراضيًا (الأحدث أولًا)
const PLANS_PREVIEW_LIMIT = 10;

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
};

// =====================================================
// Helpers
// =====================================================

const NO_CATEGORY = "بدون فئة";

const dateFilterStyles = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#475569",
  },
  input: {
    padding: "7px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    font: "inherit",
    fontSize: 13,
  },
  btn: {
    padding: "7px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    font: "inherit",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  hint: {
    margin: "8px 4px 0",
    fontSize: 13,
    color: "#64748b",
  },
  moreBar: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    margin: "14px 0 4px",
  },
};

function toArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.plans)) return res.plans;
  return [];
}

function categoryText(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    return categoryText(
      value.name ?? value.name_ar ?? value.label ?? value.title ?? null,
    );
  }

  const text = String(value).trim();

  return text || null;
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

function getPlanStatus(plan) {
  return plan.status ?? plan.plan_status ?? plan.planStatus ?? "draft";
}

function getStatus(plan) {
  const status = getPlanStatus(plan);

  if (status === "accepted") {
    return { label: "مقبولة", className: "status-complete" };
  }

  if (status === "rejected") {
    return { label: "مرفوضة", className: "status-rejected" };
  }

  return { label: "مسودة", className: "status-pending" };
}

function planTime(plan) {
  const t = new Date(plan.created_at ?? 0).getTime();

  return Number.isNaN(t) ? 0 : t;
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

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAllPlans, setShowAllPlans] = useState(false);

  const [deletingPlanId, setDeletingPlanId] = useState(null);

  // يُستخدم فقط لحساب عدد المشرفين/التعيينات لكل خطة
  const [supervisorStats, setSupervisorStats] = useState([]);

  // ===================================================
  // Load Plans
  // ===================================================

  async function loadPlans(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await getPlans();

      let statsResponse = null;

      try {
        statsResponse = await getAcceptedSupervisorStats();
      } catch (statsError) {
        console.error("⚠️ Failed to load supervisor statistics:", statsError);

        statsResponse = { data: [] };
      }

      setPlans(toArray(response));
      setSupervisorStats(toArray(statsResponse));
    } catch (err) {
      console.error("🔴 ERROR LOADING PLANS:", err);

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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  // ===================================================
  // Accepted Plans Only
  // ===================================================

  const acceptedPlans = useMemo(() => {
    return plans.filter((plan) => getPlanStatus(plan) === "accepted");
  }, [plans]);

  // ===================================================
  // Sequential Plan Numbers (خطة 1، خطة 2 ...)
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
  // Filter (بحث + تاريخ) — الأحدث أولًا
  // ===================================================

  const hasFilters = Boolean(search.trim() || dateFrom || dateTo);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return acceptedPlans
      .filter((plan) => {
        const name = String(plan.name || "").toLowerCase();
        const id = String(plan.id || "").toLowerCase();
        const number = String(planNumbers.get(String(plan.id)) ?? "");
        const category = String(
          categoryText(plan.category) || "",
        ).toLowerCase();

        const matchesQuery =
          !query ||
          name.includes(query) ||
          id.includes(query) ||
          number.includes(query) ||
          category.includes(query);

        if (!matchesQuery) return false;

        if (from || to) {
          const created = new Date(plan.created_at ?? 0);

          if (Number.isNaN(created.getTime())) return false;

          if (from && created < from) return false;
          if (to && created > to) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const diff = planTime(b) - planTime(a);

        if (diff !== 0) return diff;

        return Number(b.id) - Number(a.id);
      });
  }, [acceptedPlans, search, dateFrom, dateTo, planNumbers]);

  const visiblePlans = useMemo(() => {
    if (hasFilters || showAllPlans) return filteredPlans;

    return filteredPlans.slice(0, PLANS_PREVIEW_LIMIT);
  }, [filteredPlans, hasFilters, showAllPlans]);

  const hiddenPlansCount = filteredPlans.length - visiblePlans.length;

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
  }

  const totalPlans = acceptedPlans.length;

  // عدد المشرفين/التعيينات لكل خطة
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
  // Open Plan
  // ===================================================

  function openPlan(planId) {
    navigate(`/plan-result/${planId}`);
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

      await deletePlan(planId);

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

      <main className="plans-main">
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
              <span>الخطط المطابقة</span>

              <strong>{filteredPlans.length}</strong>
            </div>
          </div>

          <div className="plan-stat-card">
            <div className="plan-stat-icon orange">{Icons.refresh}</div>

            <div>
              <span>الخطط المعروضة</span>

              <strong>{visiblePlans.length}</strong>
            </div>
          </div>
        </section>

        <section className="plans-toolbar">
          <div className="plans-search">
            <span className="search-icon">{Icons.search}</span>

            <input
              type="text"
              placeholder="ابحث باسم الخطة أو رقمها أو فئتها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="plans-filters" style={dateFilterStyles.wrap}>
            <label style={dateFilterStyles.label}>
              من
              <input
                type="date"
                style={dateFilterStyles.input}
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>

            <label style={dateFilterStyles.label}>
              إلى
              <input
                type="date"
                style={dateFilterStyles.input}
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>

            {(dateFrom || dateTo) && (
              <button
                type="button"
                style={dateFilterStyles.btn}
                onClick={clearDateFilter}
              >
                مسح التاريخ
              </button>
            )}

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

        {!loading && !error && acceptedPlans.length > PLANS_PREVIEW_LIMIT && (
          <p style={dateFilterStyles.hint}>
            {hasFilters
              ? "تظهر كل الخطط المطابقة للبحث أو التاريخ، الأحدث أولًا."
              : showAllPlans
                ? "تظهر كل الخطط، الأحدث أولًا."
                : `تظهر آخر ${PLANS_PREVIEW_LIMIT} خطط. لعرض الأقدم اختار تاريخًا أو اضغط «عرض كل الخطط».`}
          </p>
        )}

        <section className="plans-table-card">
          {loading && (
            <div className="plans-loading">
              <div className="loading-spinner" />

              <span>جاري تحميل الخطط المقبولة...</span>
            </div>
          )}

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
                  : "جربي تغيير كلمة البحث أو نطاق التاريخ."}
              </p>

              {acceptedPlans.length === 0 && (
                <button onClick={() => navigate("/")}>إنشاء خطة جديدة</button>
              )}
            </div>
          )}

          {!loading && !error && visiblePlans.length > 0 && (
            <div className="plans-table-wrapper">
              <table className="plans-table">
                <thead>
                  <tr>
                    <th>الخطة</th>
                    <th>الفئة</th>
                    <th>المشرفون</th>
                    <th>التعيينات</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {visiblePlans.map((plan) => {
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

                    const planCategoryLabel =
                      categoryText(plan.category) || NO_CATEGORY;

                    const isDeleting =
                      Number(deletingPlanId) === Number(plan.id);

                    const planNumber =
                      planNumbers.get(String(plan.id)) ?? plan.id;

                    return (
                      <tr key={plan.id}>
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

                        <td>
                          <span
                            className={`plan-category-badge ${
                              planCategoryLabel === NO_CATEGORY
                                ? "no-category"
                                : ""
                            }`}
                          >
                            {planCategoryLabel}
                          </span>
                        </td>

                        <td>
                          <div className="number-cell">
                            <span className="number-icon">{Icons.users}</span>

                            <strong>{supervisorCount}</strong>

                            <span>مشرف</span>
                          </div>
                        </td>

                        <td>
                          <div className="assignment-count">
                            {assignmentCount}
                          </div>
                        </td>

                        <td>
                          <span className={`plan-status ${status.className}`}>
                            <i />

                            {status.label}
                          </span>
                        </td>

                        <td>
                          <span className="created-date">
                            {formatDate(plan.created_at)}
                          </span>
                        </td>

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

          {!loading && !error && !hasFilters && filteredPlans.length > 0 && (
            <>
              {hiddenPlansCount > 0 && (
                <div style={dateFilterStyles.moreBar}>
                  <button
                    type="button"
                    style={dateFilterStyles.btn}
                    onClick={() => setShowAllPlans(true)}
                  >
                    عرض كل الخطط ({hiddenPlansCount} أخرى)
                  </button>
                </div>
              )}

              {showAllPlans && filteredPlans.length > PLANS_PREVIEW_LIMIT && (
                <div style={dateFilterStyles.moreBar}>
                  <button
                    type="button"
                    style={dateFilterStyles.btn}
                    onClick={() => setShowAllPlans(false)}
                  >
                    عرض آخر {PLANS_PREVIEW_LIMIT} خطط فقط
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {!loading && !error && visiblePlans.length > 0 && (
          <div className="plans-footer">
            <span>
              عرض {visiblePlans.length} من {acceptedPlans.length} خطة مقبولة
            </span>

            <span>LectureFlow</span>
          </div>
        )}
      </main>
    </div>
  );
}