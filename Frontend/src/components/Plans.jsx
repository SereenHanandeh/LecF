import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar.jsx";
import { getPlans, deletePlan, getAcceptedSupervisorStats } from "../api.js";

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
};

// =====================================================
// Helpers
// =====================================================

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

      let receivedPlans = [];

      if (Array.isArray(response)) {
        receivedPlans = response;
      } else if (Array.isArray(response?.data)) {
        receivedPlans = response.data;
      } else if (Array.isArray(response?.plans)) {
        receivedPlans = response.plans;
      }

      let receivedStats = [];

      if (Array.isArray(statsResponse)) {
        receivedStats = statsResponse;
      } else if (Array.isArray(statsResponse?.data)) {
        receivedStats = statsResponse.data;
      }

      console.log("📋 Received plans:", receivedPlans);
      console.log("📊 Received stats:", receivedStats);

      setPlans(receivedPlans);
      setSupervisorStats(receivedStats);
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
  // Filter
  // ===================================================

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return acceptedPlans.filter((plan) => {
      const name = String(plan.name || "").toLowerCase();

      const id = String(plan.id || "").toLowerCase();

      return !query || name.includes(query) || id.includes(query);
    });
  }, [acceptedPlans, search]);

  // ===================================================
  // Stats
  // ===================================================
  const totalPlans = acceptedPlans.length;
  // ===================================================
  // Open Plan
  // ===================================================

  function openPlan(planId) {
    console.log("👁 Opening plan:", planId);

    navigate(`/plan-result/${planId}`);
  }

  // ===================================================
  // Delete Plan
  // ===================================================

const handleDeletePlan = async (planId) => {
  const confirmed = window.confirm(
    "هل أنت متأكد من حذف هذه الخطة؟\n\nلا يمكن التراجع عن عملية الحذف."
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

        <section className="supervisor-total-stats">
          <div className="supervisor-total-header">
            <div>
              <h2>إحصائيات المشرفين</h2>
              <p>
                إجمالي الفترات التي حصل عليها كل مشرف في جميع الخطط المقبولة.
              </p>
            </div>
          </div>

          {supervisorStats.length === 0 ? (
            <div className="supervisor-stats-empty">
              لا توجد بيانات إحصائية للخطط المقبولة.
            </div>
          ) : (
            <div className="supervisor-stats-table-wrapper">
              <table className="supervisor-stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المشرف</th>
                    <th>الفترات</th>
                    <th>التعيينات</th>
                    <th>عدد الخطط</th>
                  </tr>
                </thead>

                <tbody>
                  {supervisorStats.map((supervisor, index) => (
                    <tr key={supervisor.supervisor_id}>
                      <td>{index + 1}</td>

                      <td>
                        <strong>{supervisor.supervisor_name}</strong>
                      </td>

                      <td>
                        <span className="stats-period-count">
                          {Number(supervisor.total_periods || 0)}
                        </span>
                      </td>

                      <td>{Number(supervisor.total_assignments || 0)}</td>

                      <td>{Number(supervisor.accepted_plans || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

                    <th>الفترة</th>

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

                    const supervisorCount = Number(
                      plan.supervisor_count ??
                        plan.supervisors_count ??
                        plan.selected_supervisors ??
                        0,
                    );

                    const assignmentCount = Number(
                      plan.assignment_count ??
                        plan.assignments_count ??
                        plan.assignmentCount ??
                        0,
                    );

                    const isDeleting =
                      Number(deletingPlanId) === Number(plan.id);

                    return (
                      <tr key={plan.id}>
                        {/* Plan */}

                        <td>
                          <div className="plan-name-cell">
                            <div className="plan-mini-icon">
                              {Icons.assignments}
                            </div>

                            <div>
                              <strong>{plan.name || `Plan ${plan.id}`}</strong>

                              <span>#{plan.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}

                        <td>
                          <div className="date-cell">
                            <span className="date-icon">{Icons.calendar}</span>

                            <span>
                              {formatDateRange(plan.date_from, plan.date_to)}
                            </span>
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
                              {Icons.eye}

                              <span>فتح</span>
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
