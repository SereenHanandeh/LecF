import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import ExcelJS from "exceljs";

import "../assets/planResult.css";

import {
  getPlan,
  listSupervisors,
  moveAssignment,
  updatePlanStatus,
  updateProfessorRoom,
  listRooms,
} from "../api.js";

// =====================================================
// Date Helper
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

const getRoomNumber = (assignment) =>
  assignment.room_number ?? assignment.roomNumber ?? "-";
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

const getPlanDateRange = (data) => {
  const dates = [
    ...new Set(data.map((item) => getDateValue(item.date)).filter(Boolean)),
  ].sort();

  if (!dates.length) return "";

  const toFileFormat = (d) => d.split("-").reverse().join("-"); // YYYY-MM-DD -> DD-MM-YYYY

  const first = toFileFormat(dates[0]);
  const last = toFileFormat(dates[dates.length - 1]);

  return first === last ? first : `${first}_الى_${last}`;
};

const getPhone = (assignment) =>
  assignment.professor_phone ??
  assignment.professorPhone ??
  assignment.phone ??
  "-";
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

// period اختياري: إذا الوقت بدون علامة نستخدم الفترة لتحديد AM/PM
const parseTimeParts = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const match = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?|ص|م)?$/);

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const marker = (match[3] || "").toLowerCase().replace(/\./g, "");

  let meridiem;
  if (marker === "am" || marker === "ص") meridiem = "AM";
  else if (marker === "pm" || marker === "م") meridiem = "PM";
  else meridiem = hour >= 12 ? "PM" : "AM";
  return { hour, minute, meridiem };
};

const formatTime12Hour = (value, period) => {
  if (value === null || value === undefined || value === "") return "-";

  const parts = parseTimeParts(value, period);
  if (!parts) return String(value);

  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;

  return `${String(hour12).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} ${parts.meridiem}`;
};

const timeToMinutes = (value, period) => {
  const parts = parseTimeParts(value, period);
  if (!parts) return Number.MAX_SAFE_INTEGER;

  let hour = parts.hour % 12;
  if (parts.meridiem === "PM") hour += 12;

  return hour * 60 + parts.minute;
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

const getSupervisorId = (assignment) => {
  return (
    assignment?.supervisor_id ??
    assignment?.supervisorId ??
    assignment?.supervisor?.id ??
    assignment?.supervisorId?.id ??
    null
  );
};

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

const getCourseName = (assignment) => {
  const value =
    assignment?.course_name ??
    assignment?.courseName ??
    assignment?.course ??
    assignment?.course_desc ??
    assignment?.["اسم المقرر"] ??
    assignment?.["المادة"];

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  // إذا كانت قيمة الكورس Object
  if (typeof value === "object") {
    return (
      value.name ??
      value.course_name ??
      value.courseName ??
      value.label ??
      value.text ??
      value.description ??
      "-"
    );
  }

  return String(value);
};

const getPeriod = (assignment) =>
  assignment.period_label ?? assignment.period ?? "-";

// =====================================================
// Period Colors (Excel)
// =====================================================

const PERIOD_COLORS = [
  "FFDBEAFE", // أزرق فاتح
  "FFDCFCE7", // أخضر فاتح
  "FFFEF9C3", // أصفر فاتح
  "FFFCE7F3", // وردي فاتح
  "FFEDE9FE", // بنفسجي فاتح
  "FFFFEDD5", // برتقالي فاتح
  "FFCCFBF1", // تركوازي فاتح
  "FFFEE2E2", // أحمر فاتح
];

// =====================================================
// Excel Helpers
// =====================================================

// true  = ترتيب حسب التاريخ ثم From | false = حسب From فقط (ثم التاريخ)
const EXCEL_SORT_DATE_FIRST = false;

// false = شيتات المشرفين قيم عادية قابلة للتعديل
// true  = شيتات المشرفين معادلات مرتبطة بالشيت الرئيسي (السلوك القديم)
const EXCEL_LIVE_SUPERVISOR_SHEETS = false;

const EXCEL_FONT = { name: "Calibri", size: 15, bold: true };
const EXCEL_BORDER_SIDE = { style: "thin", color: { argb: "FF000000" } };
const EXCEL_BORDER = {
  top: EXCEL_BORDER_SIDE,
  bottom: EXCEL_BORDER_SIDE,
  left: EXCEL_BORDER_SIDE,
  right: EXCEL_BORDER_SIDE,
};
const EXCEL_HEADER_HEIGHT = 36;
const EXCEL_ROW_HEIGHT = 32;
const EXCEL_COLUMN_COUNT = 10;

const EXCEL_COLUMNS = [
  { header: "CRN", key: "crn" },
  { header: "Course Name", key: "courseName" },
  { header: "Professor", key: "professor" },
  { header: "Phone", key: "phone" },
  { header: "Studio", key: "room" },
  { header: "Date", key: "date" },
  { header: "Period", key: "period" },
  { header: "From", key: "from" },
  { header: "To", key: "to" },
  { header: "Supervisor", key: "supervisor" },
];

const toExcelRow = (assignment) => ({
  crn: assignment.crn ?? "-",
  courseName: getCourseName(assignment),
  professor: getProfessorName(assignment),
  phone: getPhone(assignment),
  room: getRoomNumber(assignment),
  date: formatDate(assignment.date),
  period: getPeriod(assignment),
  from: formatTime12Hour(getTimeFrom(assignment), getPeriod(assignment)),
  to: formatTime12Hour(getTimeTo(assignment), getPeriod(assignment)),
  supervisor: getSupervisorName(assignment),
});

// ترتيب حسب عمود From تصاعديًا
const sortForExcel = (data) =>
  [...data].sort((a, b) => {
    const dateCompare = getDateValue(a.date).localeCompare(
      getDateValue(b.date),
    );

    if (EXCEL_SORT_DATE_FIRST && dateCompare !== 0) return dateCompare;

    const fromA = timeToMinutes(getTimeFrom(a), getPeriod(a));
    const fromB = timeToMinutes(getTimeFrom(b), getPeriod(b));
    if (fromA !== fromB) return fromA - fromB;

    if (dateCompare !== 0) return dateCompare;

    const toA = timeToMinutes(getTimeTo(a), getPeriod(a));
    const toB = timeToMinutes(getTimeTo(b), getPeriod(b));
    if (toA !== toB) return toA - toB;

    return String(getProfessorName(a)).localeCompare(
      String(getProfessorName(b)),
      "ar",
    );
  });

// عرض كل عمود حسب أطول قيمة فيه (الخط 15 عريض فنضرب في 1.6)
const computeColumnWidths = (columns, rows) =>
  columns.map((col) => {
    const maxLen = rows.reduce(
      (max, row) => Math.max(max, String(row[col.key] ?? "").length),
      String(col.header).length,
    );

    return Math.min(60, Math.max(12, Math.ceil(maxLen * 1.6) + 4));
  });

const withWidths = (widths) =>
  EXCEL_COLUMNS.map((col, i) => ({ ...col, width: widths[i] }));

// ارتفاع الصف حسب عدد الأسطر المتوقعة للنص الطويل
const computeRowHeight = (row, widths) => {
  let maxLines = 1;

  EXCEL_COLUMNS.forEach((col, i) => {
    const len = String(row[col.key] ?? "").length;
    const charsPerLine = Math.max(1, Math.floor((widths[i] - 2) / 1.6));
    maxLines = Math.max(maxLines, Math.ceil(len / charsPerLine));
  });

  return Math.max(EXCEL_ROW_HEIGHT, maxLines * 22);
};

// كل فترة تأخذ لونًا ثابتًا
const buildPeriodColorMap = (data) => {
  const periods = [
    ...new Set(data.map(getPeriod).filter((value) => value && value !== "-")),
  ].sort((a, b) => String(a).localeCompare(String(b), "ar"));

  const map = new Map();

  periods.forEach((period, index) => {
    map.set(period, PERIOD_COLORS[index % PERIOD_COLORS.length]);
  });

  return map;
};

const styleHeaderRow = (worksheet) => {
  const headerRow = worksheet.getRow(1);
  headerRow.height = EXCEL_HEADER_HEIGHT;

  for (let c = 1; c <= EXCEL_COLUMN_COUNT; c++) {
    const cell = headerRow.getCell(c);

    cell.font = { ...EXCEL_FONT, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    cell.border = EXCEL_BORDER;
  }
};

// الخط والمحاذاة والارتفاع لكل الصفوف، والحدود حتى borderLastRow
const styleBodyRows = (
  worksheet,
  { borderLastRow, styleLastRow, heights = [] },
) => {
  for (let r = 2; r <= styleLastRow; r++) {
    const row = worksheet.getRow(r);
    row.height = heights[r - 2] ?? EXCEL_ROW_HEIGHT;

    for (let c = 1; c <= EXCEL_COLUMN_COUNT; c++) {
      const cell = row.getCell(c);

      cell.font = EXCEL_FONT;
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };

      if (r <= borderLastRow) cell.border = EXCEL_BORDER;
    }
  }
};

// تلوين الصف حسب الفترة (يتحدّث تلقائيًا عند تعديل عمود Period)
const addPeriodConditionalFormatting = (worksheet, periodColorMap, lastRow) => {
  const rules = [];
  let priority = 1;

  periodColorMap.forEach((color, period) => {
    rules.push({
      type: "expression",
      priority: priority++,
      formulae: [`$G2="${String(period).replace(/"/g, '""')}"`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          bgColor: { argb: color },
        },
      },
    });
  });

  if (rules.length) {
    worksheet.addConditionalFormatting({
      ref: `A2:J${lastRow}`,
      rules,
    });
  }
};
// =====================================================
// Component
// =====================================================

export default function PlanResult() {
  const location = useLocation();
  const navigate = useNavigate();

  const { planId: routePlanId } = useParams();

  const statePlanId = location.state?.planId;

  const planId = routePlanId || statePlanId;

  // =====================================================
  // State
  // =====================================================

  const [planData, setPlanData] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [affinities, setAffinities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allRooms, setAllRooms] = useState([]);

  const [editingSupervisor, setEditingSupervisor] = useState("");
  const [allSupervisorsList, setAllSupervisorsList] = useState([]);
  const [editingShowAllSupervisors, setEditingShowAllSupervisors] =
    useState(false);

  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [bulkSupervisor, setBulkSupervisor] = useState("");
  const [bulkShowAllSupervisors, setBulkShowAllSupervisors] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // =====================================================
  // Plan Status (Accept / Reject)
  // =====================================================

  const [planStatus, setPlanStatus] = useState("draft");
  const [statusSaving, setStatusSaving] = useState(false);

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

  const [editingRoom, setEditingRoom] = useState("");

  // =====================================================
  // Column Visibility
  //
  // Session Group removed from visible columns.
  // لكنه ما زال موجودًا داخليًا في البيانات لأن Edit/Save يحتاجه.
  // =====================================================

  const [visibleColumns, setVisibleColumns] = useState({
    crn: true,
    courseName: true,
    professor: true,
    phone: true,
    room: true,
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
  const [savingId, setSavingId] = useState(null);

  // =====================================================
  // Mounted Ref
  // =====================================================

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    console.log(
      "🔴 editingSupervisor CHANGED:",
      JSON.stringify(editingSupervisor),
      typeof editingSupervisor,
    );
  }, [editingSupervisor]);

  useEffect(() => {
    listRooms(true) // القاعات النشطة فقط
      .then((list) => setAllRooms(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error("❌ Failed to load rooms:", err);
        setAllRooms([]);
      });
  }, []);

  // =====================================================
  // Load Plan
  // =====================================================

  const fetchPlan = useCallback(
    async ({ silent = false } = {}) => {
      if (!planId) {
        if (isMountedRef.current) {
          setLoading(false);
          setError("لم يتم العثور على رقم الخطة.");
        }

        return;
      }

      try {
        if (!silent && isMountedRef.current) {
          setLoading(true);
        }

        if (isMountedRef.current) {
          setError("");
        }

        console.log("=================================");
        console.log("📥 FETCHING PLAN");
        console.log("📌 planId:", planId);
        console.log("📌 API:", `/plan/${planId}`);
        console.log("📌 silent:", silent);
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

        if (isMountedRef.current) {
          setAffinities(planAffinities);
          setPlanStatus(data.status || "draft");
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

            professor_id:
              assignment.professor_id ??
              assignment.professorId ??
              group.professor_id ??
              group.professorId ??
              null,

            professorId:
              assignment.professor_id ??
              assignment.professorId ??
              group.professor_id ??
              group.professorId ??
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

        if (isMountedRef.current) {
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

        if (Array.isArray(data.dutyPool)) {
          planSupervisors = data.dutyPool;
        }

        if (!planSupervisors.length && Array.isArray(data.duty_pool)) {
          planSupervisors = data.duty_pool;
        }

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

          if (isMountedRef.current) {
            setAllSupervisorsList(allSupervisors);
          }

          // =================================================
          // Convert Duty Pool IDs -> Supervisor Objects
          // =================================================

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
            const id =
              supervisor?.id ??
              supervisor?.supervisor_id ??
              supervisor?.supervisorId;

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
              const id = getSupervisorId(assignment);

              if (id !== null && id !== undefined) {
                usedIds.add(String(id));
              }
            });

            planSupervisors = allSupervisors.filter((sup) =>
              usedIds.has(
                String(sup.id ?? sup.supervisor_id ?? sup.supervisorId),
              ),
            );
          } else {
            planSupervisors = uniqueSupervisors;
          }

          console.log("🎯 PLAN SUPERVISORS ONLY:", planSupervisors);

          if (isMountedRef.current) {
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
            const id = getSupervisorId(assignment);

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

          if (isMountedRef.current) {
            setSupervisors(Array.from(map.values()));
          }
        }

        console.log("✅ PLAN LOADED SUCCESSFULLY");
      } catch (err) {
        console.error("❌ Error fetching plan:", err?.response?.data || err);

        if (isMountedRef.current) {
          setError(
            err?.response?.data?.error ||
              err?.response?.data?.message ||
              err?.message ||
              "Error loading plan",
          );

          if (!silent) {
            setPlanData([]);
            setConflicts([]);
            setSupervisors([]);
          }
        }
      } finally {
        if (isMountedRef.current && !silent) {
          setLoading(false);

          console.log("🏁 PLAN LOADING FINISHED");
        }
      }
    },
    [planId],
  );

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

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
      const name =
        supervisor.name ??
        supervisor.supervisor_name ??
        supervisor.supervisorName;

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
      // Session Group remains searchable internally
      // even though it is no longer displayed.
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

      const fromA = timeToMinutes(getTimeFrom(a), getPeriod(a));
      const fromB = timeToMinutes(getTimeFrom(b), getPeriod(b));

      if (fromA !== fromB) {
        return fromA - fromB;
      }

      const toA = timeToMinutes(getTimeTo(a), getPeriod(a));
      const toB = timeToMinutes(getTimeTo(b), getPeriod(b));
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

  // الصفوف المحددة والظاهرة حاليًا (ما تغيّره هو ما تراه)
  const selectedAssignments = useMemo(
    () =>
      filteredPlanData.filter((assignment) =>
        selectedRowIds.has(String(getSessionGroupId(assignment))),
      ),
    [filteredPlanData, selectedRowIds],
  );

  const allVisibleSelected =
    filteredPlanData.length > 0 &&
    selectedAssignments.length === filteredPlanData.length;

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

  const roomOptions = useMemo(
    () =>
      [...allRooms]
        .sort((a, b) =>
          String(a.room_number).localeCompare(String(b.room_number), "en", {
            numeric: true,
          }),
        )
        .map((r) => ({
          value: String(r.room_number),
          label: r.tag ? `${r.room_number} (${r.tag})` : String(r.room_number),
        })),
    [allRooms],
  );

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
    const sessionGroupId = getSessionGroupId(assignment);

    const currentSupervisorId = getSupervisorId(assignment);

    console.log("=================================");

    console.log("🟢 EDIT CLICK");

    console.log("📦 assignment:", assignment);

    console.log("🟢 sessionGroupId =", sessionGroupId);

    console.log("🟢 currentSupervisorId =", currentSupervisorId);

    if (
      sessionGroupId === null ||
      sessionGroupId === undefined ||
      sessionGroupId === ""
    ) {
      console.error("🔴 sessionGroupId is missing");

      alert("Session Group ID is missing");

      return;
    }

    if (
      currentSupervisorId === null ||
      currentSupervisorId === undefined ||
      currentSupervisorId === ""
    ) {
      console.error("🔴 supervisorId is missing");

      alert("Supervisor ID is missing");

      return;
    }

    const editId = String(sessionGroupId);

    const editSupervisorId = String(currentSupervisorId);

    const currentRoom = getRoomNumber(assignment);
    setEditingRoom(currentRoom === "-" ? "" : String(currentRoom));

    console.log("🟢 SETTING editingId TO:", editId);

    console.log("🟢 SETTING editingSupervisor TO:", editSupervisorId);

    setEditingId(editId);

    setEditingSupervisor(editSupervisorId);

    setEditingShowAllSupervisors(false);
    console.log("=================================");
  };

  // =====================================================
  // Cancel Editing
  // =====================================================

  const cancelEditing = () => {
    console.log("❌ EDIT CANCELLED");

    setEditingId(null);
    setEditingSupervisor("");
    setEditingShowAllSupervisors(false);
    setEditingRoom("");
  };

  // =====================================================
  // Save Assignment
  // =====================================================

  const saveAssignment = async (assignment) => {
    const sessionGroupId = getSessionGroupId(assignment);
    const currentSupervisorId = getSupervisorId(assignment);

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

    const rawSupervisorId = editingSupervisor;

    if (
      rawSupervisorId === undefined ||
      rawSupervisorId === null ||
      rawSupervisorId === "" ||
      rawSupervisorId === "undefined" ||
      rawSupervisorId === "null"
    ) {
      alert("⚠️ Please select a valid supervisor.");
      return;
    }

    const targetSupervisorId = Number(rawSupervisorId);

    if (!Number.isInteger(targetSupervisorId)) {
      alert("⚠️ Please select a valid supervisor.");
      return;
    }

    // ===== Affinity: تنبيه بدل المنع =====
    const affinitySupervisorId = getProfessorAffinitySupervisorId(assignment);

    const supervisorChanged =
      String(currentSupervisorId) !== String(targetSupervisorId);

    const hasAffinityOverride =
      supervisorChanged &&
      affinitySupervisorId !== null &&
      affinitySupervisorId !== undefined &&
      String(targetSupervisorId) !== String(affinitySupervisorId);

    if (hasAffinityOverride) {
      const confirmed = window.confirm(
        `⚠️ الأستاذ "${getProfessorName(assignment)}" مرتبط بمشرف محدد.\nهل تريد فعلًا تغيير المشرف؟`,
      );

      if (!confirmed) {
        setEditingSupervisor(String(currentSupervisorId));
        return;
      }
    }

    // ===== القاعة =====
    const currentRoomRaw = getRoomNumber(assignment);
    const currentRoom = currentRoomRaw === "-" ? "" : String(currentRoomRaw);
    const newRoom = String(editingRoom ?? "").trim();
    const roomChanged = newRoom !== currentRoom;

    if (roomChanged && !newRoom) {
      alert("⚠️ رقم القاعة لا يمكن أن يكون فارغًا.");
      return;
    }

    const professorId = assignment.professor_id ?? assignment.professorId;

    if (roomChanged && (professorId === null || professorId === undefined)) {
      alert("❌ Professor ID is missing.");
      return;
    }

    if (!supervisorChanged && !roomChanged) {
      cancelEditing();
      return;
    }

    // ===== إرسال الطلبات =====
    try {
      setSavingId(sessionGroupId);

      if (supervisorChanged) {
        await moveAssignment(planId, {
          sessionGroupId: Number(sessionGroupId),
          fromSupervisorId: Number(currentSupervisorId),
          toSupervisorId: targetSupervisorId,
          force: hasAffinityOverride,
        });
      }

      if (roomChanged) {
        await updateProfessorRoom(
          planId,
          Number(professorId),
          newRoom,
          getProfessorName(assignment),
        );
      }

      const selectedSupervisor =
        allSupervisorsList.find(
          (s) =>
            String(s?.id ?? s?.supervisor_id ?? s?.supervisorId) ===
            String(targetSupervisorId),
        ) ||
        supervisors.find(
          (s) =>
            String(s?.id ?? s?.supervisor_id ?? s?.supervisorId) ===
            String(targetSupervisorId),
        );

      const newSupervisorName =
        selectedSupervisor?.name ??
        selectedSupervisor?.supervisor_name ??
        selectedSupervisor?.supervisorName ??
        "";

      setPlanData((prev) =>
        prev.map((item) => {
          let updated = item;

          if (
            supervisorChanged &&
            String(getSessionGroupId(item)) === String(sessionGroupId)
          ) {
            updated = {
              ...updated,
              supervisor_id: targetSupervisorId,
              supervisorId: targetSupervisorId,
              supervisor_name: newSupervisorName,
              supervisor: newSupervisorName,
            };
          }

          const itemProfessorId = item.professor_id ?? item.professorId;

          if (roomChanged && String(itemProfessorId) === String(professorId)) {
            updated = {
              ...updated,
              room_number: newRoom,
              roomNumber: newRoom,
            };
          }

          return updated;
        }),
      );

      cancelEditing();
      fetchPlan({ silent: true });
    } catch (err) {
      console.error("❌ Error saving assignment:", err);
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
  // Bulk Selection / Bulk Edit
  // =====================================================

  const toggleRowSelection = (rowId) => {
    const key = String(rowId);

    setSelectedRowIds((prev) => {
      const next = new Set(prev);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);

      filteredPlanData.forEach((assignment) => {
        const key = String(getSessionGroupId(assignment));

        if (allVisibleSelected) next.delete(key);
        else next.add(key);
      });

      return next;
    });
  };

  const clearSelection = () => {
    setSelectedRowIds(new Set());
    setBulkSupervisor("");
    setBulkShowAllSupervisors(false);
  };

  const applyBulkSupervisor = async () => {
    if (!selectedAssignments.length) {
      alert("⚠️ اختر صفًا واحدًا على الأقل.");
      return;
    }

    const targetSupervisorId = Number(bulkSupervisor);

    if (!bulkSupervisor || !Number.isInteger(targetSupervisorId)) {
      alert("⚠️ اختر المشرف الجديد.");
      return;
    }

    const toMove = [];
    const skippedSame = [];
    const affinityOverrides = [];

    selectedAssignments.forEach((assignment) => {
      const current = getSupervisorId(assignment);
      const affinity = getProfessorAffinitySupervisorId(assignment);

      if (String(current) === String(targetSupervisorId)) {
        skippedSame.push(assignment);
        return;
      }

      if (
        affinity !== null &&
        affinity !== undefined &&
        String(affinity) !== String(targetSupervisorId)
      ) {
        affinityOverrides.push(assignment);
      }

      toMove.push(assignment);
    });

    if (!toMove.length) {
      alert("⚠️ لا توجد صفوف قابلة للنقل: كلها عند هذا المشرف أصلًا.");
      return;
    }

    const targetSupervisor =
      allSupervisorsList.find(
        (s) =>
          String(s?.id ?? s?.supervisor_id ?? s?.supervisorId) ===
          String(targetSupervisorId),
      ) ||
      supervisors.find(
        (s) =>
          String(s?.id ?? s?.supervisor_id ?? s?.supervisorId) ===
          String(targetSupervisorId),
      );

    const targetName =
      targetSupervisor?.name ??
      targetSupervisor?.supervisor_name ??
      targetSupervisor?.supervisorName ??
      "";

    let confirmMessage = `سيتم نقل ${toMove.length} صف إلى المشرف "${targetName}".`;

    if (affinityOverrides.length) {
      const names = [
        ...new Set(affinityOverrides.map((a) => getProfessorName(a))),
      ];

      confirmMessage += `\n\n⚠️ ${affinityOverrides.length} صف لأساتذة مرتبطين بمشرف محدد:\n${names.join("، ")}`;
    }

    confirmMessage += "\n\nمتابعة؟";

    if (!window.confirm(confirmMessage)) return;

    setBulkSaving(true);

    const overrideSet = new Set(affinityOverrides);
    const movedIds = new Set();
    const failed = [];

    for (const assignment of toMove) {
      const sessionGroupId = getSessionGroupId(assignment);

      try {
        await moveAssignment(planId, {
          sessionGroupId: Number(sessionGroupId),
          fromSupervisorId: Number(getSupervisorId(assignment)),
          toSupervisorId: targetSupervisorId,
          force: overrideSet.has(assignment),
        });

        movedIds.add(String(sessionGroupId));
      } catch (err) {
        failed.push({
          assignment,
          reason:
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed",
        });
      }
    }

    if (isMountedRef.current) {
      if (movedIds.size) {
        setPlanData((prev) =>
          prev.map((item) =>
            movedIds.has(String(getSessionGroupId(item)))
              ? {
                  ...item,
                  supervisor_id: targetSupervisorId,
                  supervisorId: targetSupervisorId,
                  supervisor_name: targetName,
                  supervisor: targetName,
                }
              : item,
          ),
        );
      }

      setSelectedRowIds(
        new Set(failed.map((f) => String(getSessionGroupId(f.assignment)))),
      );

      if (!failed.length) {
        setBulkSupervisor("");
        setBulkShowAllSupervisors(false);
      }

      setBulkSaving(false);
    }

    fetchPlan({ silent: true });

    const lines = [`✅ تم نقل ${movedIds.size} صف إلى "${targetName}".`];

    if (skippedSame.length) {
      lines.push(`↪️ ${skippedSame.length} صف تم تجاهله (عند نفس المشرف).`);
    }

    if (failed.length) {
      lines.push(`❌ فشل نقل ${failed.length} صف:`);

      failed.slice(0, 5).forEach((f) => {
        lines.push(`• ${getProfessorName(f.assignment)}: ${f.reason}`);
      });

      if (failed.length > 5) lines.push(`... و${failed.length - 5} آخرين`);
    }

    alert(lines.join("\n"));
  };
  // =====================================================
  // Accept / Reject Plan
  // =====================================================

  const changePlanStatus = async (status) => {
    if (!planId) return;

    const labels = {
      accepted: "قبول",
      rejected: "رفض",
    };

    const confirmed = window.confirm(
      `هل أنت متأكد من ${labels[status] || status} هذه الخطة؟`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setStatusSaving(true);

      await updatePlanStatus(planId, status);

      if (isMountedRef.current) {
        setPlanStatus(status);
      }
    } catch (err) {
      console.error("❌ Error updating plan status:", err);

      alert(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "فشل تحديث حالة الخطة.",
      );
    } finally {
      if (isMountedRef.current) {
        setStatusSaving(false);
      }
    }
  };

  // =====================================================
  // Print
  // =====================================================

  const printPlan = () => {
    window.print();
  };

  // =====================================================
  // Download Excel - Current Filtered Data
  // =====================================================

  const downloadExcel = async () => {
    try {
      if (!planData.length) {
        alert("⚠️ لا توجد بيانات لتنزيلها.");
        return;
      }

      const MAIN = "الخطة الكاملة";
      const LISTS = "المشرفون";
      const MAIN_EXTRA_ROWS = 200;
      const SUP_EXTRA_ROWS = 50;
      const LIVE = EXCEL_LIVE_SUPERVISOR_SHEETS;

      const dataToExport = sortForExcel(planData);
      const rowsData = dataToExport.map(toExcelRow);
      console.log(
        "TIMES:",
        JSON.stringify(
          dataToExport.slice(0, 10).map((a) => ({
            from: getTimeFrom(a),
            to: getTimeTo(a),
            period: getPeriod(a),
          })),
          null,
          2,
        ),
      );
      const periodColorMap = buildPeriodColorMap(planData);

      const keys = EXCEL_COLUMNS.map((c) => c.key);
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

      const mainWidths = computeColumnWidths(EXCEL_COLUMNS, rowsData);
      const mainLast = dataToExport.length + 1 + MAIN_EXTRA_ROWS;
      const mainRange = (col) => `'${MAIN}'!$${col}$2:$${col}$${mainLast}`;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Lecture Supervisor System";
      workbook.created = new Date();
      workbook.calcProperties = { fullCalcOnLoad: true };

      // =========================================
      // الشيت الرئيسي
      // =========================================

      const mainSheet = workbook.addWorksheet(MAIN, {
        views: [{ rightToLeft: true }],
      });

      mainSheet.columns = withWidths(mainWidths);
      rowsData.forEach((row) => mainSheet.addRow(row));

      if (LIVE) {
        const counters = new Map();

        for (let r = 2; r <= mainLast; r++) {
          const rowData = rowsData[r - 2];
          const sup = rowData ? String(rowData.supervisor) : "";

          let idx = "";

          if (sup) {
            idx = (counters.get(sup) || 0) + 1;
            counters.set(sup, idx);
          }

          mainSheet.getCell(`K${r}`).value = {
            formula: `IF(J${r}="","",COUNTIF(J$2:J${r},J${r}))`,
            result: idx,
          };

          mainSheet.getCell(`L${r}`).value = {
            formula: `IF(J${r}="","",J${r}&"|"&K${r})`,
            result: sup ? `${sup}|${idx}` : "",
          };
        }

        mainSheet.getColumn(11).hidden = true;
        mainSheet.getColumn(12).hidden = true;
      }

      styleHeaderRow(mainSheet);
      styleBodyRows(mainSheet, {
        borderLastRow: dataToExport.length + 1,
        styleLastRow: mainLast,
        heights: rowsData.map((row) => computeRowHeight(row, mainWidths)),
      });
      addPeriodConditionalFormatting(mainSheet, periodColorMap, mainLast);

      // =========================================
      // تجميع البيانات حسب المشرف (بعد الترتيب)
      // =========================================

      const bySupervisor = new Map();

      dataToExport.forEach((assignment, index) => {
        const name = getSupervisorName(assignment);

        if (!name || name === "-") return;

        if (!bySupervisor.has(name)) bySupervisor.set(name, []);

        bySupervisor.get(name).push({ data: rowsData[index], index });
      });

      const usedSheetNames = new Set([MAIN, LISTS]);

      const sanitizeSheetName = (name) => {
        let clean = String(name)
          .replace(/[:\\/?*[\]]/g, "")
          .trim();

        if (!clean) clean = "مشرف";
        if (clean.length > 31) clean = clean.slice(0, 31);

        let finalName = clean;
        let counter = 2;

        while (usedSheetNames.has(finalName)) {
          const suffix = `_${counter}`;
          finalName = clean.slice(0, 31 - suffix.length) + suffix;
          counter++;
        }

        usedSheetNames.add(finalName);
        return finalName;
      };

      // =========================================
      // شيت لكل مشرف
      // =========================================

      for (const [supervisorName, items] of bySupervisor.entries()) {
        const sheet = workbook.addWorksheet(sanitizeSheetName(supervisorName), {
          views: [{ rightToLeft: true }],
        });

        const itemRows = items.map((item) => item.data);
        const widths = LIVE
          ? mainWidths
          : computeColumnWidths(EXCEL_COLUMNS, itemRows);

        sheet.columns = withWidths(widths);

        const total = items.length + 1 + SUP_EXTRA_ROWS;

        if (LIVE) {
          sheet.getCell("M1").value = supervisorName;

          for (let r = 2; r <= total; r++) {
            const item = items[r - 2];

            sheet.getCell(`L${r}`).value = {
              formula: `IFERROR(MATCH($M$1&"|"&(ROW()-1),${mainRange("L")},0),"")`,
              result: item ? item.index + 1 : "",
            };

            letters.forEach((letter, i) => {
              sheet.getCell(`${letter}${r}`).value = {
                formula: `IF($L${r}="","",INDEX(${mainRange(letter)},$L${r})&"")`,
                result: item ? String(item.data[keys[i]] ?? "") : "",
              };
            });
          }

          sheet.getColumn(12).hidden = true;
          sheet.getColumn(13).hidden = true;
        } else {
          // قيم عادية: قابلة للتعديل والإضافة بحرية
          itemRows.forEach((row) => sheet.addRow(row));
        }

        styleHeaderRow(sheet);
        styleBodyRows(sheet, {
          borderLastRow: LIVE ? total : items.length + 1,
          styleLastRow: total,
          heights: LIVE
            ? []
            : itemRows.map((row) => computeRowHeight(row, widths)),
        });
        addPeriodConditionalFormatting(sheet, periodColorMap, total);
      }

      // =========================================
      // شيت مخفي بأسماء المشرفين + قائمة منسدلة
      // =========================================

      const listNames = [...bySupervisor.keys()];

      const listSheet = workbook.addWorksheet(LISTS, { state: "hidden" });

      listNames.forEach((name, i) => {
        listSheet.getCell(`A${i + 1}`).value = name;
      });

      for (let r = 2; r <= mainLast; r++) {
        mainSheet.getCell(`J${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'${LISTS}'!$A$1:$A$${Math.max(listNames.length, 1)}`],
        };
      }

      // =========================================
      // تنزيل الملف
      // =========================================

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const dateRange = getPlanDateRange(dataToExport);

      link.href = url;
      link.download = `خطة_${dateRange || planId}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Excel download error:", err);
      alert("❌ حدث خطأ أثناء إنشاء ملف Excel.");
    }
  };

  const downloadExcelFiltered = async () => {
    try {
      if (!filteredPlanData.length) {
        alert("⚠️ لا توجد بيانات لتنزيلها حسب الفلتر الحالي.");
        return;
      }

      const dataToExport = sortForExcel(filteredPlanData);
      const rowsData = dataToExport.map(toExcelRow);

      // الألوان من الخطة كاملة كي تبقى ثابتة حتى مع الفلتر
      const periodColorMap = buildPeriodColorMap(planData);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Lecture Supervisor System";
      workbook.created = new Date();

      const sheetTitle = filterSupervisor
        ? `مشرف - ${filterSupervisor}`
        : "الخطة (مفلترة)";

      const cleanTitle = sheetTitle.replace(/[:\\/?*[\]]/g, "").slice(0, 31);

      const sheet = workbook.addWorksheet(cleanTitle || "الخطة", {
        views: [{ rightToLeft: true }],
      });

      const widths = computeColumnWidths(EXCEL_COLUMNS, rowsData);
      const lastRow = rowsData.length + 1;

      sheet.columns = withWidths(widths);
      rowsData.forEach((row) => sheet.addRow(row));

      styleHeaderRow(sheet);
      styleBodyRows(sheet, {
        borderLastRow: lastRow,
        styleLastRow: lastRow,
        heights: rowsData.map((row) => computeRowHeight(row, widths)),
      });
      addPeriodConditionalFormatting(sheet, periodColorMap, lastRow);

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const dateRange = getPlanDateRange(dataToExport);

      link.href = url;
      link.download = filterSupervisor
        ? `مشرف_${filterSupervisor}_${dateRange || planId}.xlsx`
        : `خطة_${dateRange || planId}_مفلترة.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Excel filtered download error:", err);
      alert("❌ حدث خطأ أثناء إنشاء ملف Excel المفلتر.");
    }
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

          {/* =================================================
            Header Actions
        ================================================= */}
          <div className="plan-header-actions">
            {/* زر الرجوع للصفحة الرئيسية */}
            <button
              type="button"
              className="back-home-btn"
              onClick={() => navigate("/")}
            >
              🏠 الصفحة الرئيسية
            </button>

            {/* حالة الخطة */}
            <span
              className={
                planStatus === "accepted"
                  ? "status-badge status-accepted"
                  : planStatus === "rejected"
                    ? "status-badge status-rejected"
                    : "status-badge status-draft"
              }
            >
              {planStatus === "accepted"
                ? "✅ مقبولة"
                : planStatus === "rejected"
                  ? "❌ مرفوضة"
                  : "📝 مسودة"}
            </span>
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
              <strong>{supervisorStats.length}</strong>{" "}
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
                placeholder="Search by Session Group, CRN, Course Name, Professor, Supervisor..."
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
              {/* Supervisor */}
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

              {/* Professor */}
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

              {/* Date */}
              <div className="filter-field">
                <label>📅 Date</label>

                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              {/* Period */}
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
          Session Group removed
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
                ["crn", "CRN"],
                ["courseName", "Course name"],
                ["professor", "Professor"],
                ["phone", "Phone"],
                ["room", "Studio"],
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

          {selectedAssignments.length > 0 && (
            <div className="bulk-bar">
              <span className="bulk-bar-count">
                ✓ {selectedAssignments.length} صف محدد
              </span>

              <select
                value={bulkSupervisor}
                onChange={(e) => setBulkSupervisor(e.target.value)}
                disabled={bulkSaving}
              >
                <option value="">اختر المشرف الجديد</option>

                {(bulkShowAllSupervisors
                  ? allSupervisorsList
                  : supervisors
                ).map((supervisor) => {
                  const id =
                    supervisor?.id ??
                    supervisor?.supervisor_id ??
                    supervisor?.supervisorId;

                  const name =
                    supervisor?.name ??
                    supervisor?.supervisor_name ??
                    supervisor?.supervisorName ??
                    supervisor?.full_name ??
                    "";

                  if (id === null || id === undefined || id === "") return null;

                  return (
                    <option key={String(id)} value={String(id)}>
                      {name}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                className="bulk-toggle-btn"
                onClick={() => setBulkShowAllSupervisors((prev) => !prev)}
                disabled={bulkSaving}
              >
                {bulkShowAllSupervisors
                  ? "↩️ المشرفون المختارون فقط"
                  : "👥 عرض جميع المشرفين"}
              </button>

              <button
                type="button"
                className="bulk-apply-btn"
                onClick={applyBulkSupervisor}
                disabled={bulkSaving || !bulkSupervisor}
              >
                {bulkSaving ? "⏳ جاري النقل..." : "✓ تطبيق على المحدد"}
              </button>

              <button
                type="button"
                className="bulk-clear-btn"
                onClick={clearSelection}
                disabled={bulkSaving}
              >
                ✕ إلغاء التحديد
              </button>
            </div>
          )}

          {planData.length > 0 ? (
            <div className="table-container">
              {/* =================================================
                SCREEN TABLE
                Session Group removed
            ================================================= */}
              <table className="assignments-table screen-plan-table">
                <thead>
                  <tr>
                    <th className="select-column">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              selectedAssignments.length > 0 &&
                              !allVisibleSelected;
                          }
                        }}
                        onChange={toggleSelectAllVisible}
                        disabled={!filteredPlanData.length || bulkSaving}
                        title="تحديد كل الصفوف الظاهرة"
                      />
                    </th>
                    {visibleColumns.crn && <th>CRN</th>}

                    {visibleColumns.courseName && <th>Course name</th>}

                    {visibleColumns.professor && <th>Professor</th>}

                    {visibleColumns.phone && <th>Phone</th>}

                    {visibleColumns.room && <th>Studio</th>}

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
                      {
                        /* Session Group still used internally */
                      }
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

                      const isRowSelected =
                        rowId !== null &&
                        rowId !== undefined &&
                        selectedRowIds.has(String(rowId));

                      return (
                        <tr
                          key={`${rowId}-${index}`}
                          className={isRowSelected ? "row-selected" : ""}
                        >
                          <td className="select-column">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleRowSelection(rowId)}
                              disabled={
                                bulkSaving ||
                                rowId === null ||
                                rowId === undefined
                              }
                            />
                          </td>
                          {/* CRN */}
                          {visibleColumns.crn && (
                            <td>
                              <span className="crn-text">
                                {assignment.crn ?? "-"}
                              </span>
                            </td>
                          )}

                          {/* Course Name */}
                          {visibleColumns.courseName && (
                            <td>
                              <span className="course-name-text">
                                {getCourseName(assignment)}
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

                          {visibleColumns.phone && (
                            <td>
                              <span className="phone-text" dir="ltr">
                                {getPhone(assignment)}
                              </span>
                            </td>
                          )}

                          {visibleColumns.room && (
                            <td>
                              {isEditing ? (
                                <select
                                  className="edit-room-input"
                                  value={editingRoom}
                                  onChange={(e) =>
                                    setEditingRoom(e.target.value)
                                  }
                                  disabled={isSaving}
                                >
                                  <option value="">اختر القاعة</option>

                                  {/* إذا القاعة الحالية مش ضمن القائمة (مثلاً غير نشطة) نعرضها برضو */}
                                  {editingRoom &&
                                    !roomOptions.some(
                                      (r) => r.value === editingRoom,
                                    ) && (
                                      <option value={editingRoom}>
                                        {editingRoom}
                                      </option>
                                    )}

                                  {roomOptions.map((room) => (
                                    <option key={room.value} value={room.value}>
                                      {room.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="period-badge">
                                  {getRoomNumber(assignment)}
                                </span>
                              )}
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
                                  {/* ✅ زر التبديل */}

                                  <button
                                    type="button"
                                    className="toggle-supervisor-scope-btn"
                                    style={{
                                      fontSize: "11px",
                                      marginBottom: "4px",
                                      background: "none",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "6px",
                                      padding: "2px 6px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      setEditingShowAllSupervisors(
                                        (prev) => !prev,
                                      )
                                    }
                                  >
                                    {editingShowAllSupervisors
                                      ? "↩️ المشرفون المختارون فقط"
                                      : "👥 عرض جميع المشرفين"}
                                  </button>

                                  <select
                                    className="edit-supervisor-select"
                                    value={editingSupervisor ?? ""}
                                    onChange={(e) => {
                                      console.log(
                                        "🔵 SELECT CHANGED:",
                                        e.target.value,
                                        typeof e.target.value,
                                      );

                                      setEditingSupervisor(e.target.value);
                                    }}
                                    disabled={isSaving}
                                  >
                                    <option value="">اختر المشرف</option>

                                    {(editingShowAllSupervisors
                                      ? allSupervisorsList
                                      : supervisors
                                    ).map((supervisor) => {
                                      const supervisorId =
                                        supervisor?.id ??
                                        supervisor?.supervisor_id ??
                                        supervisor?.supervisorId;

                                      const supervisorName =
                                        supervisor?.name ??
                                        supervisor?.supervisor_name ??
                                        supervisor?.supervisorName ??
                                        supervisor?.full_name ??
                                        "";

                                      if (
                                        supervisorId === null ||
                                        supervisorId === undefined ||
                                        supervisorId === ""
                                      ) {
                                        return null;
                                      }

                                      return (
                                        <option
                                          key={String(supervisorId)}
                                          value={String(supervisorId)}
                                        >
                                          {supervisorName}

                                          {String(supervisorId) ===
                                          String(affinitySupervisorId)
                                            ? " 🔗"
                                            : ""}
                                        </option>
                                      );
                                    })}
                                  </select>

                                  {affinitySupervisorId !== null && (
                                    <small className="affinity-note">
                                      ⚠️ هذا الأستاذ مرتبط بمشرف محدد، سيظهر
                                      تنبيه عند الحفظ{" "}
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
                          2
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
                Session Group removed
            ================================================= */}
              <div className="print-only-table">
                <table className="assignments-table print-table">
                  <colgroup>
                    <col className="print-col-crn" />

                    <col className="print-col-course" />

                    <col className="print-col-professor" />
                    <col className="print-col-phone" />
                    <col className="print-col-studio" />

                    <col className="print-col-date" />

                    <col className="print-col-period" />

                    <col className="print-col-time" />

                    <col className="print-col-time" />

                    <col className="print-col-supervisor" />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>CRN</th>

                      <th>Course Name</th>

                      <th>Professor</th>

                      <th>Phone</th>

                      <th>Studio</th>

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
                            <td>{assignment.crn ?? "-"}</td>

                            <td className="print-course-name" dir="auto">
                              {getCourseName(assignment)}
                            </td>

                            <td className="print-professor" dir="auto">
                              {getProfessorName(assignment)}
                            </td>

                            <td dir="ltr">{getPhone(assignment)}</td>

                            <td>{getRoomNumber(assignment)}</td>

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

          {/* =================================================
            PLAN ACTIONS
            الأزرار أسفل جدول الخطة
        ================================================= */}
          <div className="plan-bottom-actions">
            {/* Accept */}
            <button
              type="button"
              className="btn btn-success"
              disabled={statusSaving || planStatus === "accepted"}
              onClick={() => changePlanStatus("accepted")}
            >
              <span>✅</span>

              <span>
                {statusSaving && planStatus !== "accepted"
                  ? "جاري الحفظ..."
                  : "قبول الخطة"}
              </span>
            </button>

            {/* Reject */}
            <button
              type="button"
              className="btn btn-danger"
              disabled={statusSaving || planStatus === "rejected"}
              onClick={() => changePlanStatus("rejected")}
            >
              <span>❌</span>

              <span>رفض الخطة</span>
            </button>

            {/* Print */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={printPlan}
            >
              <span>🖨️</span>

              <span>طباعة الخطة</span>
            </button>

            {/* Excel */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={downloadExcel}
            >
              <span>📥</span>
              <span>تحميل الخطة الكاملة</span>
            </button>

            {/* Excel - حسب الفلتر الحالي */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={downloadExcelFiltered}
              disabled={!filteredPlanData.length}
            >
              <span>تحميل حسب الفلتر الحالي</span>
            </button>
          </div>
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
