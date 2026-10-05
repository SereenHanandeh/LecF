import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Sidebar from "../components/Sidebar.jsx";
import { getPlans, getAcceptedSupervisorStats } from "../api.js";

import "../assets/SupervisorReport.css";

// =====================================================
// Helpers
// =====================================================

const toArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.plans)) return res.plans;
  return [];
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateRange(from, to) {
  if (!from || !to) return "-";

  return `${formatDate(from)} — ${formatDate(to)}`;
}

function formatWeekday(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ar-SA", { weekday: "long" }).format(date);
}

function formatWeekdayRange(from, to) {
  const a = formatWeekday(from);
  const b = formatWeekday(to);

  if (!a && !b) return "-";

  return a === b ? a : `${a} — ${b}`;
}

// عدد الأيام (شاملًا اليوم الأول والأخير)
function countDays(from, to) {
  const a = new Date(from);
  const b = new Date(to);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "-";

  return Math.round((b - a) / 86400000) + 1;
}

// =====================================================
// Page
// =====================================================

export default function SupervisorReport() {
  const navigate = useNavigate();
  const { supervisorId } = useParams();

  const [stats, setStats] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [statsRes, plansRes] = await Promise.allSettled([
          getAcceptedSupervisorStats(),
          getPlans(),
        ]);

        if (cancelled) return;

        if (statsRes.status === "rejected") {
          throw statsRes.reason;
        }

        setStats(toArray(statsRes.value));

        // getPlans فقط لترقيم الخطط (خطة 1، خطة 2 ...)، وفشله لا يمنع التقرير
        setPlans(
          plansRes.status === "fulfilled" ? toArray(plansRes.value) : [],
        );
      } catch (err) {
        if (cancelled) return;

        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "تعذر تحميل التقرير.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supervisorId]);

  // نفس ترقيم صفحة الخطط: حسب تاريخ الإنشاء تصاعديًا
  const planNumbers = useMemo(() => {
    const accepted = plans.filter(
      (plan) => (plan.status ?? plan.plan_status ?? "draft") === "accepted",
    );

    const sorted = [...accepted].sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime(),
    );

    const map = new Map();

    sorted.forEach((plan, index) => map.set(String(plan.id), index + 1));

    return map;
  }, [plans]);

  const supervisor = useMemo(
    () =>
      stats.find((item) => String(item.supervisor_id) === String(supervisorId)),
    [stats, supervisorId],
  );

  const rows = useMemo(() => {
    const raw = Array.isArray(supervisor?.plans) ? supervisor.plans : [];

    return raw
      .map((p) => ({
        planId: p.plan_id ?? p.id,
        dateFrom: p.date_from,
        dateTo: p.date_to,
        periods: Number(p.periods ?? 0),
        assignments: Number(p.assignments ?? 0),
      }))
      .sort(
        (a, b) =>
          new Date(a.dateFrom ?? 0).getTime() -
          new Date(b.dateFrom ?? 0).getTime(),
      );
  }, [supervisor]);

  const totals = useMemo(
    () => ({
      plans: rows.length,
      days: rows.reduce(
        (sum, r) => sum + (Number(countDays(r.dateFrom, r.dateTo)) || 0),
        0,
      ),
      periods: rows.reduce((sum, r) => sum + r.periods, 0),
      assignments: rows.reduce((sum, r) => sum + r.assignments, 0),
    }),
    [rows],
  );

  const printedAt = useMemo(() => formatDate(new Date()), []);

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="report-layout" dir="rtl">
      <Sidebar />

      <main className="report-main">
        {/* أزرار الشاشة فقط */}
        <div className="report-toolbar no-print">
          <button
            type="button"
            className="report-btn"
            onClick={() => navigate("/plans")}
          >
            ← رجوع للخطط
          </button>

          <button
            type="button"
            className="report-btn primary"
            onClick={() => window.print()}
            disabled={!supervisor}
          >
            🖨️ طباعة التقرير
          </button>
        </div>

        {loading && <div className="report-state">جاري تحميل التقرير...</div>}

        {!loading && error && <div className="report-state error">{error}</div>}

        {!loading && !error && !supervisor && (
          <div className="report-state">
            لا توجد بيانات لهذا المشرف في الخطط المقبولة.
          </div>
        )}

        {!loading && !error && supervisor && (
          <article className="report-sheet">
            {/* Header */}
            <header className="report-header">
              <div>
                <div className="report-eyebrow">LectureFlow</div>
                <h1>تقرير المشرف</h1>
                <p className="report-name">{supervisor.supervisor_name}</p>
              </div>

              <div className="report-meta">
                <span>تاريخ التقرير</span>
                <strong>{printedAt}</strong>
              </div>
            </header>

            {/* Summary */}
            <section className="report-summary">
              <div className="report-stat">
                <span>إجمالي الأيام</span>
                <strong>{totals.days}</strong>
              </div>

              <div className="report-stat">
                <span>عدد الخطط</span>
                <strong>{totals.plans}</strong>
              </div>

              <div className="report-stat">
                <span>إجمالي الفترات</span>
                <strong>{totals.periods}</strong>
              </div>

              <div className="report-stat">
                <span>إجمالي التعيينات</span>
                <strong>{totals.assignments}</strong>
              </div>
            </section>

            {/* Table */}
            <section>
              <h2 className="report-section-title">الخطط المعيّن لها</h2>

              {rows.length === 0 ? (
                <div className="report-state">لا توجد خطط لعرضها.</div>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الخطة</th>
                      <th>التاريخ</th>
                      <th>الأيام</th>
                      <th>عدد الأيام</th>
                      <th>الفترات</th>
                      <th>التعيينات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.planId}>
                        <td>{index + 1}</td>

                        <td>
                          <strong>
                            خطة{" "}
                            {planNumbers.get(String(row.planId)) ?? row.planId}
                          </strong>
                        </td>

                        <td>{formatDateRange(row.dateFrom, row.dateTo)}</td>

                        <td>{formatWeekdayRange(row.dateFrom, row.dateTo)}</td>

                        <td>{countDays(row.dateFrom, row.dateTo)}</td>

                        <td>{row.periods}</td>

                        <td>{row.assignments}</td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={4}>الإجمالي</td>
                      <td>{totals.days}</td>
                      <td>{totals.periods}</td>
                      <td>{totals.assignments}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </section>

            <footer className="report-footer">
              <span>LectureFlow</span>
              <span>{supervisor.supervisor_name}</span>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}
