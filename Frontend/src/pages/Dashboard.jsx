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
import FileUpload from "../components/FileUploader.jsx";
import { useNavigate } from "react-router-dom";

import "./dashboard.css";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getProfessorName(row) {
  return (
    row?.professor_name ??
    row?.professorName ??
    row?.["Professor Name"] ??
    row?.professor ??
    row?.["Professor"] ??
    row?.name ??
    ""
  );
}

function getRowDate(row) {
  return (
    row?.date ??
    row?.Date ??
    row?.["DATE"] ??
    row?.day ??
    row?.["Day"] ??
    null
  );
}

/**
 * مهم جدًا:
 * التاريخ هنا تاريخ تقويمي فقط وليس Timestamp.
 *
 * لا نستخدم:
 *   toISOString()
 *
 * لأن:
 * 2025-11-05 في السعودية
 * قد يصبح:
 * 2025-11-04T21:00:00.000Z
 *
 * وبالتالي يظهر اليوم السابق.
 */
function normalizeDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // إذا كان التاريخ String
  if (typeof value === "string") {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return null;
    }

    // YYYY-MM-DD أو ISO
    const match = cleanValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // بعض الحالات قد تأتي بصيغة DD/MM/YYYY
    const slashMatch = cleanValue.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (slashMatch) {
      const day = String(slashMatch[1]).padStart(2, "0");
      const month = String(slashMatch[2]).padStart(2, "0");
      const year = slashMatch[3];

      return `${year}-${month}-${day}`;
    }

    return null;
  }

  // إذا كان Date object
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    // مهم:
    // نستخدم التاريخ المحلي وليس UTC.
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // إذا كان رقم Excel serial أو رقم آخر، لا نحاول
  // تخمين التاريخ هنا.
  return null;
}

/**
 * عرض التاريخ للمستخدم باللغة العربية
 * بدون أي مشكلة timezone.
 */
function formatArabicDate(dateString) {
  if (!dateString) {
    return "";
  }

  const match = String(dateString).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return dateString;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // نستخدم noon بدل منتصف الليل لتجنب أي مشاكل DST/timezone.
  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizeSupervisorIds(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return [
    ...new Set(
      list
        .map((item) => {
          if (item && typeof item === "object") {
            return Number(item.id);
          }

          return Number(item);
        })
        .filter((id) => Number.isInteger(id))
    ),
  ];
}

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),

  file: (
    <svg viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
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

  target: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),

  link: (
    <svg viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.14 1.14" />
      <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 7 20l1.14-1.14" />
    </svg>
  ),

  eye: (
    <svg viewBox="0 0 24 24">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  calendar: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 9h18" />
    </svg>
  ),

  layers: (
    <svg viewBox="0 0 24 24">
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  ),

  plus: (
    <svg viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),

  trash: (
    <svg viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  ),

  spark: (
    <svg viewBox="0 0 24 24">
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  ),

  check: (
    <svg viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),

  arrow: (
    <svg viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  ),
};

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  // ─────────────────────────────────────────
  // Main state
  // ─────────────────────────────────────────

  const [rows, setRows] = useState([]);
  const [excelBatchId, setExcelBatchId] = useState(null);

  // اليوم الذي سيتم توزيعه
  const [selectedDate, setSelectedDate] = useState("");

  const [selectedSupervisors, setSelectedSupervisors] = useState([]);

  // ─────────────────────────────────────────
  // Professor affinities
  // ─────────────────────────────────────────

  const [selectedProfessors, setSelectedProfessors] = useState([]);
  const [affinitySupervisor, setAffinitySupervisor] = useState("");
  const [affinities, setAffinitiesState] = useState([]);

  // ─────────────────────────────────────────
  // Period quotas
  // ─────────────────────────────────────────

  const [periodQuotaMode, setPeriodQuotaMode] = useState("all");
  const [globalPeriodQuota, setGlobalPeriodQuota] = useState("");
  const [quotaSupervisors, setQuotaSupervisors] = useState([]);
  const [periodQuotas, setPeriodQuotas] = useState({});

  // ─────────────────────────────────────────
  // UI state
  // ─────────────────────────────────────────

  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ─────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────

  const professors = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const name = String(getProfessorName(row) || "").trim();

      if (!name) {
        return;
      }

      const key = name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, name);
      }
    });

    return [...map.values()].sort((a, b) =>
      a.localeCompare(b, "ar")
    );
  }, [rows]);

  // ─────────────────────────────────────────
  // Unique dates
  // ─────────────────────────────────────────

  const uniqueDates = useMemo(() => {
    const dates = new Set();

    rows.forEach((row) => {
      const value = getRowDate(row);
      const date = normalizeDate(value);

      if (date) {
        dates.add(date);
      }
    });

    return [...dates].sort();
  }, [rows]);

  // ─────────────────────────────────────────
  // Selected date statistics
  // ─────────────────────────────────────────

  const selectedDateStats = useMemo(() => {
    if (!selectedDate) {
      return {
        rows: 0,
        professors: 0,
      };
    }

    const selectedRows = rows.filter((row) => {
      const date = normalizeDate(getRowDate(row));

      if (!date) {
        return false;
      }

      return date === selectedDate;
    });

    const professorSet = new Set();

    selectedRows.forEach((row) => {
      const professor = String(
        getProfessorName(row) || ""
      ).trim();

      if (professor) {
        professorSet.add(professor.toLowerCase());
      }
    });

    return {
      rows: selectedRows.length,
      professors: professorSet.size,
    };
  }, [rows, selectedDate]);

  // ─────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────

  const stats = {
    rows: rows.length,
    professors: professors.length,
    supervisors: normalizeSupervisorIds(selectedSupervisors).length,
    dates: uniqueDates.length,
  };

  // ─────────────────────────────────────────
  // Progress
  // ─────────────────────────────────────────

  const progress = useMemo(() => {
    let completed = 0;

    if (rows.length > 0) {
      completed += 1;
    }

    if (selectedDate) {
      completed += 1;
    }

    if (selectedSupervisors.length > 0) {
      completed += 1;
    }

    if (Object.keys(periodQuotas).length > 0) {
      completed += 1;
    }

    if (affinities.length > 0) {
      completed += 1;
    }

    return Math.round((completed / 5) * 100);
  }, [
    rows,
    selectedDate,
    selectedSupervisors,
    periodQuotas,
    affinities,
  ]);

  // ─────────────────────────────────────────
  // Upload
  // ─────────────────────────────────────────

  const handleUploadSuccess = (response) => {
    setErrorMessage("");

    const uploadedRows =
      response?.rows ??
      response?.data?.rows ??
      response?.data ??
      [];

    const batchId =
      response?.excelBatchId ??
      response?.excel_batch_id ??
      response?.batchId ??
      response?.batch_id ??
      response?.data?.excelBatchId ??
      response?.data?.excel_batch_id ??
      response?.data?.batchId ??
      response?.data?.batch_id ??
      null;

    setRows(
      Array.isArray(uploadedRows)
        ? uploadedRows
        : []
    );

    setExcelBatchId(batchId);

    // Reset selected date
    setSelectedDate("");

    // Reset affinities
    setSelectedProfessors([]);
    setAffinitiesState([]);

    // Reset quotas
    setPeriodQuotas({});
    setQuotaSupervisors([]);
    setGlobalPeriodQuota("");

    setUploadMessage(
      Array.isArray(uploadedRows) &&
      uploadedRows.length
        ? `تم تحميل ${uploadedRows.length.toLocaleString()} سجل بنجاح`
        : "تم تحميل الملف بنجاح"
    );
  };

  // ─────────────────────────────────────────
  // Professor affinity
  // ─────────────────────────────────────────

  const toggleProfessor = (name) => {
    setSelectedProfessors((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const addAffinity = () => {
    if (
      !affinitySupervisor ||
      selectedProfessors.length === 0
    ) {
      return;
    }

    const newItems = selectedProfessors
      .filter(
        (professorName) =>
          !affinities.some(
            (item) =>
              item.professorName === professorName &&
              String(item.supervisorId) ===
                String(affinitySupervisor)
          )
      )
      .map((professorName) => ({
        professorName,
        supervisorId: Number(affinitySupervisor),
      }));

    setAffinitiesState((current) => [
      ...current,
      ...newItems,
    ]);

    setSelectedProfessors([]);
    setAffinitySupervisor("");
  };

  const removeAffinity = (
    professorName,
    supervisorId
  ) => {
    setAffinitiesState((current) =>
      current.filter(
        (item) =>
          !(
            item.professorName === professorName &&
            String(item.supervisorId) ===
              String(supervisorId)
          )
      )
    );
  };

  // ─────────────────────────────────────────────
  // Quotas
  // ─────────────────────────────────────────────

  /**
   * وضع "التوزيع للكل"
   *
   * الوضع الطبيعي:
   * لا يوجد quota.
   *
   * الـ backend سيتولى:
   * 1. إعطاء كل مشرف دكتورًا واحدًا أولًا.
   * 2. ثم توزيع باقي الدكاترة بعدالة.
   */
  const switchToAllSupervisors = () => {
    setPeriodQuotaMode("all");
    setQuotaSupervisors([]);
    setPeriodQuotas({});
    setGlobalPeriodQuota("");
    setErrorMessage("");

    console.log("🎯 MODE: NORMAL DISTRIBUTION");
  };

  /**
   * وضع "تحديد عدد الفترات"
   */
  const switchToSpecificSupervisors = () => {
    setPeriodQuotaMode("specific");
    setQuotaSupervisors([]);
    setPeriodQuotas({});
    setErrorMessage("");

    console.log("🎯 MODE: PERIOD QUOTA");
  };

  /**
   * إنشاء quotas من قائمة مشرفين + قيمة واحدة.
   */
  const buildQuotaPayload = (
    supervisorIds,
    value
  ) => {
    const numericValue = Number(value);

    if (
      !Number.isInteger(numericValue) ||
      numericValue <= 0
    ) {
      return {};
    }

    const payload = {};

    normalizeSupervisorIds(supervisorIds).forEach(
      (supervisorId) => {
        payload[supervisorId] = numericValue;
      }
    );

    return payload;
  };

  /**
   * تطبيق عدد الفترات على جميع المشرفين.
   */
  const applyGlobalQuota = () => {
    if (selectedSupervisors.length === 0) {
      setErrorMessage(
        "اختاري المشرفين المناوبين أولًا."
      );
      return;
    }

    const next = buildQuotaPayload(
      selectedSupervisors,
      globalPeriodQuota
    );

    if (Object.keys(next).length === 0) {
      setErrorMessage(
        "أدخلي عدد فترات صحيح أكبر من صفر."
      );
      return;
    }

    setPeriodQuotas(next);
    setErrorMessage("");

    console.log(
      "🎯 GLOBAL PERIOD QUOTAS CREATED:",
      next
    );
  };

  /**
   * تطبيق عدد الفترات على مشرفين محددين.
   */
  const applySelectedQuota = () => {
    if (quotaSupervisors.length === 0) {
      setErrorMessage(
        "اختاري مشرفًا واحدًا على الأقل."
      );
      return;
    }

    const next = buildQuotaPayload(
      quotaSupervisors,
      globalPeriodQuota
    );

    if (Object.keys(next).length === 0) {
      setErrorMessage(
        "أدخلي عدد فترات صحيح أكبر من صفر."
      );
      return;
    }

    setPeriodQuotas((current) => ({
      ...current,
      ...next,
    }));

    setErrorMessage("");

    console.log(
      "🎯 SELECTED PERIOD QUOTAS CREATED:",
      next
    );
  };

  /**
   * حذف quota لمشرف واحد.
   */
  const removeQuota = (id) => {
    setPeriodQuotas((current) => {
      const next = {
        ...current,
      };

      delete next[Number(id)];

      console.log(
        "🗑️ QUOTA REMOVED:",
        id,
        next
      );

      return next;
    });
  };

  // ─────────────────────────────────────────
  // Generate
  // ─────────────────────────────────────────

  const handleGeneratePlan = async () => {
    setErrorMessage("");

    if (!rows.length) {
      setErrorMessage(
        "يرجى رفع ملف المحاضرات أولًا."
      );
      return;
    }

    if (!excelBatchId) {
      setErrorMessage(
        "تعذر تحديد رقم دفعة الملف."
      );
      return;
    }

    if (!selectedDate) {
      setErrorMessage(
        "يرجى اختيار اليوم الذي تريد توزيعه."
      );
      return;
    }

    if (!selectedSupervisors.length) {
      setErrorMessage(
        "يرجى اختيار المشرفين المناوبين."
      );
      return;
    }

    if (!uniqueDates.length) {
      setErrorMessage(
        "لم يتم العثور على تواريخ صالحة في الملف."
      );
      return;
    }

    // تأكد أن اليوم المختار موجود فعليًا في الملف
    if (!uniqueDates.includes(selectedDate)) {
      setErrorMessage(
        "اليوم المحدد غير موجود في ملف المحاضرات."
      );
      return;
    }

    // تأكد أن اليوم يحتوي على محاضرات
    if (selectedDateStats.rows === 0) {
      setErrorMessage(
        "لا توجد محاضرات في اليوم المحدد."
      );
      return;
    }

    try {
      setIsGenerating(true);

      // Convert selected supervisors to IDs
      const supervisorIds =
        normalizeSupervisorIds(
          selectedSupervisors
        );

      if (
        supervisorIds.some(
          (id) => !Number.isInteger(id)
        )
      ) {
        throw new Error(
          "يوجد مشرف غير صالح ضمن المشرفين المختارين."
        );
      }

      console.log(
        "👥 SELECTED SUPERVISOR IDS:",
        supervisorIds
      );

      // ─────────────────────────────
      // IMPORTANT:
      // Only the selected date will be included.
      // ─────────────────────────────

      const dateFrom = selectedDate;
      const dateTo = selectedDate;

      console.log(
        "📅 SELECTED DISTRIBUTION DATE:",
        selectedDate
      );

      console.log(
        "📅 PLAN DATE RANGE:",
        {
          dateFrom,
          dateTo,
        }
      );

      // ─────────────────────────────
      // DATE DEBUG
      // ─────────────────────────────

      console.log(
        "========== DATE DEBUG =========="
      );

      console.log(
        "Selected date:",
        selectedDate
      );

      console.log(
        "Rows matching selected date:",
        rows.filter(
          (row) =>
            normalizeDate(
              getRowDate(row)
            ) === selectedDate
        ).length
      );

      console.log(
        "First 10 row dates:",
        rows.slice(0, 10).map((row) => ({
          raw: getRowDate(row),
          normalized: normalizeDate(
            getRowDate(row)
          ),
        }))
      );

      console.log(
        "================================"
      );

      // ─────────────────────────────
      // 1. Create plan
      // ─────────────────────────────

      const plan = await createPlan({
        name: `Plan ${Date.now()}`,
        excelBatchId,
        dateFrom,
        dateTo,
      });

      console.log(
        "CREATE PLAN RESPONSE:",
        plan
      );

      const planId = plan?.data?.id;

      if (!planId) {
        throw new Error(
          "تعذر إنشاء الخطة."
        );
      }

      // ─────────────────────────────
      // 2. Save duty pool
      // ─────────────────────────────

      await setDutyPool(
        planId,
        supervisorIds
      );

      console.log(
        "👥 DUTY POOL SAVED:",
        supervisorIds
      );

      // ─────────────────────────────
      // 3. Distribution mode
      // ─────────────────────────────

      const quotaPayload = {
        ...periodQuotas,
      };

      console.log(
        "🎯 PERIOD QUOTA PAYLOAD:",
        quotaPayload
      );

      console.log(
        "🎯 QUOTA COUNT:",
        Object.keys(
          quotaPayload
        ).length
      );

      console.log(
        "🎯 DISTRIBUTION MODE:",
        periodQuotaMode
      );

      if (
        periodQuotaMode ===
          "specific" &&
        Object.keys(
          quotaPayload
        ).length === 0
      ) {
        throw new Error(
          "اختر المشرفين وحدد عدد الفترات ثم اضغط «تطبيق الهدف» قبل إنشاء الخطة."
        );
      }

      // ─────────────────────────────
      // 4. Save period quotas
      // ─────────────────────────────

      const quotaResponse =
        await savePeriodQuotas(
          planId,
          quotaPayload
        );

      console.log(
        "🎯 PERIOD QUOTAS SAVE RESPONSE:",
        quotaResponse
      );

      // ─────────────────────────────
      // 5. Save professor affinities
      // ─────────────────────────────

      if (affinities.length > 0) {
        const affinityPayload =
          affinities.map((item) => ({
            professorName:
              item.professorName,
            supervisorId: Number(
              item.supervisorId
            ),
          }));

        await setAffinities(
          planId,
          affinityPayload
        );

        console.log(
          "🔗 AFFINITIES SAVED:",
          affinityPayload
        );
      }

      // ─────────────────────────────
      // 6. Generate plan
      // ─────────────────────────────

      console.log(
        "🚀 GENERATING PLAN:",
        {
          planId,
          selectedDate,
          dateFrom,
          dateTo,
          selectedSupervisors,
          supervisorIds,
          periodQuotas:
            quotaPayload,
          quotaMode:
            periodQuotaMode,
        }
      );

      const generated =
        await generatePlan(
          planId,
          1
        );

      console.log(
        "✅ GENERATED PLAN:",
        generated
      );

      // ─────────────────────────────
      // 7. Navigate to result
      // ─────────────────────────────

      navigate(
        `/plan-result/${planId}`,
        {
          state: {
            planId,
            generated,
            rows,
            selectedDate,
            periodQuotas:
              quotaPayload,
            affinities,
          },
        }
      );
    } catch (error) {
      console.error(
        "❌ Generate plan error:",
        error
      );

      setErrorMessage(
        error?.response?.data?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "حدث خطأ أثناء إنشاء الخطة."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div
      className="dashboard-page"
      dir="rtl"
    >
      {/* Header */}

      <header className="app-header">
        <div className="header-brand">
          <div className="brand-mark">
            {Icons.layers}
          </div>

          <div>
            <div className="brand-name">
              LectureFlow
            </div>

            <div className="brand-caption">
              نظام إدارة وتوزيع المحاضرات
            </div>
          </div>
        </div>

        <div className="header-status">
          <span className="status-dot" />
          جاهز لإنشاء خطة
        </div>
      </header>

      {/* Main */}

      <main className="dashboard-container">

        {/* Intro */}

        <section className="welcome-section">
          <div className="welcome-copy">
            <div className="page-kicker">
              <span className="kicker-line" />
              إنشاء خطة جديدة
            </div>

            <h1>
              وزّع المحاضرات
              <br />
              <strong>
                بذكاء وعدالة.
              </strong>
            </h1>

            <p>
              ارفع ملف المحاضرات، حدد اليوم
              والمشرفين، ثم دع النظام يبني لك
              خطة توزيع متوازنة وقابلة للتعديل.
            </p>
          </div>

          <div className="progress-card">
            <div className="progress-top">
              <span>
                جاهزية الخطة
              </span>

              <strong>
                {progress}%
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-value"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className="progress-caption">
              {progress === 100
                ? "كل الإعدادات الأساسية مكتملة"
                : "أكمل الإعدادات لإنشاء الخطة"}
            </div>
          </div>
        </section>

        {/* Stats */}

        <section className="metrics-grid">

          <div className="metric-card">
            <div className="metric-icon">
              {Icons.file}
            </div>

            <div className="metric-content">
              <span>السجلات</span>

              <strong>
                {stats.rows.toLocaleString()}
              </strong>

              <small>
                جلسة في الملف
              </small>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              {Icons.users}
            </div>

            <div className="metric-content">
              <span>المشرفون</span>

              <strong>
                {stats.supervisors}
              </strong>

              <small>
                مشرف محدد
              </small>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              {Icons.calendar}
            </div>

            <div className="metric-content">
              <span>الأيام</span>

              <strong>
                {stats.dates}
              </strong>

              <small>
                يوم في الملف
              </small>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              {Icons.link}
            </div>

            <div className="metric-content">
              <span>الأساتذة</span>

              <strong>
                {stats.professors}
              </strong>

              <small>
                أستاذ في الملف
              </small>
            </div>
          </div>

        </section>

        {/* Alerts */}

        {errorMessage && (
          <div className="modern-alert error">
            <div className="alert-symbol">
              !
            </div>

            <div>
              <strong>
                تعذر إكمال العملية
              </strong>

              <span>
                {errorMessage}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setErrorMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {uploadMessage && (
          <div className="modern-alert success">
            <div className="alert-symbol">
              {Icons.check}
            </div>

            <div>
              <strong>
                تم تحميل الملف
              </strong>

              <span>
                {uploadMessage}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setUploadMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* Step 01 - Excel */}

        <section className="workspace-card">
          <div className="section-heading">

            <div className="section-number">
              01
            </div>

            <div className="section-heading-text">
              <div className="section-label">
                مصدر البيانات
              </div>

              <h2>
                ملف المحاضرات
              </h2>

              <p>
                ارفع ملف Excel الذي يحتوي على
                المحاضرات والجلسات المطلوب توزيعها.
              </p>
            </div>

            {rows.length > 0 && (
              <div className="completed-badge">
                {Icons.check}
                مكتمل
              </div>
            )}

          </div>

          <div className="section-body">
            <FileUpload
              onUploaded={handleUploadSuccess}
            />
          </div>
        </section>

        {/* Step 02 - Distribution Date */}

        <section className="workspace-card">

          <div className="section-heading">

            <div className="section-number">
              02
            </div>

            <div className="section-heading-text">

              <div className="section-label">
                نطاق التوزيع
              </div>

              <h2>
                اختر يوم التوزيع
              </h2>

              <p>
                حدد اليوم الذي تريد إنشاء خطة
                التوزيع له. سيتم توزيع محاضرات
                هذا اليوم فقط.
              </p>

            </div>

            {selectedDate && (
              <div className="completed-badge">
                {Icons.check}
                تم اختيار اليوم
              </div>
            )}

          </div>

          <div className="section-body">

            {uniqueDates.length === 0 ? (

              <div className="empty-preview">

                <div className="empty-preview-icon">
                  {Icons.calendar}
                </div>

                <h3>
                  ارفع ملف المحاضرات أولًا
                </h3>

                <p>
                  ستظهر هنا الأيام الموجودة
                  في ملف Excel.
                </p>

              </div>

            ) : (

              <>
                <div className="field-title">
                  اليوم المطلوب توزيعه
                </div>

                <div className="date-selection-wrapper">

                  <select
                    className="modern-select date-select"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(
                        e.target.value
                      );

                      setErrorMessage("");
                    }}
                  >

                    <option value="">
                      اختر اليوم...
                    </option>

                    {uniqueDates.map(
                      (date) => (
                        <option
                          key={date}
                          value={date}
                        >
                          {formatArabicDate(
                            date
                          )}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {selectedDate && (

                  <div className="selected-date-summary">

                    <div className="selected-date-icon">
                      {Icons.calendar}
                    </div>

                    <div className="selected-date-info">

                      <span>
                        سيتم توزيع محاضرات
                      </span>

                      <strong>
                        {formatArabicDate(
                          selectedDate
                        )}
                      </strong>

                    </div>

                    <div className="selected-date-stats">

                      <div>
                        <strong>
                          {selectedDateStats.rows.toLocaleString()}
                        </strong>

                        <span>
                          محاضرة
                        </span>
                      </div>

                      <div>
                        <strong>
                          {selectedDateStats.professors.toLocaleString()}
                        </strong>

                        <span>
                          أستاذ
                        </span>
                      </div>

                    </div>

                  </div>
                )}

                <div className="helper-note">

                  <span className="helper-icon">
                    i
                  </span>

                  <span>
                    سيتم إنشاء الخطة لليوم المحدد
                    فقط، ولن يتم توزيع محاضرات
                    الأيام الأخرى.
                  </span>

                </div>
              </>
            )}

          </div>
        </section>

        {/* Step 03 - Supervisors */}

        <section className="workspace-card">

          <div className="section-heading">

            <div className="section-number">
              03
            </div>

            <div className="section-heading-text">

              <div className="section-label">
                جدول المناوبة
              </div>

              <h2>
                اختر المشرفين
              </h2>

              <p>
                حدد المشرفين الذين سيكونون
                متاحين خلال يوم التوزيع المحدد.
              </p>

            </div>

            {normalizeSupervisorIds(
              selectedSupervisors
            ).length > 0 && (

              <div className="selection-count">

                {
                  normalizeSupervisorIds(
                    selectedSupervisors
                  ).length
                }

                <span>
                  مشرف
                </span>

              </div>
            )}

          </div>

          <div className="section-body">

            <SupervisorSelector
              selected={selectedSupervisors}
              setSelected={
                setSelectedSupervisors
              }
            />

            <div className="helper-note">

              <span className="helper-icon">
                i
              </span>

              <span>
                سيستخدم النظام المشرفين المحددين
                لبناء التوزيع الخاص باليوم
                المختار فقط.
              </span>

            </div>

          </div>
        </section>

        {/* Step 04 - Quotas */}

        <section className="workspace-card">

          <div className="section-heading">

            <div className="section-number">
              04
            </div>

            <div className="section-heading-text">

              <div className="section-label">
                قواعد التوزيع
              </div>

              <h2>
                أهداف الحمل
              </h2>

              <p>
                اختر طريقة توزيع الحمل أو حدد
                عدد الفترات المستهدف لكل مشرف.
              </p>

            </div>

            {Object.keys(
              periodQuotas
            ).length > 0 && (

              <div className="completed-badge">
                {Icons.check}
                مضبوط
              </div>
            )}

          </div>

          <div className="section-body">

            {/* Quota mode */}

            <div className="quota-mode-tabs">

              <button
                type="button"
                className={
                  periodQuotaMode === "all"
                    ? "quota-tab active"
                    : "quota-tab"
                }
                onClick={
                  switchToAllSupervisors
                }
              >

                <span className="tab-icon">
                  {Icons.users}
                </span>

                التوزيع للكل

              </button>

              <button
                type="button"
                className={
                  periodQuotaMode ===
                  "specific"
                    ? "quota-tab active"
                    : "quota-tab"
                }
                onClick={
                  switchToSpecificSupervisors
                }
              >

                <span className="tab-icon">
                  {Icons.target}
                </span>

                تحديد عدد الفترات

              </button>

            </div>

            {/* Specific supervisors */}

            {periodQuotaMode ===
              "specific" && (

              <div className="quota-specific-panel">

                <div className="field-title">
                  اختر المشرفين
                </div>

                <SupervisorSelector
                  selected={
                    quotaSupervisors
                  }
                  setSelected={
                    setQuotaSupervisors
                  }
                />

              </div>
            )}

            {/* Quota input */}

            <div className="quota-action-row">

              <div className="number-field">

                <label>
                  عدد الفترات المستهدف
                </label>

                <div className="number-input-wrap">

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      globalPeriodQuota
                    }
                    onChange={(e) =>
                      setGlobalPeriodQuota(
                        e.target.value
                      )
                    }
                    placeholder="مثال: 3"
                  />

                  <span>
                    فترة
                  </span>

                </div>

              </div>

              <button
                type="button"
                className="secondary-action"
                onClick={
                  periodQuotaMode === "all"
                    ? applyGlobalQuota
                    : applySelectedQuota
                }
              >

                <span>
                  {Icons.plus}
                </span>

                تطبيق الهدف

              </button>

            </div>

            {/* Explanation */}

            <div className="helper-note">

              <span className="helper-icon">
                i
              </span>

              <span>
                في وضع "التوزيع للكل" سيتم توزيع
                دكتور واحد لكل مشرف أولًا. أما
                عند تحديد عدد الفترات، فيمكن للمشرف
                استلام أكثر من دكتور للوصول إلى
                الهدف المحدد.
              </span>

            </div>

            {/* Applied quotas */}

            {Object.keys(
              periodQuotas
            ).length > 0 && (

              <div className="quota-results">

                <div className="result-header">

                  <div>

                    <strong>
                      الأهداف المحددة
                    </strong>

                    <span>
                      يمكن تعديلها أو حذفها لاحقًا
                    </span>

                  </div>

                  <span className="result-count">
                    {
                      Object.keys(
                        periodQuotas
                      ).length
                    }
                  </span>

                </div>

                <div className="quota-list">

                  {Object.entries(
                    periodQuotas
                  ).map(
                    ([id, value]) => (

                      <div
                        className="quota-row"
                        key={id}
                      >

                        <div className="person-mini">
                          <span>
                            {String(id).slice(-2)}
                          </span>
                        </div>

                        <div className="quota-person-info">

                          <strong>
                            مشرف #{id}
                          </strong>

                          <small>
                            الهدف للفترة
                          </small>

                        </div>

                        <div className="quota-number">

                          {value}

                          <span>
                            فترة
                          </span>

                        </div>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            removeQuota(id)
                          }
                          aria-label="حذف"
                        >
                          {Icons.trash}
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

          </div>
        </section>

        {/* Step 05 - Affinities */}

        <section className="workspace-card">

          <div className="section-heading">

            <div className="section-number">
              05
            </div>

            <div className="section-heading-text">

              <div className="section-label">
                تفضيلات التوزيع
              </div>

              <h2>
                ربط الأستاذ بالمشرف
              </h2>

              <p>
                يمكنك تفضيل مشرف معين لأستاذ أو
                أكثر، وسيأخذ النظام ذلك بعين
                الاعتبار.
              </p>

            </div>

            {affinities.length > 0 && (

              <div className="selection-count">

                {affinities.length}

                <span>
                  ربط
                </span>

              </div>
            )}

          </div>

          <div className="section-body">

            <div className="affinity-builder">

              <div className="professor-selector-area">

                <div className="field-title">
                  1. اختر الأستاذ أو الأساتذة
                </div>

                <div className="professor-list">

                  {professors.length === 0 ? (

                    <div className="empty-professors">

                      <div className="empty-icon">
                        {Icons.file}
                      </div>

                      <span>
                        ارفع ملف المحاضرات أولًا
                      </span>

                    </div>

                  ) : (

                    professors.map(
                      (professor) => {

                        const active =
                          selectedProfessors.includes(
                            professor
                          );

                        return (

                          <button
                            type="button"
                            key={professor}
                            className={
                              active
                                ? "professor-chip selected"
                                : "professor-chip"
                            }
                            onClick={() =>
                              toggleProfessor(
                                professor
                              )
                            }
                          >

                            <span className="professor-check">
                              {active
                                ? Icons.check
                                : null}
                            </span>

                            <span>
                              {professor}
                            </span>

                          </button>
                        );
                      }
                    )
                  )}

                </div>
              </div>

              <div className="connection-arrow">
                {Icons.arrow}
              </div>

              <div className="supervisor-link-area">

                <div className="field-title">
                  2. اختر المشرف المفضل
                </div>

                <select
                  className="modern-select"
                  value={affinitySupervisor}
                  onChange={(e) =>
                    setAffinitySupervisor(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    اختر المشرف...
                  </option>

                  {normalizeSupervisorIds(
                    selectedSupervisors
                  ).map(
                    (supervisorId) => (

                      <option
                        key={supervisorId}
                        value={supervisorId}
                      >
                        مشرف #{supervisorId}
                      </option>

                    )
                  )}

                </select>

                <button
                  type="button"
                  className="add-affinity-button"
                  onClick={
                    addAffinity
                  }
                  disabled={
                    !affinitySupervisor ||
                    selectedProfessors.length === 0
                  }
                >
                  {Icons.link}
                  إضافة الربط
                </button>

              </div>

            </div>

            {affinities.length > 0 && (

              <div className="affinity-results">

                <div className="result-header">

                  <div>

                    <strong>
                      الروابط المضافة
                    </strong>

                    <span>
                      هذه التفضيلات ستؤخذ أثناء
                      التوزيع
                    </span>

                  </div>

                  <span className="result-count">
                    {affinities.length}
                  </span>

                </div>

                <div className="affinity-list">

                  {affinities.map(
                    (item, index) => (

                      <div
                        className="affinity-row"
                        key={`${item.professorName}-${item.supervisorId}-${index}`}
                      >

                        <div className="affinity-avatar">
                          {item.professorName.charAt(
                            0
                          )}
                        </div>

                        <div className="affinity-professor">

                          <span>
                            الأستاذ
                          </span>

                          <strong>
                            {item.professorName}
                          </strong>

                        </div>

                        <div className="affinity-connector">
                          {Icons.link}
                        </div>

                        <div className="affinity-supervisor">

                          <span>
                            المشرف المفضل
                          </span>

                          <strong>
                            مشرف #{item.supervisorId}
                          </strong>

                        </div>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            removeAffinity(
                              item.professorName,
                              item.supervisorId
                            )
                          }
                        >
                          {Icons.trash}
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

          </div>
        </section>

        {/* Step 06 - Preview */}

        <section className="workspace-card preview-card">

          <div className="section-heading">

            <div className="section-number">
              06
            </div>

            <div className="section-heading-text">

              <div className="section-label">
                مراجعة البيانات
              </div>

              <h2>
                معاينة المحاضرات
              </h2>

              <p>
                راجع البيانات المستوردة قبل إنشاء
                خطة التوزيع.
              </p>

            </div>

            {rows.length > 0 && (

              <div className="preview-total">

                <span>
                  إجمالي السجلات
                </span>

                <strong>
                  {rows.length.toLocaleString()}
                </strong>

              </div>
            )}

          </div>

          <div className="preview-container">

            {rows.length > 0 ? (

              <PreviewTable
                rows={rows}
              />

            ) : (

              <div className="empty-preview">

                <div className="empty-preview-icon">
                  {Icons.eye}
                </div>

                <h3>
                  لا توجد بيانات للمعاينة
                </h3>

                <p>
                  ارفع ملف المحاضرات حتى تظهر
                  البيانات هنا.
                </p>

              </div>
            )}

          </div>

        </section>

        {/* Final Action */}

        <section className="generate-panel">

          <div className="generate-decoration">
            {Icons.spark}
          </div>

          <div className="generate-copy">

            <span className="generate-kicker">
              الخطوة الأخيرة
            </span>

            <h2>
              جاهز لبناء خطة التوزيع؟
            </h2>

            <p>

              سيقوم النظام بتوزيع جلسات

              <strong>
                {selectedDate
                  ? " اليوم المحدد فقط"
                  : " اليوم الذي تختاره"}
              </strong>

              ، مع مراعاة المشرفين والأهداف
              والتفضيلات التي حددتها.

            </p>

          </div>

          <button
            type="button"
            className="generate-button"
            onClick={
              handleGeneratePlan
            }
            disabled={
              isGenerating ||
              !selectedDate
            }
          >

            {isGenerating ? (

              <>
                <span className="button-spinner" />

                جاري إنشاء الخطة...
              </>

            ) : (

              <>
                {Icons.spark}

                إنشاء خطة التوزيع

                {Icons.arrow}
              </>
            )}

          </button>

        </section>

        <footer className="dashboard-footer">

          <span>
            LectureFlow
          </span>

          <span>
            نظام توزيع المحاضرات
          </span>

        </footer>

      </main>
    </div>
  );
}
