import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar.jsx";
import { getPlans } from "../api.js";

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

function getStatus(plan) {
  const assignments = Number(
    plan.assignment_count ??
      plan.assignments_count ??
      plan.assignmentCount ??
      0
  );

  if (assignments > 0) {
    return {
      label: "مكتملة",
      className: "status-complete",
    };
  }

  return {
    label: "غير مولدة",
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

  const [statusFilter, setStatusFilter] = useState("all");

  // ===================================================
  // Load Plans
  // ===================================================

  async function loadPlans(showRefresh = false) {
    console.log("====================================");
    console.log("🔵 Loading plans...");
    console.log("====================================");

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      // -------------------------------------------------
      // جلب الخطط
      // -------------------------------------------------

      const response = await getPlans();

      console.log("🟢 getPlans response:");
      console.log(response);

      // -------------------------------------------------
      // Backend عندك يرجع:
      //
      // {
      //   success: true,
      //   message: "...",
      //   data: [...]
      // }
      // -------------------------------------------------

      let receivedPlans = [];

      if (Array.isArray(response)) {
        // احتياط إذا الـ backend رجع Array مباشرة
        receivedPlans = response;
      } else if (Array.isArray(response?.data)) {
        // الشكل الصحيح الحالي
        receivedPlans = response.data;
      } else if (Array.isArray(response?.plans)) {
        // احتياط لو غيرنا شكل الـ API لاحقًا
        receivedPlans = response.plans;
      }

      console.log("📋 Received plans:", receivedPlans);

      setPlans(receivedPlans);
    } catch (err) {
      console.error("====================================");
      console.error("🔴 ERROR LOADING PLANS");
      console.error("====================================");

      console.error("Full error:", err);

      console.error(
        "Response:",
        err?.response
      );

      console.error(
        "Response data:",
        err?.response?.data
      );

      console.error(
        "Status:",
        err?.response?.status
      );

      console.error(
        "Message:",
        err?.message
      );

      // -------------------------------------------------
      // رسالة الخطأ
      // -------------------------------------------------

      let errorMessage =
        "تعذر تحميل الخطط السابقة.";

      if (err?.code === "ECONNABORTED") {
        errorMessage =
          "الخادم لم يستجب خلال الوقت المحدد.";
      } else if (err?.response?.data?.error) {
        errorMessage =
          err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorMessage =
          err.response.data.message;
      } else if (err?.message) {
        errorMessage =
          err.message;
      }

      setError(errorMessage);

      // مهم:
      // حتى لو صار Error لا نبقى على Loading
      setPlans([]);
    } finally {
      console.log("⚪ Finished loading plans");

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
  // Filter
  // ===================================================

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans.filter((plan) => {
      const name = String(
        plan.name || ""
      ).toLowerCase();

      const id = String(
        plan.id || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        id.includes(query);

      const assignments = Number(
        plan.assignment_count ??
          plan.assignments_count ??
          plan.assignmentCount ??
          0
      );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "complete" &&
          assignments > 0) ||
        (statusFilter === "pending" &&
          assignments === 0);

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    plans,
    search,
    statusFilter,
  ]);

  // ===================================================
  // Stats
  // ===================================================

  const totalPlans = plans.length;

  const generatedPlans = plans.filter(
    (plan) =>
      Number(
        plan.assignment_count ??
          plan.assignments_count ??
          plan.assignmentCount ??
          0
      ) > 0
  ).length;

  const pendingPlans =
    totalPlans - generatedPlans;

  // ===================================================
  // Excel
  // ===================================================

  function downloadExcel(planId) {
    const url =
      `${API_BASE_URL}/exports/plan_${planId}.xlsx`;

    console.log(
      "📥 Download Excel:",
      url
    );

    window.open(url, "_blank");
  }

  // ===================================================
  // Open Plan
  // ===================================================

  function openPlan(planId) {
    console.log(
      "👁 Opening plan:",
      planId
    );

    navigate(
      `/plan-result/${planId}`
    );
  }

  // ===================================================
  // Render
  // ===================================================

  return (
    <div
      className="plans-layout"
      dir="rtl"
    >
      {/* =================================================
          Sidebar
      ================================================= */}

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

              الخطط السابقة
            </div>

            <h1>
              الخطط السابقة
            </h1>

            <p>
              عرض وإدارة جميع خطط توزيع
              المشرفين التي تم إنشاؤها.
            </p>

          </div>

          <button
            className="new-plan-button"
            onClick={() =>
              navigate("/")
            }
          >
            <span className="button-icon">
              {Icons.plus}
            </span>

            إنشاء خطة جديدة
          </button>

        </header>

        {/* =================================================
            Statistics
        ================================================= */}

        <section className="plans-stat-grid">

          <div className="plan-stat-card">

            <div className="plan-stat-icon blue">
              {Icons.assignments}
            </div>

            <div>

              <span>
                إجمالي الخطط
              </span>

              <strong>
                {totalPlans}
              </strong>

            </div>

          </div>

          <div className="plan-stat-card">

            <div className="plan-stat-icon green">
              {Icons.calendar}
            </div>

            <div>

              <span>
                خطط مولدة
              </span>

              <strong>
                {generatedPlans}
              </strong>

            </div>

          </div>

          <div className="plan-stat-card">

            <div className="plan-stat-icon orange">
              {Icons.refresh}
            </div>

            <div>

              <span>
                بانتظار التوليد
              </span>

              <strong>
                {pendingPlans}
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            Toolbar
        ================================================= */}

        <section className="plans-toolbar">

          <div className="plans-search">

            <span className="search-icon">
              {Icons.search}
            </span>

            <input
              type="text"
              placeholder="ابحث باسم الخطة أو رقمها..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

          </div>

          <div className="plans-filters">

            <button
              className={
                statusFilter === "all"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setStatusFilter("all")
              }
            >
              الكل
            </button>

            <button
              className={
                statusFilter === "complete"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setStatusFilter(
                  "complete"
                )
              }
            >
              مكتملة
            </button>

            <button
              className={
                statusFilter === "pending"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setStatusFilter(
                  "pending"
                )
              }
            >
              غير مولدة
            </button>

            <button
              className="refresh-button"
              onClick={() =>
                loadPlans(true)
              }
              disabled={refreshing}
              title="تحديث"
            >
              <span
                className={
                  refreshing
                    ? "refresh-spinning"
                    : ""
                }
              >
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

              <span>
                جاري تحميل الخطط...
              </span>

            </div>

          )}

          {/* =================================================
              Error
          ================================================= */}

          {!loading && error && (

            <div className="plans-error">

              <div className="error-symbol">
                !
              </div>

              <div>

                <strong>
                  حدث خطأ أثناء تحميل الخطط
                </strong>

                <span>
                  {error}
                </span>

              </div>

              <button
                onClick={() =>
                  loadPlans()
                }
              >
                إعادة المحاولة
              </button>

            </div>

          )}

          {/* =================================================
              Empty
          ================================================= */}

          {!loading &&
            !error &&
            filteredPlans.length === 0 && (

              <div className="plans-empty">

                <div className="empty-icon">
                  📋
                </div>

                <h2>
                  {plans.length === 0
                    ? "لا توجد خطط حتى الآن"
                    : "لا توجد نتائج مطابقة"}
                </h2>

                <p>
                  {plans.length === 0
                    ? "أنشئي أول خطة توزيع للمشرفين وستظهر هنا."
                    : "جربي تغيير كلمة البحث أو الفلتر."}
                </p>

                {plans.length === 0 && (

                  <button
                    onClick={() =>
                      navigate("/")
                    }
                  >
                    إنشاء أول خطة
                  </button>

                )}

              </div>

            )}

          {/* =================================================
              Table
          ================================================= */}

          {!loading &&
            !error &&
            filteredPlans.length > 0 && (

              <div className="plans-table-wrapper">

                <table className="plans-table">

                  <thead>

                    <tr>

                      <th>
                        الخطة
                      </th>

                      <th>
                        الفترة
                      </th>

                      <th>
                        المشرفون
                      </th>

                      <th>
                        التعيينات
                      </th>

                      <th>
                        الحالة
                      </th>

                      <th>
                        تاريخ الإنشاء
                      </th>

                      <th>
                        الإجراءات
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredPlans.map(
                      (plan) => {

                        const status =
                          getStatus(plan);

                        const supervisorCount =
                          Number(
                            plan.supervisor_count ??
                              plan.supervisors_count ??
                              plan.selected_supervisors ??
                              0
                          );

                        const assignmentCount =
                          Number(
                            plan.assignment_count ??
                              plan.assignments_count ??
                              plan.assignmentCount ??
                              0
                          );

                        return (

                          <tr
                            key={plan.id}
                          >

                            {/* Plan */}

                            <td>

                              <div className="plan-name-cell">

                                <div className="plan-mini-icon">
                                  {Icons.assignments}
                                </div>

                                <div>

                                  <strong>
                                    {plan.name ||
                                      `Plan ${plan.id}`}
                                  </strong>

                                  <span>
                                    #{plan.id}
                                  </span>

                                </div>

                              </div>

                            </td>

                            {/* Date */}

                            <td>

                              <div className="date-cell">

                                <span className="date-icon">
                                  {Icons.calendar}
                                </span>

                                <span>
                                  {formatDateRange(
                                    plan.date_from,
                                    plan.date_to
                                  )}
                                </span>

                              </div>

                            </td>

                            {/* Supervisors */}

                            <td>

                              <div className="number-cell">

                                <span className="number-icon">
                                  {Icons.users}
                                </span>

                                <strong>
                                  {supervisorCount}
                                </strong>

                                <span>
                                  مشرف
                                </span>

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

                              <span
                                className={
                                  `plan-status ${status.className}`
                                }
                              >

                                <i />

                                {status.label}

                              </span>

                            </td>

                            {/* Created */}

                            <td>

                              <span className="created-date">
                                {formatDate(
                                  plan.created_at
                                )}
                              </span>

                            </td>

                            {/* Actions */}

                            <td>

                              <div className="plan-actions">

                                <button
                                  className="action-view"
                                  onClick={() =>
                                    openPlan(
                                      plan.id
                                    )
                                  }
                                  title="فتح الخطة"
                                >

                                  {Icons.eye}

                                  <span>
                                    فتح
                                  </span>

                                </button>

                                <button
                                  className="action-excel"
                                  onClick={() =>
                                    downloadExcel(
                                      plan.id
                                    )
                                  }
                                  disabled={
                                    assignmentCount === 0
                                  }
                                  title="تحميل Excel"
                                >
                                  {Icons.excel}
                                </button>

                              </div>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

        </section>

        {/* =================================================
            Footer
        ================================================= */}

        {!loading &&
          !error &&
          filteredPlans.length > 0 && (

            <div className="plans-footer">

              <span>
                عرض {filteredPlans.length} من{" "}
                {plans.length} خطة
              </span>

              <span>
                LectureFlow
              </span>

            </div>

          )}

      </main>

    </div>
  );
}