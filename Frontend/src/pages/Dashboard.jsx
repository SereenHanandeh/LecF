import React, { useMemo, useState } from "react";
import {
  createPlan,
  setDutyPool,
  setAffinities,
  setPeriodQuotas as savePeriodQuotas,
  generatePlan,
} from "../api.js";

import PreviewTable from "../components/PreviewTable.jsx";
import SupervisorSelector from "../components/SupervisorSelector.jsx";
import FileUploader from "../components/FileUploader.jsx";
import Sidebar from "../components/Sidebar.jsx";

import { useNavigate } from "react-router-dom";
import "./dashboard.css";

/* =========================================================
   Helpers
========================================================= */

const getProfessorName = (row) =>
  String(
    row?.professor_name ??
      row?.professorName ??
      row?.["Professor Name"] ??
      row?.professor ??
      row?.Professor ??
      row?.name ??
      "",
  ).trim();

const getDateValue = (row) =>
  row?.date ?? row?.Date ?? row?.DATE ?? row?.day ?? row?.Day ?? "";

const normalizeDate = (value) => {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();

  if (!text) return "";

  // 2025-01-30
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(
      iso[3],
    ).padStart(2, "0")}`;
  }

  // 30/01/2025
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slash) {
    return `${slash[3]}-${String(slash[2]).padStart(2, "0")}-${String(
      slash[1],
    ).padStart(2, "0")}`;
  }

  // 30-01-2025
  const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (dash) {
    return `${dash[3]}-${String(dash[2]).padStart(2, "0")}-${String(
      dash[1],
    ).padStart(2, "0")}`;
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
};

const formatDate = (date) => {
  if (!date) return "—";

  const normalized = normalizeDate(date);

  if (!normalized) return "—";

  const [year, month, day] = normalized.split("-");

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
};

const normalizeSupervisorIds = (items = []) =>
  items
    .map((item) => Number(item?.id ?? item))
    .filter((id) => Number.isFinite(id));

/* =========================================================
   Icons
========================================================= */

const Icons = {
  upload: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  ),

  calendar: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  ),

  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  file: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  ),

  link: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" />
      <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 7 20l1.15-1.15" />
    </svg>
  ),

  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20H11v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 6.73 15 1.7 1.7 0 0 0 5.2 14H5v-3h.2a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11 5.2V5h3v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 19.8 11H20v3h-.2A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  ),

  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),

  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  ),

  spark: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z" />
    </svg>
  ),

  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  ),

  warning: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  ),

  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
};

/* =========================================================
   Dashboard
========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [excelBatchId, setExcelBatchId] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");

  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [selectedProfessors, setSelectedProfessors] = useState([]);

  const [affinitySupervisor, setAffinitySupervisor] = useState("");
  const [affinities, setAffinitiesState] = useState([]);

  const [periodQuotaMode, setPeriodQuotaMode] = useState("all");
  const [globalPeriodQuota, setGlobalPeriodQuota] = useState("");
  const [quotaSupervisors, setQuotaSupervisors] = useState([]);
  const [periodQuotas, setPeriodQuotas] = useState({});

  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     Derived data
  ========================================================= */

  const normalizedSupervisorIds = useMemo(
    () => normalizeSupervisorIds(selectedSupervisors),
    [selectedSupervisors],
  );

  const professors = useMemo(() => {
    const names = rows.map(getProfessorName).filter(Boolean);

    return [...new Set(names)].sort((a, b) => a.localeCompare(b, "ar"));
  }, [rows]);

  const dates = useMemo(() => {
    const values = rows
      .map((row) => normalizeDate(getDateValue(row)))
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [rows]);

  const selectedDateRows = useMemo(() => {
    if (!selectedDate) return [];

    return rows.filter(
      (row) => normalizeDate(getDateValue(row)) === selectedDate,
    );
  }, [rows, selectedDate]);

  const selectedDateProfessors = useMemo(() => {
    return new Set(selectedDateRows.map(getProfessorName).filter(Boolean)).size;
  }, [selectedDateRows]);

  const invalidRows = useMemo(
    () => rows.filter((row) => row?.__invalid).length,
    [rows],
  );

  const readiness = useMemo(() => {
    let score = 0;

    if (rows.length > 0) score += 25;
    if (selectedDate) score += 20;
    if (selectedSupervisors.length > 0) score += 25;
    if (selectedDateRows.length > 0) score += 15;
    if (invalidRows === 0 && rows.length > 0) score += 15;

    return Math.min(score, 100);
  }, [
    rows.length,
    selectedDate,
    selectedSupervisors.length,
    selectedDateRows.length,
    invalidRows,
  ]);

  const canGenerate =
    rows.length > 0 &&
    selectedDate &&
    normalizedSupervisorIds.length > 0 &&
    selectedDateRows.length > 0 &&
    !isGenerating;

  /* =========================================================
     Upload
  ========================================================= */

  const handleUploaded = (response) => {
    try {
      const data = response?.data ?? response ?? {};

      const uploadedRows =
        data?.rows ?? data?.data?.rows ?? data?.preview ?? data?.data ?? [];

      const batchId =
        data?.excelBatchId ??
        data?.excel_batch_id ??
        data?.batchId ??
        data?.data?.excelBatchId ??
        data?.data?.excel_batch_id ??
        data?.data?.batchId ??
        null;

      const safeRows = Array.isArray(uploadedRows) ? uploadedRows : [];

      setRows(safeRows);
      setExcelBatchId(batchId);

      setSelectedDate("");
      setSelectedProfessors([]);

      setAffinitiesState([]);
      setAffinitySupervisor("");

      setPeriodQuotas({});
      setQuotaSupervisors([]);
      setGlobalPeriodQuota("");

      setUploadMessage(
        safeRows.length
          ? `تم تحميل ${safeRows.length} سجل بنجاح`
          : "تم رفع الملف ولكن لم يتم العثور على سجلات",
      );

      setErrorMessage("");
    } catch (error) {
      console.error(error);

      setRows([]);
      setExcelBatchId(null);

      setUploadMessage("");
      setErrorMessage("حدث خطأ أثناء قراءة بيانات الملف.");
    }
  };

  /* =========================================================
     Edit preview
  ========================================================= */

  const handleEditRow = (index, updatedRow) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...updatedRow,
              __invalid: false,
            }
          : row,
      ),
    );
  };

  /* =========================================================
     Quotas
  ========================================================= */

  const applyPeriodQuota = () => {
    const quota = Number(globalPeriodQuota);

    if (!Number.isFinite(quota) || quota <= 0) {
      setErrorMessage("أدخل رقمًا صحيحًا للحصة.");
      return;
    }

    const targetIds =
      periodQuotaMode === "all"
        ? normalizedSupervisorIds
        : normalizeSupervisorIds(quotaSupervisors);

    if (!targetIds.length) {
      setErrorMessage("اختر مشرفًا واحدًا على الأقل.");
      return;
    }

    const next = { ...periodQuotas };

    targetIds.forEach((id) => {
      next[id] = quota;
    });

    setPeriodQuotas(next);
    setErrorMessage("");
  };

  const removeQuota = (id) => {
    setPeriodQuotas((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  /* =========================================================
     Affinities
  ========================================================= */

  const addAffinity = () => {
    const supervisorId = Number(affinitySupervisor);

    if (!selectedProfessors.length) {
      setErrorMessage("اختر أستاذًا واحدًا على الأقل.");
      return;
    }

    if (!Number.isFinite(supervisorId)) {
      setErrorMessage("اختر المشرف المرتبط بالأستاذ.");
      return;
    }

    const newItems = selectedProfessors.map((professorName) => ({
      professorName,
      supervisorId,
    }));

    setAffinitiesState((current) => {
      const filtered = current.filter(
        (item) => !selectedProfessors.includes(item.professorName),
      );

      return [...filtered, ...newItems];
    });

    setSelectedProfessors([]);
    setAffinitySupervisor("");
    setErrorMessage("");
  };

  const removeAffinity = (professorName) => {
    setAffinitiesState((current) =>
      current.filter((item) => item.professorName !== professorName),
    );
  };

  /* =========================================================
     Generate
  ========================================================= */

  const handleGenerate = async () => {
    if (!canGenerate) return;

    try {
      setIsGenerating(true);
      setErrorMessage("");

      const planName = `Plan ${Date.now()}`;

      const createPayload = {
        name: planName,
        excelBatchId,
        excel_batch_id: excelBatchId,
        dateFrom: selectedDate,
        dateTo: selectedDate,
        date_from: selectedDate,
        date_to: selectedDate,
      };

      const created = await createPlan(createPayload);

      const planId =
        created?.id ??
        created?.planId ??
        created?.plan_id ??
        created?.data?.id ??
        created?.data?.planId ??
        created?.data?.plan_id;

      if (!planId) {
        throw new Error("لم يتم إرجاع رقم الخطة من السيرفر.");
      }

      /* Duty pool */

      await setDutyPool(planId, normalizedSupervisorIds);

      /* Period quotas */

      const quotaPayload = Object.entries(periodQuotas).map(
        ([supervisorId, quota]) => ({
          supervisorId: Number(supervisorId),
          quota: Number(quota),
        }),
      );

      if (quotaPayload.length) {
        await savePeriodQuotas(planId, quotaPayload);
      }

      /* Affinities */

      if (affinities.length) {
        await setAffinities(planId, affinities);
      }

      /* Generate */

      const generated = await generatePlan(planId, 1);

      navigate(`/plan-result/${planId}`, {
        state: {
          planId,
          generated,
          rows,
          selectedDate,
          periodQuotas,
          affinities,
          selectedSupervisors: normalizedSupervisorIds,
        },
      });
    } catch (error) {
      console.error(error);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "حدث خطأ أثناء إنشاء الخطة.";

      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="dashboard-page" dir="rtl">
      <Sidebar />

      {/* ================= Main ================= */}

      <main className="dashboard-main">
        {/* Header */}

        <header className="dashboard-header">
          <div>
            <div className="breadcrumb">
              لوحة التحكم
              <span>/</span>
              إنشاء خطة
            </div>

            <h1>إنشاء خطة توزيع المشرفين</h1>

            <p>جهّز البيانات، حدد المشرفين، ثم أنشئ جدول التوزيع تلقائيًا.</p>
          </div>

          <div className="header-status">
            <span className="status-dot" />
            النظام جاهز
          </div>
        </header>

        {/* Progress */}

        <section className="workflow-progress">
          <div className="progress-info">
            <div>
              <span className="progress-label">جاهزية الخطة</span>

              <strong>{readiness}%</strong>
            </div>

            <span className="progress-note">
              {readiness === 100 ? "كل شيء جاهز" : "أكمل الخطوات المطلوبة"}
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-value"
              style={{ width: `${readiness}%` }}
            />
          </div>
        </section>

        {/* Alerts */}

        {errorMessage && (
          <div className="alert alert-error">
            <span className="alert-icon">{Icons.warning}</span>

            <div>
              <strong>تعذر إكمال العملية</strong>
              <p>{errorMessage}</p>
            </div>

            <button type="button" onClick={() => setErrorMessage("")}>
              ×
            </button>
          </div>
        )}

        {uploadMessage && (
          <div className="alert alert-success">
            <span className="alert-icon">{Icons.check}</span>

            <div>
              <strong>تم رفع الملف</strong>
              <p>{uploadMessage}</p>
            </div>

            <button type="button" onClick={() => setUploadMessage("")}>
              ×
            </button>
          </div>
        )}

        {/* ================= Stats ================= */}

        <section className="stats-strip">
          <div className="stat-item">
            <span className="stat-icon blue">{Icons.file}</span>

            <div>
              <span>السجلات</span>
              <strong>{rows.length}</strong>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon violet">{Icons.calendar}</span>

            <div>
              <span>التواريخ</span>
              <strong>{dates.length}</strong>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon green">{Icons.users}</span>

            <div>
              <span>المشرفون</span>
              <strong>{selectedSupervisors.length}</strong>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon orange">{Icons.users}</span>

            <div>
              <span>الأساتذة</span>
              <strong>{professors.length}</strong>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon red">{Icons.warning}</span>

            <div>
              <span>سجلات تحتاج مراجعة</span>
              <strong>{invalidRows}</strong>
            </div>
          </div>
        </section>

        {/* ================= Workspace ================= */}

        <section className="workspace">
          {/* Main column */}

          <div className="workspace-main">
            {/* Upload */}

            <section className="workspace-section">
              <div className="section-heading">
                <div className="section-number">01</div>

                <div>
                  <h2>مصدر البيانات</h2>
                  <p>ارفع ملف Excel أو استخدم مصدر البيانات المتاح.</p>
                </div>

                {rows.length > 0 && (
                  <span className="section-complete">
                    {Icons.check}
                    مكتمل
                  </span>
                )}
              </div>

              <div className="upload-workspace">
                <FileUploader onUploaded={handleUploaded} />
              </div>
            </section>

            {/* Date */}

            <section className="workspace-section">
              <div className="section-heading">
                <div className="section-number">02</div>

                <div>
                  <h2>يوم الخطة</h2>
                  <p>حدد التاريخ الذي تريد إنشاء جدول المشرفين له.</p>
                </div>

                {selectedDate && (
                  <span className="section-complete">
                    {Icons.check}
                    محدد
                  </span>
                )}
              </div>

              <div className="date-selector">
                <div className="date-select-wrap">
                  <span className="select-icon">{Icons.calendar}</span>

                  <select
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setErrorMessage("");
                    }}
                  >
                    <option value="">اختر تاريخ الخطة</option>

                    {dates.map((date) => (
                      <option key={date} value={date}>
                        {formatDate(date)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDate && (
                  <div className="date-summary">
                    <div>
                      <span>التاريخ</span>
                      <strong>{formatDate(selectedDate)}</strong>
                    </div>

                    <div>
                      <span>السجلات</span>
                      <strong>{selectedDateRows.length}</strong>
                    </div>

                    <div>
                      <span>الأساتذة</span>
                      <strong>{selectedDateProfessors}</strong>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Supervisors */}

            <section className="workspace-section">
              <div className="section-heading">
                <div className="section-number">03</div>

                <div>
                  <h2>المشرفون المناوبون</h2>
                  <p>اختر المشرفين الذين سيكونون ضمن خطة هذا اليوم.</p>
                </div>

                <div className="heading-counter">
                  {selectedSupervisors.length}
                  <span>/</span>
                  متاح
                </div>
              </div>

              <div className="supervisor-workspace">
                <SupervisorSelector
                  selected={selectedSupervisors}
                  setSelected={setSelectedSupervisors}
                />
              </div>
            </section>

            {/* Preview */}

            <section className="workspace-section preview-section">
              <div className="section-heading">
                <div className="section-number">04</div>

                <div>
                  <h2>مراجعة المحاضرات</h2>
                  <p>راجع السجلات الخاصة بالتاريخ المحدد وعدّلها عند الحاجة.</p>
                </div>

                <span className="preview-count">
                  {selectedDateRows.length} سجل
                </span>
              </div>

              <div className="preview-workspace">
                <PreviewTable
                  rows={rows}
                  selectedDate={selectedDate}
                  onEdit={handleEditRow}
                />
              </div>
            </section>
          </div>

          {/* Side configuration */}

          <aside className="workspace-side">
            {/* Quick status */}

            <div className="side-panel readiness-panel">
              <div className="side-panel-head">
                <div>
                  <span>حالة الإعداد</span>
                  <h3>الخطة الحالية</h3>
                </div>

                <div className="readiness-circle">
                  {readiness}
                  <small>%</small>
                </div>
              </div>

              <div className="check-list">
                <div className={rows.length ? "done" : ""}>
                  <span>{rows.length ? Icons.check : "1"}</span>
                  تحميل البيانات
                </div>

                <div className={selectedDate ? "done" : ""}>
                  <span>{selectedDate ? Icons.check : "2"}</span>
                  اختيار التاريخ
                </div>

                <div className={selectedSupervisors.length ? "done" : ""}>
                  <span>{selectedSupervisors.length ? Icons.check : "3"}</span>
                  اختيار المشرفين
                </div>

                <div className={selectedDateRows.length ? "done" : ""}>
                  <span>{selectedDateRows.length ? Icons.check : "4"}</span>
                  مراجعة البيانات
                </div>
              </div>
            </div>

            {/* Quotas */}

            <div className="side-panel">
              <div className="side-panel-title">
                <div className="mini-icon violet">{Icons.settings}</div>

                <div>
                  <h3>حصة الفترات</h3>
                  <p>تحكم إضافي في توزيع الفترات.</p>
                </div>
              </div>

              <div className="quota-tabs">
                <button
                  type="button"
                  className={periodQuotaMode === "all" ? "active" : ""}
                  onClick={() => setPeriodQuotaMode("all")}
                >
                  الكل
                </button>

                <button
                  type="button"
                  className={periodQuotaMode === "specific" ? "active" : ""}
                  onClick={() => setPeriodQuotaMode("specific")}
                >
                  محدد
                </button>
              </div>

              <div className="quota-input">
                <input
                  type="number"
                  min="1"
                  placeholder="عدد الفترات"
                  value={globalPeriodQuota}
                  onChange={(e) => setGlobalPeriodQuota(e.target.value)}
                />

                <button type="button" onClick={applyPeriodQuota}>
                  تطبيق
                </button>
              </div>

              {periodQuotaMode === "specific" && (
                <div className="quota-supervisors">
                  <SupervisorSelector
                    selected={quotaSupervisors}
                    setSelected={setQuotaSupervisors}
                  />
                </div>
              )}

              {Object.keys(periodQuotas).length > 0 && (
                <div className="quota-list">
                  {Object.entries(periodQuotas).map(([id, quota]) => (
                    <div className="quota-row" key={id}>
                      <span>مشرف #{id}</span>

                      <strong>{quota}</strong>

                      <button type="button" onClick={() => removeQuota(id)}>
                        {Icons.trash}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Affinity */}

            <div className="side-panel">
              <div className="side-panel-title">
                <div className="mini-icon blue">{Icons.link}</div>

                <div>
                  <h3>ربط الأستاذ</h3>
                  <p>اجعل أستاذًا مرتبطًا بمشرف محدد.</p>
                </div>
              </div>

              <select
                className="side-select"
                value={affinitySupervisor}
                onChange={(e) => setAffinitySupervisor(e.target.value)}
              >
                <option value="">اختر المشرف</option>

                {normalizedSupervisorIds.map((id) => (
                  <option key={id} value={id}>
                    مشرف #{id}
                  </option>
                ))}
              </select>

              <div className="professor-select">
                <select
                  multiple
                  value={selectedProfessors}
                  onChange={(e) => {
                    const values = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    );

                    setSelectedProfessors(values);
                  }}
                >
                  {professors.map((professor) => (
                    <option key={professor} value={professor}>
                      {professor}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="secondary-action"
                onClick={addAffinity}
              >
                إضافة الربط
              </button>

              {affinities.length > 0 && (
                <div className="affinity-list">
                  {affinities.map((item) => (
                    <div
                      className="affinity-row"
                      key={`${item.professorName}-${item.supervisorId}`}
                    >
                      <div>
                        <strong>{item.professorName}</strong>

                        <span>← مشرف #{item.supervisorId}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAffinity(item.professorName)}
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>

        {/* ================= Bottom action ================= */}

        <section className="generate-bar">
          <div className="generate-info">
            <div className="generate-icon">{Icons.spark}</div>

            <div>
              <strong>جاهز لإنشاء الخطة؟</strong>

              <p>سيتم توزيع المشرفين حسب البيانات والقواعد المحددة.</p>
            </div>
          </div>

          <button
            type="button"
            className="generate-button"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <span className="spinner" />
                جارٍ إنشاء الخطة...
              </>
            ) : (
              <>
                إنشاء الخطة
                <span className="button-arrow">{Icons.arrow}</span>
              </>
            )}
          </button>
        </section>
      </main>
    </div>
  );
}
