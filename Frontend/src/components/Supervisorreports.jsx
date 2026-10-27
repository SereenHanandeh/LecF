import React, { useEffect, useMemo, useState } from "react";

import { getAssignmentsReport } from "../api.js";

import "../assets/SupervisorReports.css";

// =====================================================
// Helpers
// =====================================================

const Icons = {
  print: (
    <svg viewBox="0 0 24 24">
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
    </svg>
  ),
};

function toArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function toISODate(value) {
  if (!value) return "";

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function formatDay(iso, withYear = true) {
  if (!iso) return "-";

  const d = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    ...(withYear ? { year: "numeric" } : {}),
    month: "short",
    day: "numeric",
  }).format(d);
}

function shortTime(value) {
  if (!value) return "";

  // 08:00:00 -> 08:00
  const m = String(value).match(/^(\d{1,2}):(\d{2})/);

  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : String(value);
}

function timeRange(from, to) {
  const a = shortTime(from);
  const b = shortTime(to);

  if (a && b) return `${a} — ${b}`;

  return a || b || "";
}

// "1" -> "الفترة 1" ، أما النص الجاهز فيُعرض كما هو
function periodTitle(label) {
  const text = String(label ?? "").trim();

  if (!text) return "—";

  return /^\d+$/.test(text) ? `الفترة ${text}` : text;
}

function periodBadge(label, index) {
  const m = String(label ?? "").match(/\d+/);

  return m ? m[0] : String(index + 1);
}

function initial(name) {
  return String(name || "?").trim().charAt(0) || "?";
}

function normalizeRow(r) {
  return {
    plan_id: r.plan_id ?? r.planId ?? null,
    date: toISODate(
      r.date ?? r.assignment_date ?? r.assignmentDate ?? r.day ?? null,
    ),
    period: String(
      r.period_label ?? r.periodLabel ?? r.period ?? r.period_number ?? "",
    ).trim(),
    time_from: r.time_from ?? r.timeFrom ?? "",
    time_to: r.time_to ?? r.timeTo ?? "",
    supervisor_id: r.supervisor_id ?? r.supervisorId ?? null,
    supervisor_name:
      r.supervisor_name ?? r.supervisorName ?? r.name ?? "غير معروف",
    status: r.plan_status ?? r.status ?? "accepted",
  };
}

function supKey(r) {
  return String(r.supervisor_id ?? r.supervisor_name);
}

function Empty({ icon = "📋", title, text }) {
  return (
    <div className="sr-empty">
      <div className="sr-empty-icon">{icon}</div>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}

// =====================================================
// Component — mode: "day" | "period"
// =====================================================

export default function SupervisorReports({ mode }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [day, setDay] = useState("");

  const [period, setPeriod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await getAssignmentsReport();

      setRows(
        toArray(res)
          .map(normalizeRow)
          .filter((r) => r.status === "accepted" && r.date && r.period),
      );
    } catch (err) {
      console.error("🔴 ERROR LOADING ASSIGNMENTS REPORT:", err);

      setError(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          err?.message ??
          "تعذر تحميل بيانات التقارير.",
      );

      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const dates = useMemo(
    () => [...new Set(rows.map((r) => r.date))].sort(),
    [rows],
  );

  // الفترات مرتبة حسب وقت البداية ثم الاسم
  const periods = useMemo(() => {
    const map = new Map();

    rows.forEach((r) => {
      const current = map.get(r.period);

      if (!current) {
        map.set(r.period, {
          label: r.period,
          from: r.time_from,
          to: r.time_to,
        });
      }
    });

    return [...map.values()].sort(
      (a, b) =>
        String(a.from).localeCompare(String(b.from)) ||
        String(a.label).localeCompare(String(b.label), "ar", { numeric: true }),
    );
  }, [rows]);

  useEffect(() => {
    if (!day && dates.length) setDay(dates[dates.length - 1]);
  }, [dates, day]);

  useEffect(() => {
    if (periods.length && !periods.some((p) => p.label === period)) {
      setPeriod(periods[0].label);
    }
  }, [periods, period]);

  // ---------- تقرير اليوم ----------

  const dayGroups = useMemo(() => {
    const byPeriod = new Map();

    rows
      .filter((r) => r.date === day)
      .forEach((r) => {
        const group = byPeriod.get(r.period) ?? {
          label: r.period,
          from: r.time_from,
          to: r.time_to,
          sups: new Map(),
        };

        // نفس المشرف في نفس الفترة يُحسب مرة واحدة
        if (!group.sups.has(supKey(r))) {
          group.sups.set(supKey(r), r.supervisor_name);
        }

        byPeriod.set(r.period, group);
      });

    return [...byPeriod.values()]
      .sort(
        (a, b) =>
          String(a.from).localeCompare(String(b.from)) ||
          String(a.label).localeCompare(String(b.label), "ar", {
            numeric: true,
          }),
      )
      .map((g) => ({
        ...g,
        names: [...g.sups.values()].sort((a, b) =>
          String(a).localeCompare(String(b), "ar"),
        ),
      }));
  }, [rows, day]);

  const dayTotals = useMemo(() => {
    const unique = new Set();

    rows
      .filter((r) => r.date === day)
      .forEach((r) => unique.add(supKey(r)));

    return {
      supervisors: unique.size,
      periods: dayGroups.length,
      shifts: dayGroups.reduce((sum, g) => sum + g.names.length, 0),
    };
  }, [rows, day, dayGroups]);

  // ---------- تقرير الفترة ----------

  const periodRows = useMemo(() => {
    const map = new Map();

    rows
      .filter(
        (r) =>
          r.period === period &&
          (!dateFrom || r.date >= dateFrom) &&
          (!dateTo || r.date <= dateTo),
      )
      .forEach((r) => {
        const key = supKey(r);

        const current = map.get(key) ?? {
          name: r.supervisor_name,
          days: new Set(),
        };

        current.days.add(r.date);
        map.set(key, current);
      });

    return [...map.values()]
      .map((v) => ({ name: v.name, days: [...v.days].sort() }))
      .sort(
        (a, b) =>
          b.days.length - a.days.length ||
          String(a.name).localeCompare(String(b.name), "ar"),
      );
  }, [rows, period, dateFrom, dateTo]);

  const currentPeriod = periods.find((p) => p.label === period);

  const periodTotalDays = useMemo(
    () => new Set(periodRows.flatMap((r) => r.days)).size,
    [periodRows],
  );

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="sr-state">
        <div className="loading-spinner" />
        <span>جاري تحميل بيانات التقارير...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sr-state error">
        <strong>حدث خطأ أثناء تحميل التقارير</strong>
        <span>{error}</span>
        <button className="sr-btn" onClick={load}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Empty
        icon="🗓️"
        title="لا توجد تعيينات بعد"
        text="ستظهر التقارير هنا بعد قبول خطة واحدة على الأقل."
      />
    );
  }

  // ===================== تقرير يوم محدد =====================

  if (mode === "day") {
    return (
      <div>
        <div className="sr-print-title">
          <h2>تقرير المشرفين — {formatDay(day)}</h2>
          <span>LectureFlow</span>
        </div>

        <div className="sr-toolbar">
          <label className="sr-field">
            اختاري اليوم
            <input
              type="date"
              value={day}
              min={dates[0]}
              max={dates[dates.length - 1]}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>

          <div className="sr-spacer" />

          <button
            type="button"
            className="sr-btn primary"
            onClick={() => window.print()}
          >
            {Icons.print}
            طباعة التقرير
          </button>
        </div>

        <div className="sr-summary">
          <div className="sr-summary-item">
            <span>اليوم</span>
            <strong style={{ fontSize: 16 }}>{formatDay(day)}</strong>
          </div>

          <div className="sr-summary-item green">
            <span>المشرفون المداومون</span>
            <strong>{dayTotals.supervisors}</strong>
          </div>

          <div className="sr-summary-item amber">
            <span>عدد الفترات</span>
            <strong>{dayTotals.periods}</strong>
          </div>
        </div>

        {dayGroups.length === 0 ? (
          <Empty
            icon="😴"
            title="لا يوجد مشرفون في هذا اليوم"
            text="جربي اختيار تاريخ آخر."
          />
        ) : (
          <div className="sr-period-grid">
            {dayGroups.map((g, index) => (
              <div className="sr-period-card" key={g.label}>
                <div className="sr-period-head">
                  <div className="sr-period-num">
                    {periodBadge(g.label, index)}
                  </div>

                  <div className="sr-period-title">
                    <strong>{periodTitle(g.label)}</strong>
                    <span>{timeRange(g.from, g.to) || " "}</span>
                  </div>

                  <span className="sr-count-badge">{g.names.length} مشرف</span>
                </div>

                <ul className="sr-sup-list">
                  {g.names.map((name, i) => (
                    <li className="sr-sup-item" key={`${name}-${i}`}>
                      <span className="sr-avatar">{initial(name)}</span>
                      <span className="sr-sup-name">{name}</span>
                      <span className="sr-sup-index">{i + 1}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===================== تقرير حسب الفترة =====================

  return (
    <div>
      <div className="sr-print-title">
        <h2>
          تقرير {periodTitle(period)}
          {currentPeriod && timeRange(currentPeriod.from, currentPeriod.to)
            ? ` (${timeRange(currentPeriod.from, currentPeriod.to)})`
            : ""}
        </h2>
        <span>LectureFlow</span>
      </div>

      <div className="sr-pills">
        {periods.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`sr-pill ${p.label === period ? "active" : ""}`}
            onClick={() => setPeriod(p.label)}
          >
            <strong>{periodTitle(p.label)}</strong>
            <span>{timeRange(p.from, p.to) || " "}</span>
          </button>
        ))}
      </div>

      <div className="sr-toolbar">
        <label className="sr-field">
          من تاريخ
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <label className="sr-field">
          إلى تاريخ
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>

        {(dateFrom || dateTo) && (
          <button
            type="button"
            className="sr-btn"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            مسح التاريخ
          </button>
        )}

        <div className="sr-spacer" />

        <button
          type="button"
          className="sr-btn primary"
          onClick={() => window.print()}
        >
          {Icons.print}
          طباعة التقرير
        </button>
      </div>

      <div className="sr-summary">
        <div className="sr-summary-item">
          <span>الفترة</span>
          <strong style={{ fontSize: 16 }}>{periodTitle(period)}</strong>
        </div>

        <div className="sr-summary-item green">
          <span>المشرفون المداومون</span>
          <strong>{periodRows.length}</strong>
        </div>

        <div className="sr-summary-item amber">
          <span>عدد الأيام</span>
          <strong>{periodTotalDays}</strong>
        </div>
      </div>

      {periodRows.length === 0 ? (
        <Empty
          icon="🔍"
          title="لا يوجد مشرفون في هذه الفترة"
          text="جربي تغيير الفترة أو نطاق التاريخ."
        />
      ) : (
        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>المشرف</th>
                <th style={{ width: 90 }}>الأيام</th>
                <th>تواريخ الدوام</th>
              </tr>
            </thead>

            <tbody>
              {periodRows.map((r, i) => (
                <tr key={`${r.name}-${i}`}>
                  <td>{i + 1}</td>

                  <td>
                    <div className="sr-name-cell">
                      <span className="sr-avatar">{initial(r.name)}</span>
                      {r.name}
                    </div>
                  </td>

                  <td>
                    <span className="sr-days-badge">{r.days.length}</span>
                  </td>

                  <td>
                    <div className="sr-day-chips">
                      {r.days.map((d) => (
                        <span className="sr-day-chip" key={d}>
                          {formatDay(d, false)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}