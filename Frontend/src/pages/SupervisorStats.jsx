import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar.jsx";
import {
  getSupervisors,
  getAcceptedSupervisorStats,
  getInitialSupervisorStats,
  setInitialSupervisorStat,
} from "../api.js";

import SupervisorReports from "../components/SupervisorReports.jsx";

import "../assets/Plan.css";

const TabIcons = {
  stats: (
    <svg viewBox="0 0 24 24">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  day: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 9h18" />
    </svg>
  ),
  period: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

const TABS = [
  { key: "stats", label: "الإحصائيات" },
  { key: "day", label: "تقرير يوم محدد" },
  { key: "period", label: "تقرير حسب الفترة" },
];

const NO_CATEGORY = "بدون فئة";
const INITIAL_DAYS_THRESHOLD = 5;

const Icons = {
  refresh: (
    <svg viewBox="0 0 24 24">
      <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
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
// Helpers (نفس المستخدمة سابقًا في صفحة الخطط)
// =====================================================

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

function categoriesFromPlans(supervisor) {
  const plans = Array.isArray(supervisor?.plans) ? supervisor.plans : [];
  const byCat = new Map();

  plans.forEach((p) => {
    const cat = categoryText(p.category);
    if (!cat) return;
    byCat.set(cat, (byCat.get(cat) || 0) + Number(p.periods || 0));
  });

  return byCat;
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function countDays(from, to) {
  if (!from || !to) return 0;
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b - a) / 86400000) + 1);
}

function getInitialDays(count) {
  const n = Number(count) || 0;
  if (n <= 0) return 0;
  return n > INITIAL_DAYS_THRESHOLD ? 2 : 1;
}

// =====================================================
// Page
// =====================================================

export default function SupervisorStats() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("stats");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [supervisorStats, setSupervisorStats] = useState([]);
  const [supervisorsList, setSupervisorsList] = useState([]);
  const [initialStats, setInitialStats] = useState([]);

  const [editingInitialId, setEditingInitialId] = useState(null);
  const [editingInitialValue, setEditingInitialValue] = useState("");
  const [savingInitialId, setSavingInitialId] = useState(null);

  const skipInitialSaveRef = useRef(false);

  // ===================================================
  // Load
  // ===================================================

  async function loadData(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const statsResponse = await getAcceptedSupervisorStats();

      let initialResponse = { data: [] };
      try {
        initialResponse = await getInitialSupervisorStats();
      } catch (e) {
        console.error("⚠️ Failed to load initial stats (plan 0):", e);
      }

      let supervisorsResponse = { data: [] };
      try {
        supervisorsResponse = await getSupervisors();
      } catch (e) {
        console.error("⚠️ Failed to load supervisors (categories):", e);
      }

      setSupervisorStats(toArray(statsResponse));
      setInitialStats(toArray(initialResponse));
      setSupervisorsList(toArray(supervisorsResponse));
    } catch (err) {
      console.error("🔴 ERROR LOADING STATS:", err);

      setError(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          err?.message ??
          "تعذر تحميل الإحصائيات.",
      );

      setSupervisorStats([]);
      setInitialStats([]);
      setSupervisorsList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ===================================================
  // Categories
  // ===================================================

  const categoryBySupervisor = useMemo(() => {
    const byId = new Map();
    const byName = new Map();

    supervisorsList.forEach((item) => {
      const category = pickCategory(item);
      if (!category) return;

      const id = item.id ?? item.supervisor_id;
      if (id !== undefined && id !== null) byId.set(String(id), category);

      const name = normalizeName(
        item.name ?? item.supervisor_name ?? item.full_name,
      );
      if (name) byName.set(name, category);
    });

    return { byId, byName };
  }, [supervisorsList]);

  // ===================================================
  // Merged stats
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

        const planCategories = categoriesFromPlans(supervisor);
        const categoryList = [...planCategories.keys()];

        const category =
          categoryList.length > 0
            ? categoryList.join("، ")
            : (pickCategory(supervisor) ??
              categoryBySupervisor.byId.get(String(supervisor.supervisor_id)) ??
              categoryBySupervisor.byName.get(
                normalizeName(supervisor.supervisor_name),
              ) ??
              NO_CATEGORY);

        const planDays = (
          Array.isArray(supervisor.plans) ? supervisor.plans : []
        ).reduce((sum, p) => sum + countDays(p.date_from, p.date_to), 0);

        return {
          ...supervisor,
          category,
          planCategories,
          initial_count: initial,
          grand_periods: Number(supervisor.total_periods || 0) + initial,
          grand_assignments:
            Number(supervisor.total_assignments || 0) + initial,
          grand_days: planDays + getInitialDays(initial),
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
  // Category stats
  // ===================================================

  const categoryStats = useMemo(() => {
    const map = new Map();

    initialStats.forEach((item) => {
      const n = Number(item.initial_count || 0);
      if (!n) return;

      const key = "متطلبات";
      const current = map.get(key) ?? {
        category: key,
        supervisorIds: new Set(),
        periods: 0,
        assignments: 0,
      };

      current.supervisorIds.add(String(item.supervisor_id));
      current.periods += n;
      current.assignments += n;
      map.set(key, current);
    });

    mergedSupervisorStats.forEach((supervisor) => {
      (Array.isArray(supervisor.plans) ? supervisor.plans : []).forEach((p) => {
        const key = categoryText(p.category) || NO_CATEGORY;

        const current = map.get(key) ?? {
          category: key,
          supervisorIds: new Set(),
          periods: 0,
          assignments: 0,
        };

        current.supervisorIds.add(String(supervisor.supervisor_id));
        current.periods += Number(p.periods || 0);
        current.assignments += Number(p.assignments || 0);
        map.set(key, current);
      });
    });

    return [...map.values()]
      .map((c) => ({
        category: c.category,
        supervisorIds: c.supervisorIds,
        supervisors: c.supervisorIds.size,
        periods: c.periods,
        assignments: c.assignments,
      }))
      .sort((a, b) => {
        if (b.assignments !== a.assignments) {
          return b.assignments - a.assignments;
        }
        return String(a.category).localeCompare(String(b.category), "ar");
      });
  }, [initialStats, mergedSupervisorStats]);

  const categoryTotals = useMemo(
    () => ({
      supervisors: new Set(categoryStats.flatMap((c) => [...c.supervisorIds]))
        .size,
      periods: categoryStats.reduce((sum, c) => sum + c.periods, 0),
      assignments: categoryStats.reduce((sum, c) => sum + c.assignments, 0),
    }),
    [categoryStats],
  );

  const printedAt = useMemo(() => formatDate(new Date()), []);

  // ===================================================
  // Initial value edit
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

    if (value === Number(supervisor.initial_count || 0)) return;

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

  function openSupervisorReport(supervisorId) {
    navigate(`/supervisor-report/${supervisorId}`);
  }

  // ===================================================
  // Render
  // ===================================================

  return (
    <div className="plans-layout sr-root" dir="rtl">
      <Sidebar />

      <main className="plans-main">
        <header className="plans-header">
          <div>
            <div className="plans-breadcrumb">
              LectureFlow
              <span>/</span>
              إحصائيات المشرفين
            </div>

            <h1>إحصائيات المشرفين</h1>

            <p>
              إجمالي الفترات والأيام والتعيينات لكل مشرف في الخطط المقبولة.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="تحديث"
          >
            <span className={refreshing ? "refresh-spinning" : ""}>
              {Icons.refresh}
            </span>
          </button>
        </header>

        <div className="sr-tabs no-print">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`sr-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {TabIcons[t.key]}
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "stats" && (
          <section className="sr-panel">
            <SupervisorReports key={tab} mode={tab} />
          </section>
        )}

        {tab === "stats" && loading && (
          <section className="plans-table-card">
            <div className="plans-loading">
              <div className="loading-spinner" />
              <span>جاري تحميل الإحصائيات...</span>
            </div>
          </section>
        )}

        {tab === "stats" && !loading && error && (
          <section className="plans-table-card">
            <div className="plans-error">
              <div className="error-symbol">!</div>
              <div>
                <strong>حدث خطأ أثناء تحميل الإحصائيات</strong>
                <span>{error}</span>
              </div>
              <button onClick={() => loadData()}>إعادة المحاولة</button>
            </div>
          </section>
        )}

        {tab === "stats" && !loading && !error && (
          <section className="sup-stats-card">
            <div className="print-only sup-print-title">
              <h2>تقرير إحصائيات المشرفين — LectureFlow</h2>
              <span>تاريخ الطباعة: {printedAt}</span>
            </div>

            <div className="sup-stats-head">
              <div>
                <h2>إحصائيات المشرفين</h2>
                <p>
                  شاملةً رصيده الابتدائي (خطة 0). اضغط على الاسم لعرض خططه.
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

            {mergedSupervisorStats.length > 0 && (
              <div className="sup-print-bar no-print">
                <button
                  type="button"
                  className="sup-print-btn"
                  onClick={() => window.print()}
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
                      <th>الأيام</th>
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
                                {String(
                                  supervisor.supervisor_name || "?",
                                ).charAt(0)}
                              </span>

                              <span className="sup-name">
                                {supervisor.supervisor_name || "غير معروف"}
                              </span>

                              <span className="sup-chevron">{Icons.arrow}</span>
                            </button>

                            <span className="print-only sup-print-name">
                              {supervisor.supervisor_name || "غير معروف"}
                            </span>
                          </td>

                          <td>
                            <span className="sup-category">
                              {supervisor.planCategories?.size
                                ? [...supervisor.planCategories.entries()]
                                    .map(([cat, n]) => `${cat} (${n})`)
                                    .join("، ")
                                : supervisor.category}
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

                          <td>{Number(supervisor.grand_days || 0)}</td>

                          <td
                            className={
                              isSavingInitial ? "sup-initial-saving" : ""
                            }
                          >
                            <span className="print-only sup-print-initial">
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
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") cancelInitialEdit();
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

            {categoryStats.length > 0 && (
              <div className="sup-category-block">
                <div className="sup-category-head">
                  <h3>التعيينات حسب الفئة</h3>
                  <span>توزيع الفترات على فئات الخطط</span>
                </div>

                <table className="sup-category-table">
                  <thead>
                    <tr>
                      <th>الفئة</th>
                      <th>عدد المشرفين</th>
                      <th>الفترات</th>
                      <th>التعيينات</th>
                      <th className="sup-category-bar">النسبة</th>
                    </tr>
                  </thead>

                  <tbody>
                    {categoryStats.map((item) => {
                      const percent = categoryTotals.periods
                        ? Math.round(
                            (item.periods / categoryTotals.periods) * 100,
                          )
                        : 0;

                      return (
                        <tr key={item.category}>
                          <td>
                            <span
                              className={`sup-cat-badge ${
                                item.category === NO_CATEGORY
                                  ? "no-category"
                                  : ""
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>
                          <td>{item.supervisors}</td>
                          <td>{item.periods}</td>
                          <td>{item.assignments}</td>
                          <td className="sup-category-bar">
                            <div className="sup-cat-progress">
                              <div
                                className="sup-cat-progress-fill"
                                style={{ width: `${percent}%` }}
                              />
                              <span>{percent}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td>الإجمالي</td>
                      <td>{categoryTotals.supervisors}</td>
                      <td>{categoryTotals.periods}</td>
                      <td>{categoryTotals.assignments}</td>
                      <td className="sup-category-bar" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <p className="sup-initial-note">
              خطة 0 = رصيد ابتدائي (من جدول المتطلبات السابق) يُضاف إلى الفترات
              والتعيينات معًا، ويُحسب في الأيام: يوم واحد لـ 5 تعيينات أو أقل،
              ويومان لأكثر من 5. اضغطي على الرقم لتعديله.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}