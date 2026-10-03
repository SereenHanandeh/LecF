import React, { useEffect, useMemo, useState } from "react";
import {
  createPlan,
  setDutyPool,
  setAffinities,
  generatePlan,
  listSupervisors,
  setRoomAssignments,
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

const getPeriodValue = (row) =>
  row?.period_label ??
  row?.period ??
  row?.Period ??
  row?.["الفترة"] ??
  row?.["الفتره"] ??
  "";

/* =========================================================
   Rooms
   - القاعات: 1-16 و 40-46
   - قاعة 6 = out ، قاعة 15 = mentor (آخر خيار بالتوزيع التلقائي)
   - "متطلبات": قاعات 1-6 (أو 1-5 إذا فُعّل الخيار)
   - "دبلوم" و "مدمج": القاعات 1-5 + 7-16 + 40/42/46/47/48/49 (قاعة 6 للمتطلبات فقط)
   - القاعات الخاصة 100/101/102: ضمن قاعات دبلوم/مدمج (آخر أولوية مثل out/mentor)،
     وللمتطلبات تنربط بأستاذ أو تنختار يدويًا فقط
========================================================= */

const ROOM_LABELS = {
  6: "out",
  15: "mentor",
  100: "خاصة",
  101: "خاصة",
  102: "خاصة",
};

// قاعات خاصة: متاحة للربط واليدوي ولاختيار التلقائي، وليست ضمن التوزيع الافتراضي
const SPECIAL_ROOMS = ["100", "101", "102"];

// قاعات المجموعة العليا (بدل 40-46)
const HIGH_ROOMS = ["40", "42", "46", "47", "48", "49"];

// قاعات تُستخدم فقط إذا ما في بديل
const LOW_PRIORITY_ROOMS = ["6", "15", ...SPECIAL_ROOMS];

const range = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

const REQUIREMENT_ROOMS = range(1, 6); // 1..6

const DIPLOMA_MERGED_ROOMS = [
  ...range(1, 5), // 1..5 (مشتركة مع المتطلبات)
  ...range(7, 16), // 7..16
  ...HIGH_ROOMS, // 40/42/46/47/48/49
  ...SPECIAL_ROOMS, // 100/101/102 (آخر أولوية)
];

const VALID_ROOMS = [...range(1, 16), ...HIGH_ROOMS, ...SPECIAL_ROOMS];

const roomLabel = (room) =>
  ROOM_LABELS[room] ? `قاعة ${room} (${ROOM_LABELS[room]})` : `قاعة ${room}`;

// يرجع مجموعة القاعات المسموحة حسب فئة الخطة الحالية
const getRoomsPoolForCategory = (category, onlyOneToFive = false) => {
  if (category === "متطلبات") {
    return onlyOneToFive
      ? REQUIREMENT_ROOMS.filter((room) => room !== "6")
      : REQUIREMENT_ROOMS;
  }

  return DIPLOMA_MERGED_ROOMS;
};

// القاعات العادية أولًا (تصاعديًا) ثم out/mentor بالآخر
const sortRoomsByPriority = (rooms) =>
  [...rooms].sort((a, b) => {
    const la = LOW_PRIORITY_ROOMS.includes(a) ? 1 : 0;
    const lb = LOW_PRIORITY_ROOMS.includes(b) ? 1 : 0;

    if (la !== lb) return la - lb;

    return Number(a) - Number(b);
  });

// 7,8,...,16,40,... => "7–16، 40–46"
const formatRoomRanges = (rooms) => {
  const nums = rooms.map(Number).sort((a, b) => a - b);

  if (!nums.length) return "";

  const parts = [];
  let start = nums[0];
  let prev = nums[0];

  for (let i = 1; i <= nums.length; i++) {
    if (nums[i] !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = nums[i];
    }

    prev = nums[i];
  }

  return parts.join("، ");
};

/* =========================================================
   Dashboard
========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [excelBatchId, setExcelBatchId] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [planCategory, setPlanCategory] = useState("");

  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [selectedProfessors, setSelectedProfessors] = useState([]);

  const [affinitySupervisor, setAffinitySupervisor] = useState("");
  const [affinities, setAffinitiesState] = useState([]);

  const [roomAssignments, setRoomAssignmentsState] = useState([]);

  const [roomAssignMode, setRoomAssignMode] = useState("auto"); // "auto" | "manual"

  const [selectedRoomsForAuto, setSelectedRoomsForAuto] = useState([]);
  const [manualRoomAssignments, setManualRoomAssignmentsState] = useState({}); // { [periodKey||professorName]: roomNumber }

  // استخدام القاعات 1-5 فقط (استبعاد قاعة 6 out) لفئة "متطلبات"
  const [requirementsOneToFive, setRequirementsOneToFive] = useState(false);

  // ربط قاعة بأستاذ أو أكثر: [{ roomNumber, professorNames: [] }]
  const [roomLinks, setRoomLinks] = useState([]);
  const [linkRoom, setLinkRoom] = useState("");
  const [linkProfessors, setLinkProfessors] = useState([]);

  const MINIMUM_PERIODS = 4;

  const [minimumPeriodsEnabled, setMinimumPeriodsEnabled] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [supervisorNames, setSupervisorNames] = useState({});

  const [dateMode, setDateMode] = useState("single");

  const [
    twoProfessorsPerSupervisorEnabled,
    setTwoProfessorsPerSupervisorEnabled,
  ] = useState(false);

  useEffect(() => {
    setTwoProfessorsPerSupervisorEnabled(false);
  }, [planCategory]);

  /* =========================================================
     Derived data
  ========================================================= */

  const normalizedSupervisorIds = useMemo(
    () => normalizeSupervisorIds(selectedSupervisors),
    [selectedSupervisors],
  );

  const dates = useMemo(() => {
    const values = rows
      .map((row) => normalizeDate(getDateValue(row)))
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [rows]);

  const allDatesRange = useMemo(() => {
    if (!dates.length) return null;

    return {
      from: dates[0],
      to: dates[dates.length - 1],
    };
  }, [dates]);

  const selectedDateRows = useMemo(() => {
    if (dateMode === "all") {
      return rows.filter((row) => Boolean(normalizeDate(getDateValue(row))));
    }

    if (!selectedDate) return [];

    return rows.filter(
      (row) => normalizeDate(getDateValue(row)) === selectedDate,
    );
  }, [rows, selectedDate, dateMode]);

  const professors = useMemo(() => {
    const names = selectedDateRows.map(getProfessorName).filter(Boolean);

    return [...new Set(names)].sort((a, b) => a.localeCompare(b, "ar"));
  }, [selectedDateRows]);

  const selectedDateProfessors = useMemo(() => {
    return new Set(selectedDateRows.map(getProfessorName).filter(Boolean)).size;
  }, [selectedDateRows]);

  const invalidRows = useMemo(
    () => rows.filter((row) => row?.__invalid).length,
    [rows],
  );

  // تجميع الأساتذة حسب الفترة (والتاريخ في وضع "كل التواريخ")
  const periodProfessorGroups = useMemo(() => {
    const map = new Map();

    selectedDateRows.forEach((row) => {
      const professorName = getProfessorName(row);
      const period = getPeriodValue(row);
      if (!professorName || !period) return;

      const date = normalizeDate(getDateValue(row));
      const key = dateMode === "all" ? `${date}|${period}` : period;

      if (!map.has(key)) {
        map.set(key, { key, date, period, professors: new Map() });
      }

      const entry = map.get(key);
      if (!entry.professors.has(professorName)) {
        const professorRow = rows.find(
          (r) => getProfessorName(r) === professorName,
        );
        const professorId =
          professorRow?.professor_id ?? professorRow?.professorId ?? null;
        entry.professors.set(professorName, professorId);
      }
    });

    return Array.from(map.values()).map((entry) => ({
      key: entry.key,
      date: entry.date,
      period: entry.period,
      professors: Array.from(entry.professors.entries())
        .map(([professorName, professorId]) => ({ professorName, professorId }))
        .sort((a, b) => a.professorName.localeCompare(b.professorName, "ar")),
    }));
  }, [selectedDateRows, dateMode, rows]);

  const periodProfessorGroupsSignature = useMemo(
    () =>
      periodProfessorGroups
        .map(
          (g) =>
            `${g.key}:${g.professors.map((p) => p.professorName).join(",")}`,
        )
        .join("|"),
    [periodProfessorGroups],
  );

  const allowedRooms = useMemo(
    () => getRoomsPoolForCategory(planCategory, requirementsOneToFive),
    [planCategory, requirementsOneToFive],
  );

  // القاعات القابلة للاختيار (الربط / اليدوي / اختيار التلقائي) = قاعات الفئة + الخاصة
  const selectableRooms = useMemo(
    () => [...new Set([...allowedRooms, ...SPECIAL_ROOMS])],
    [allowedRooms],
  );

  // عدد الأساتذة الفريدين لكل فترة (يأخذ بعين الاعتبار التاريخ أيضًا في وضع "كل التواريخ")
  const periodProfessorCounts = useMemo(() => {
    const map = new Map();

    selectedDateRows.forEach((row) => {
      const professorName = getProfessorName(row);
      const period = getPeriodValue(row);

      if (!professorName || !period) return;

      const date = normalizeDate(getDateValue(row));
      const key = dateMode === "all" ? `${date}|${period}` : period;

      if (!map.has(key)) {
        map.set(key, { period, date, professors: new Set() });
      }

      map.get(key).professors.add(professorName);
    });

    return Array.from(map.values()).map((item) => ({
      period: item.period,
      date: item.date,
      count: item.professors.size,
    }));
  }, [selectedDateRows, dateMode]);

  // أعلى فترة من حيث عدد الأساتذة
  const busiestPeriod = useMemo(() => {
    if (!periodProfessorCounts.length) return null;

    return periodProfessorCounts.reduce((max, item) =>
      item.count > max.count ? item : max,
    );
  }, [periodProfessorCounts]);

  // الفترات التي تتجاوز عدد قاعات فئة "متطلبات" (6، أو 5 إذا فُعّل خيار 1-5)
  const periodsOverRequirementLimit = useMemo(() => {
    if (planCategory !== "متطلبات") return [];

    return periodProfessorCounts.filter(
      (item) => item.count > allowedRooms.length,
    );
  }, [periodProfessorCounts, planCategory, allowedRooms]);

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

  // كل أستاذ في كل فترة لازم يكون له قاعة
  const totalProfessorPeriods = useMemo(
    () =>
      periodProfessorGroups.reduce((sum, g) => sum + g.professors.length, 0),
    [periodProfessorGroups],
  );

  const missingRooms = Math.max(
    0,
    totalProfessorPeriods - roomAssignments.length,
  );

  const canGenerate =
    rows.length > 0 &&
    (dateMode === "all" ? allDatesRange !== null : Boolean(selectedDate)) &&
    normalizedSupervisorIds.length > 0 &&
    selectedDateRows.length > 0 &&
    planCategory &&
    periodsOverRequirementLimit.length === 0 &&
    missingRooms === 0 &&
    !isGenerating;

  useEffect(() => {
    const loadSupervisors = async () => {
      try {
        const response = await listSupervisors();

        const list = response?.data ?? response?.supervisors ?? response ?? [];

        const map = {};

        if (Array.isArray(list)) {
          list.forEach((supervisor) => {
            const id = Number(
              supervisor?.id ??
                supervisor?.supervisor_id ??
                supervisor?.supervisorId,
            );

            const name =
              supervisor?.name ??
              supervisor?.supervisor_name ??
              supervisor?.supervisorName ??
              supervisor?.full_name ??
              supervisor?.fullName ??
              "";

            if (Number.isFinite(id)) {
              map[id] = String(name).trim() || `مشرف #${id}`;
            }
          });
        }

        setSupervisorNames(map);
      } catch (error) {
        console.error("❌ Failed to load supervisors:", error);
        setSupervisorNames({});
      }
    };

    loadSupervisors();
  }, []);

  useEffect(() => {
    setSelectedProfessors([]);
  }, [selectedDate, dateMode]);

  // عند تغيير فئة الخطة أو خيار 1-5، تُعاد ضبط اختيارات القاعات والربط
  // لأن مجموعة القاعات المسموحة تتغيّر
  useEffect(() => {
    setSelectedRoomsForAuto([]);
    setManualRoomAssignmentsState({});
    setRoomLinks([]);
    setLinkRoom("");
    setLinkProfessors([]);
  }, [planCategory, requirementsOneToFive]);

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

      setRoomAssignmentsState([]);
      setSelectedRoomsForAuto([]);
      setManualRoomAssignmentsState({});
      setRoomAssignMode("auto");

      setRoomLinks([]);
      setLinkRoom("");
      setLinkProfessors([]);
      setRequirementsOneToFive(false);

      setMinimumPeriodsEnabled(false);
      setPlanCategory("");

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
     Affinities
  ========================================================= */

  const addAffinity = () => {
    const supervisorId = Number(affinitySupervisor);

    if (!selectedProfessors.length) {
      setErrorMessage("اختر أستاذًا واحدًا على الأقل.");
      return;
    }

    if (!Number.isInteger(supervisorId)) {
      setErrorMessage("اختر المشرف المرتبط بالأستاذ.");
      return;
    }

    const newItems = selectedProfessors.map((professorName) => {
      // 🔎 نبحث عن أول Row لهذا الأستاذ
      const professorRow = rows.find(
        (row) => getProfessorName(row) === professorName,
      );

      const professorId =
        professorRow?.professor_id ?? professorRow?.professorId ?? null;

      return {
        professorId,
        professorName,
        supervisorId,
      };
    });

    console.log("🔗 AFFINITIES TO SAVE:", newItems);

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
     Room links (قاعة ↔ أستاذ أو أكثر)
  ========================================================= */

  // أستاذ -> قاعة مربوطة (فقط إذا القاعة ضمن المسموح للفئة)
  const professorLinkedRoom = useMemo(() => {
    const map = new Map();

    roomLinks.forEach(({ roomNumber, professorNames }) => {
      if (!selectableRooms.includes(roomNumber)) return;

      professorNames.forEach((name) => map.set(name, roomNumber));
    });

    return map;
  }, [roomLinks, selectableRooms]);

  const addRoomLink = () => {
    if (!linkRoom) {
      setErrorMessage("اختر القاعة أولًا.");
      return;
    }

    if (!linkProfessors.length) {
      setErrorMessage("اختر أستاذًا واحدًا على الأقل لربطه بالقاعة.");
      return;
    }

    setRoomLinks((current) => {
      // الأستاذ يكون مربوط بقاعة وحدة فقط
      const cleaned = current
        .map((link) => ({
          ...link,
          professorNames: link.professorNames.filter(
            (name) => !linkProfessors.includes(name),
          ),
        }))
        .filter((link) => link.professorNames.length);

      if (cleaned.some((link) => link.roomNumber === linkRoom)) {
        return cleaned.map((link) =>
          link.roomNumber === linkRoom
            ? {
                ...link,
                professorNames: [...link.professorNames, ...linkProfessors],
              }
            : link,
        );
      }

      return [
        ...cleaned,
        { roomNumber: linkRoom, professorNames: [...linkProfessors] },
      ];
    });

    setLinkRoom("");
    setLinkProfessors([]);
    setErrorMessage("");
  };

  const removeRoomLink = (roomNumber, professorName) =>
    setRoomLinks((current) =>
      current
        .map((link) =>
          link.roomNumber === roomNumber
            ? {
                ...link,
                professorNames: link.professorNames.filter(
                  (name) => name !== professorName,
                ),
              }
            : link,
        )
        .filter((link) => link.professorNames.length),
    );

  // أستاذان مربوطان بنفس القاعة وبنفس الفترة = تعارض
  const roomLinkConflicts = useMemo(() => {
    const out = [];

    periodProfessorGroups.forEach((group) => {
      const byRoom = {};

      group.professors.forEach((p) => {
        const room = professorLinkedRoom.get(p.professorName);
        if (!room) return;

        if (!byRoom[room]) byRoom[room] = [];
        byRoom[room].push(p.professorName);
      });

      Object.entries(byRoom)
        .filter(([, names]) => names.length > 1)
        .forEach(([room, names]) =>
          out.push({ period: group.period, date: group.date, room, names }),
        );
    });

    return out;
  }, [periodProfessorGroups, professorLinkedRoom]);

  /* =========================================================
     Room Assignment (auto & manual)
  ========================================================= */

  const autoAssignRooms = () => {
    if (!professors.length) {
      setRoomAssignmentsState([]);
      setErrorMessage("");
      return;
    }

    if (!planCategory) {
      setErrorMessage("اختر فئة الخطة أولًا لتحديد القاعات المتاحة للتوزيع.");
      setRoomAssignmentsState([]);
      return;
    }

    const basePool = selectedRoomsForAuto.length
      ? selectedRoomsForAuto.filter((room) => selectableRooms.includes(room))
      : allowedRooms;

    // out / mentor بآخر القائمة، فما تُستخدم إلا عند الحاجة
    const roomsPool = sortRoomsByPriority(basePool);

    const lastRoomOfProfessor = new Map(); // لتقليل تغيير قاعة الأستاذ بين الفترات
    const newAssignments = [];

    for (const group of periodProfessorGroups) {
      const usedRooms = new Set();
      const roomOf = new Map();

      // 1) الأساتذة المربوطون بقاعة (إذا تعارضوا بنفس الفترة، الثاني يُوزَّع تلقائيًا)
      group.professors.forEach((p) => {
        const linked = professorLinkedRoom.get(p.professorName);

        if (linked && !usedRooms.has(linked)) {
          usedRooms.add(linked);
          roomOf.set(p.professorName, linked);
        }
      });

      // 2) الباقي تلقائي من القاعات الفاضية بنفس الفترة
      const rest = group.professors.filter(
        (p) => !roomOf.has(p.professorName),
      );
      const freeRooms = roomsPool.filter((room) => !usedRooms.has(room));

      if (freeRooms.length < rest.length) {
        const label =
          dateMode === "all"
            ? `${formatDate(group.date)} - ${group.period}`
            : group.period;

        setErrorMessage(
          `القاعات المتاحة لا تكفي في فترة (${label}): المطلوب ${rest.length} والمتاح ${freeRooms.length}. اختر قاعات أكثر أو فك بعض الربط.`,
        );
        setRoomAssignmentsState([]);
        return;
      }

      rest.forEach((p) => {
        const last = lastRoomOfProfessor.get(p.professorName);

        const room =
          last && !LOW_PRIORITY_ROOMS.includes(last) && freeRooms.includes(last)
            ? last
            : freeRooms[0];

        freeRooms.splice(freeRooms.indexOf(room), 1);
        roomOf.set(p.professorName, room);
      });

      group.professors.forEach((p) => {
        const roomNumber = roomOf.get(p.professorName);
        lastRoomOfProfessor.set(p.professorName, roomNumber);

        newAssignments.push({
          professorId: p.professorId,
          professorName: p.professorName,
          date: group.date,
          period: group.period,
          roomNumber,
        });
      });
    }

    setRoomAssignmentsState(newAssignments);
    setErrorMessage("");
  };

  // إعادة التوزيع التلقائي عند تغيّر الأساتذة أو القاعات المختارة أو الفئة أو الربط، فقط في وضع "تلقائي"
  useEffect(() => {
    if (roomAssignMode !== "auto") return;
    autoAssignRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    periodProfessorGroupsSignature,
    selectedRoomsForAuto.join("|"),
    roomAssignMode,
    planCategory,
    allowedRooms.join("|"),
    JSON.stringify(roomLinks),
  ]);

  // اختيار قاعة أستاذ واحد يدويًا
  const handleManualRoomChange = (periodKey, professorName, roomNumber) => {
    const compositeKey = `${periodKey}||${professorName}`;
    setManualRoomAssignmentsState((current) => ({
      ...current,
      [compositeKey]: roomNumber,
    }));
  };

  useEffect(() => {
    if (roomAssignMode !== "manual") return;

    const newAssignments = [];

    periodProfessorGroups.forEach((group) => {
      group.professors.forEach((professor) => {
        const compositeKey = `${group.key}||${professor.professorName}`;
        const roomNumber = manualRoomAssignments[compositeKey];
        if (!roomNumber) return;

        newAssignments.push({
          professorId: professor.professorId,
          professorName: professor.professorName,
          date: group.date,
          period: group.period,
          roomNumber,
        });
      });
    });

    setRoomAssignmentsState(newAssignments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualRoomAssignments, periodProfessorGroupsSignature, roomAssignMode]);

  // تنبيه إذا تكرر تخصيص نفس القاعة لأكثر من أستاذ في الوضع اليدوي
  const duplicateManualRooms = useMemo(() => {
    if (roomAssignMode !== "manual") return [];

    const duplicates = [];

    periodProfessorGroups.forEach((group) => {
      const counts = {};
      group.professors.forEach((professor) => {
        const compositeKey = `${group.key}||${professor.professorName}`;
        const roomNumber = manualRoomAssignments[compositeKey];
        if (!roomNumber) return;
        counts[roomNumber] = (counts[roomNumber] || 0) + 1;
      });

      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .forEach(([room]) =>
          duplicates.push({ period: group.period, date: group.date, room }),
        );
    });

    return duplicates;
  }, [manualRoomAssignments, roomAssignMode, periodProfessorGroups]);

  /* =========================================================
     Generate
  ========================================================= */

  const handleGenerate = async () => {
    if (!canGenerate) return;

    if (duplicateManualRooms.length > 0) {
      setErrorMessage("في قاعة مكررة بنفس الفترة، عدّل التوزيع اليدوي أولًا.");
      return;
    }

    if (planCategory === "متطلبات" && periodsOverRequirementLimit.length > 0) {
      const details = periodsOverRequirementLimit
        .map((item) =>
          dateMode === "all"
            ? `${formatDate(item.date)} - ${item.period} (${item.count} أستاذ)`
            : `${item.period} (${item.count} أستاذ)`,
        )
        .join("، ");

      setErrorMessage(
        `لا يمكن إنشاء خطة "متطلبات": عدد الأساتذة في نفس الفترة أكثر من القاعات المتاحة (${allowedRooms.length}). الفترات المتجاوزة: ${details}`,
      );

      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage("");

      const planName = `Plan ${Date.now()}`;

      const createPayload = {
        name: planName,

        excelBatchId,
        excel_batch_id: excelBatchId,

        dateFrom: dateMode === "all" ? allDatesRange.from : selectedDate,
        dateTo: dateMode === "all" ? allDatesRange.to : selectedDate,
        date_from: dateMode === "all" ? allDatesRange.from : selectedDate,
        date_to: dateMode === "all" ? allDatesRange.to : selectedDate,

        category: planCategory,
        planCategory,
        plan_category: planCategory,
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

      /* Affinities */

      if (affinities.length) {
        console.log("🔗 SENDING AFFINITIES TO BACKEND:", {
          planId,
          affinities,
        });

        const affinityResult = await setAffinities(planId, affinities);

        console.log("✅ AFFINITIES RESPONSE:", affinityResult);
      }

      /* Room Assignments */

      if (roomAssignments.length) {
        console.log("🏠 SENDING ROOM ASSIGNMENTS TO BACKEND:", {
          planId,
          roomAssignMode,
          roomAssignments,
        });

        const roomResult = await setRoomAssignments(planId, roomAssignments);

        console.log("✅ ROOM ASSIGNMENTS RESPONSE:", roomResult);
      }

      /* Generate */

      console.log("🎯 MINIMUM PERIODS SETTINGS:", {
        enabled: minimumPeriodsEnabled,
        minimumPeriods: MINIMUM_PERIODS,
      });

      const generated = await generatePlan(
        planId,
        1,
        minimumPeriodsEnabled,
        MINIMUM_PERIODS,
        twoProfessorsPerSupervisorEnabled,
      );

      navigate(`/plan-result/${planId}`, {
        state: {
          planId,
          generated,
          rows,
          selectedDate,
          planCategory,
          minimumPeriodsEnabled,
          minimumPeriods: MINIMUM_PERIODS,
          affinities,
          selectedSupervisors: normalizedSupervisorIds,
          twoProfessorsPerSupervisorEnabled,
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
            <span className="stat-icon orange">{Icons.users}</span>

            <div>
              <span>أعلى فترة</span>
              <strong>
                {busiestPeriod ? `${busiestPeriod.count} أستاذ` : "—"}
              </strong>
              {busiestPeriod && (
                <small>
                  {dateMode === "all"
                    ? `${formatDate(busiestPeriod.date)} - ${busiestPeriod.period}`
                    : busiestPeriod.period}
                </small>
              )}
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
                <div className="upload-card">
                  <div className="upload-card-top">
                    <div className="upload-excel-icon">
                      <span>XL</span>
                    </div>

                    <div className="upload-card-title">
                      <h3>رفع ملف المحاضرات</h3>
                      <p>
                        ارفعي ملف Excel الذي يحتوي على المحاضرات والمواعيد
                        والأساتذة
                      </p>
                    </div>
                  </div>

                  <div className="upload-dropzone">
                    <div className="upload-cloud-icon">{Icons.upload}</div>

                    <h4>اسحب الملف هنا</h4>

                    <span className="upload-or">أو</span>

                    <FileUploader onUploaded={handleUploaded} />

                    <p className="upload-formats">
                      الملفات المدعومة: <strong>.xlsx</strong> و{" "}
                      <strong>.xls</strong>
                    </p>
                  </div>

                  {rows.length > 0 && (
                    <div className="upload-success-card">
                      <div className="upload-success-info">
                        <strong>تم تحميل الملف بنجاح</strong>
                        <span>
                          تم العثور على {rows.length} سجل جاهز للمراجعة
                        </span>
                      </div>

                      <div className="upload-success-status">جاهز</div>
                    </div>
                  )}

                  {invalidRows > 0 && (
                    <div className="upload-warning-card">
                      <div className="upload-warning-icon">{Icons.warning}</div>

                      <div>
                        <strong>يوجد {invalidRows} سجل يحتاج إلى مراجعة</strong>
                        <span>
                          راجعي البيانات قبل إنشاء الخطة لضمان توزيع صحيح.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Date */}

            <section className="workspace-section">
              <div className="section-heading">
                <div className="section-number">02</div>

                <div>
                  <h2>نطاق الخطة</h2>
                  <p>اختر توليد الخطة ليوم واحد أو لكل تواريخ الملف.</p>
                </div>

                {(dateMode === "all" ? allDatesRange : selectedDate) && (
                  <span className="section-complete">
                    {Icons.check}
                    محدد
                  </span>
                )}
              </div>

              {/* اختيار الوضع */}
              <div
                className="date-mode-toggle"
                style={{ display: "flex", gap: "10px", marginBottom: "16px" }}
              >
                <button
                  type="button"
                  className={`plan-category-card ${dateMode === "single" ? "active" : ""}`}
                  onClick={() => {
                    setDateMode("single");
                    setErrorMessage("");
                  }}
                >
                  <div className="plan-category-icon">📅</div>
                  <div>
                    <strong>تاريخ محدد</strong>
                    <span>اختر يومًا واحدًا فقط</span>
                  </div>
                  {dateMode === "single" && (
                    <span className="plan-category-check">{Icons.check}</span>
                  )}
                </button>

                <button
                  type="button"
                  className={`plan-category-card ${dateMode === "all" ? "active" : ""}`}
                  onClick={() => {
                    setDateMode("all");
                    setErrorMessage("");
                  }}
                >
                  <div className="plan-category-icon">🗓️</div>
                  <div>
                    <strong>كل التواريخ</strong>
                    <span>خطة تغطي كل الملف دفعة واحدة</span>
                  </div>
                  {dateMode === "all" && (
                    <span className="plan-category-check">{Icons.check}</span>
                  )}
                </button>
              </div>

              {/* اختيار تاريخ محدد */}
              {dateMode === "single" && (
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

                      <div className="stat-item">
                        <span className="stat-icon orange">{Icons.users}</span>

                        <div>
                          <span>أعلى فترة</span>
                          <strong>
                            {busiestPeriod
                              ? `${busiestPeriod.count} أستاذ`
                              : "—"}
                          </strong>
                          {busiestPeriod && (
                            <small>
                              {dateMode === "all"
                                ? `${formatDate(busiestPeriod.date)} - ${busiestPeriod.period}`
                                : busiestPeriod.period}
                            </small>
                          )}
                        </div>
                      </div>

                      <div>
                        <span>الأساتذة</span>
                        <strong>{selectedDateProfessors}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ملخص كل التواريخ */}
              {dateMode === "all" && allDatesRange && (
                <div className="date-summary">
                  <div>
                    <span>من</span>
                    <strong>{formatDate(allDatesRange.from)}</strong>
                  </div>

                  <div>
                    <span>إلى</span>
                    <strong>{formatDate(allDatesRange.to)}</strong>
                  </div>

                  <div>
                    <span>عدد التواريخ</span>
                    <strong>{dates.length}</strong>
                  </div>

                  <div>
                    <span>السجلات</span>
                    <strong>{selectedDateRows.length}</strong>
                  </div>
                </div>
              )}
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

          {/* Plan Category */}

          <section className="workspace-section">
            <div className="section-heading">
              <div className="section-number">04</div>

              <div>
                <h2>فئة الخطة</h2>
                <p>اختر الفئة التي ستنتمي إليها هذه الخطة.</p>
              </div>

              {planCategory && (
                <span className="section-complete">
                  {Icons.check}
                  محددة
                </span>
              )}

              {(planCategory === "دبلوم" || planCategory === "مدمج") && (
                <label className="minimum-period-option">
                  <input
                    type="checkbox"
                    checked={twoProfessorsPerSupervisorEnabled}
                    onChange={(e) =>
                      setTwoProfessorsPerSupervisorEnabled(e.target.checked)
                    }
                  />
                  <span className="minimum-period-check">
                    {twoProfessorsPerSupervisorEnabled && Icons.check}
                  </span>
                  <span className="minimum-period-label">
                    <strong>تخصيص مشرفَين لكل دكتور</strong>
                    <small>
                      بدل مشرف واحد، يُخصَّص مشرفان فقط لكل دكتور بالتناوب على
                      الفترات.
                    </small>
                  </span>
                </label>
              )}

              {planCategory === "متطلبات" && (
                <label className="minimum-period-option">
                  <input
                    type="checkbox"
                    checked={requirementsOneToFive}
                    onChange={(e) => setRequirementsOneToFive(e.target.checked)}
                  />
                  <span className="minimum-period-check">
                    {requirementsOneToFive && Icons.check}
                  </span>
                  <span className="minimum-period-label">
                    <strong>استخدام القاعات 1–5 فقط</strong>
                    <small>
                      استبعاد قاعة 6 (out). بدون التفعيل تُستخدم 1–6 وقاعة 6
                      آخر خيار.
                    </small>
                  </span>
                </label>
              )}
            </div>

            <div className="plan-category-grid">
              <button
                type="button"
                className={`plan-category-card ${
                  planCategory === "مدمج" ? "active" : ""
                }`}
                onClick={() => {
                  setPlanCategory("مدمج");
                  setErrorMessage("");
                }}
              >
                <div className="plan-category-icon">م</div>

                <div>
                  <strong>مدمج</strong>
                  <span>خطة للمساقات المدمجة</span>
                </div>

                {planCategory === "مدمج" && (
                  <span className="plan-category-check">{Icons.check}</span>
                )}
              </button>

              <button
                type="button"
                className={`plan-category-card ${
                  planCategory === "دبلوم" ? "active" : ""
                }`}
                onClick={() => {
                  setPlanCategory("دبلوم");
                  setErrorMessage("");
                }}
              >
                <div className="plan-category-icon">د</div>

                <div>
                  <strong>دبلوم</strong>
                  <span>خطة لمساقات الدبلوم</span>
                </div>

                {planCategory === "دبلوم" && (
                  <span className="plan-category-check">{Icons.check}</span>
                )}
              </button>

              <button
                type="button"
                className={`plan-category-card ${
                  planCategory === "متطلبات" ? "active" : ""
                }`}
                onClick={() => {
                  setPlanCategory("متطلبات");
                  setErrorMessage("");
                }}
              >
                <div className="plan-category-icon">م</div>

                <div>
                  <strong>متطلبات</strong>
                  <span>خطة لمساقات المتطلبات</span>
                </div>

                {planCategory === "متطلبات" && (
                  <span className="plan-category-check">{Icons.check}</span>
                )}
              </button>
            </div>

            {planCategory === "متطلبات" &&
              periodsOverRequirementLimit.length > 0 && (
                <div
                  className="upload-warning-card"
                  style={{ marginTop: "12px" }}
                >
                  <div className="upload-warning-icon">{Icons.warning}</div>

                  <div>
                    <strong>تجاوز الحد الأقصى للقاعات في بعض الفترات</strong>
                    <span>
                      فئة "متطلبات" تحتوي على {allowedRooms.length} قاعات فقط (
                      {formatRoomRanges(allowedRooms)})، ولا يمكن أن يتجاوز عدد
                      الأساتذة في نفس الفترة {allowedRooms.length} أساتذة.
                      الفترات المتجاوزة:{" "}
                      {periodsOverRequirementLimit
                        .map((item) =>
                          dateMode === "all"
                            ? `${formatDate(item.date)} - ${item.period} (${item.count})`
                            : `${item.period} (${item.count})`,
                        )
                        .join("، ")}
                    </span>
                  </div>
                </div>
              )}
          </section>

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

            {/* Minimum Periods */}

            <div className="side-panel">
              <div className="side-panel-title">
                <div className="mini-icon violet">{Icons.settings}</div>

                <div>
                  <h3>الحد الأدنى للفترات</h3>

                  <p>خيار اختياري لضمان حصول كل مشرف على الحد الأدنى.</p>
                </div>
              </div>

              <label className="minimum-period-option">
                <input
                  type="checkbox"
                  checked={minimumPeriodsEnabled}
                  onChange={(e) => setMinimumPeriodsEnabled(e.target.checked)}
                />

                <span className="minimum-period-check">
                  {minimumPeriodsEnabled && Icons.check}
                </span>

                <span className="minimum-period-label">
                  <strong>تفعيل الحد الأدنى</strong>

                  <small>
                    أعطِ أولوية للمشرفين الذين لم يصلوا إلى {MINIMUM_PERIODS}{" "}
                    فترات.
                  </small>
                </span>
              </label>

              <div
                className={`minimum-period-summary ${
                  minimumPeriodsEnabled ? "active" : ""
                }`}
              >
                <strong>{MINIMUM_PERIODS}</strong>

                <span>فترات كحد أدنى لكل مشرف</span>
              </div>

              {!minimumPeriodsEnabled && (
                <div className="minimum-period-disabled">
                  الحد الأدنى غير مفعّل
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
                    {supervisorNames[id] || `مشرف #${id}`}
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
                      key={`${item.professorId ?? item.professorName}-${item.supervisorId}`}
                    >
                      <div>
                        <strong>{item.professorName}</strong>
                        <span>
                          ←{" "}
                          {supervisorNames[item.supervisorId] ||
                            `مشرف #${item.supervisorId}`}
                        </span>{" "}
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

            {/* Room Assignment */}

            <div className="side-panel">
              <div className="side-panel-title">
                <div className="mini-icon violet">{Icons.dashboard}</div>

                <div>
                  <h3>تخصيص القاعات</h3>
                  <p>
                    {planCategory
                      ? `القاعات المتاحة لفئة "${planCategory}": ${formatRoomRanges(
                          allowedRooms,
                        )} (${allowedRooms.length} قاعة). قاعات out/mentor آخر خيار.`
                      : "اختر فئة الخطة أولًا لتحديد القاعات المتاحة (متطلبات: قاعات 1-6، دبلوم/مدمج: قاعات 1-5 و7-16 و40/42/46/47/48/49 و100-102)."}
                  </p>
                </div>
              </div>

              {/* وضع توزيع القاعات: تلقائي / يدوي */}
              <div
                className="date-mode-toggle"
                style={{ display: "flex", gap: "10px", marginBottom: "12px" }}
              >
                <button
                  type="button"
                  className={`plan-category-card ${
                    roomAssignMode === "auto" ? "active" : ""
                  }`}
                  onClick={() => setRoomAssignMode("auto")}
                >
                  <div className="plan-category-icon">{Icons.spark}</div>
                  <div>
                    <strong>تلقائي</strong>
                    <span>توزيع القاعات تلقائيًا</span>
                  </div>
                  {roomAssignMode === "auto" && (
                    <span className="plan-category-check">{Icons.check}</span>
                  )}
                </button>

                <button
                  type="button"
                  className={`plan-category-card ${
                    roomAssignMode === "manual" ? "active" : ""
                  }`}
                  onClick={() => setRoomAssignMode("manual")}
                >
                  <div className="plan-category-icon">✋</div>
                  <div>
                    <strong>يدوي</strong>
                    <span>اختيار قاعة كل أستاذ بنفسك</span>
                  </div>
                  {roomAssignMode === "manual" && (
                    <span className="plan-category-check">{Icons.check}</span>
                  )}
                </button>
              </div>

              {roomAssignMode === "auto" ? (
                <>
                  <div className="professor-select">
                    <select
                      multiple
                      value={selectedRoomsForAuto}
                      onChange={(e) => {
                        const values = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value,
                        );

                        setSelectedRoomsForAuto(values);
                      }}
                    >
                      {sortRoomsByPriority(selectableRooms).map((room) => (
                        <option key={room} value={room}>
                          {roomLabel(room)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedRoomsForAuto.length > 0 && (
                    <div
                      className="minimum-period-summary active"
                      style={{ marginTop: "8px" }}
                    >
                      <strong>{selectedRoomsForAuto.length}</strong>
                      <span>قاعة محددة للتوزيع عليها</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="secondary-action"
                    onClick={autoAssignRooms}
                    disabled={!professors.length}
                  >
                    {Icons.spark} إعادة التوزيع التلقائي
                  </button>

                  {selectedRoomsForAuto.length > 0 && (
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => setSelectedRoomsForAuto([])}
                      style={{ marginTop: "6px" }}
                    >
                      مسح التحديد (توزيع على كل قاعات الفئة)
                    </button>
                  )}

                  {/* ربط قاعة بأستاذ / أكثر */}
                  <div style={{ marginTop: "14px" }}>
                    <strong style={{ fontSize: "13px" }}>
                      ربط قاعة بأستاذ / أكثر
                    </strong>

                    <select
                      className="side-select"
                      value={linkRoom}
                      onChange={(e) => setLinkRoom(e.target.value)}
                    >
                      <option value="">اختر القاعة</option>
                      {sortRoomsByPriority(selectableRooms).map((room) => (
                        <option key={room} value={room}>
                          {roomLabel(room)}
                        </option>
                      ))}
                    </select>

                    <div className="professor-select">
                      <select
                        multiple
                        value={linkProfessors}
                        onChange={(e) =>
                          setLinkProfessors(
                            Array.from(
                              e.target.selectedOptions,
                              (option) => option.value,
                            ),
                          )
                        }
                      >
                        {professors.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="secondary-action"
                      onClick={addRoomLink}
                    >
                      إضافة ربط القاعة
                    </button>

                    {roomLinks.length > 0 && (
                      <div className="affinity-list">
                        {roomLinks.map((link) => (
                          <div className="affinity-row" key={link.roomNumber}>
                            <div>
                              <strong>{roomLabel(link.roomNumber)}</strong>

                              {link.professorNames.map((name) => (
                                <span key={name} style={{ display: "block" }}>
                                  ← {name}{" "}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeRoomLink(link.roomNumber, name)
                                    }
                                  >
                                    {Icons.trash}
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {roomLinkConflicts.length > 0 && (
                      <div
                        className="upload-warning-card"
                        style={{ marginTop: "8px" }}
                      >
                        <div className="upload-warning-icon">
                          {Icons.warning}
                        </div>
                        <div>
                          <strong>تعارض في ربط القاعات</strong>
                          <span>
                            {roomLinkConflicts
                              .map(
                                (c) =>
                                  `${
                                    dateMode === "all"
                                      ? `${formatDate(c.date)} - `
                                      : ""
                                  }${c.period}: ${roomLabel(c.room)} (${c.names.join(
                                    "، ",
                                  )})`,
                              )
                              .join(" | ")}{" "}
                            — الأستاذ الثاني بنفس الفترة سيُوزَّع تلقائيًا.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="manual-room-list manual-room-scroll">
                  {periodProfessorGroups.length ? (
                    periodProfessorGroups.map((group) => (
                      <div key={group.key} style={{ marginBottom: "14px" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            marginBottom: "6px",
                          }}
                        >
                          {dateMode === "all"
                            ? `${formatDate(group.date)} - ${group.period}`
                            : group.period}
                        </div>

                        {group.professors.map((professor) => {
                          const compositeKey = `${group.key}||${professor.professorName}`;
                          return (
                            <div
                              className="manual-room-row"
                              key={compositeKey}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                                marginBottom: "6px",
                              }}
                            >
                              <strong style={{ fontSize: "13px" }}>
                                {professor.professorName}
                              </strong>
                              <select
                                className="side-select"
                                style={{ maxWidth: "140px" }}
                                value={
                                  manualRoomAssignments[compositeKey] || ""
                                }
                                onChange={(e) =>
                                  handleManualRoomChange(
                                    group.key,
                                    professor.professorName,
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">— اختر قاعة —</option>
                                {sortRoomsByPriority(selectableRooms).map(
                                  (room) => (
                                    <option key={room} value={room}>
                                      {roomLabel(room)}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <div className="minimum-period-disabled">
                      لا يوجد أساتذة لتوزيعهم على القاعات بعد
                    </div>
                  )}

                  {duplicateManualRooms.length > 0 && (
                    <div
                      className="upload-warning-card"
                      style={{ marginTop: "8px" }}
                    >
                      <div className="upload-warning-icon">{Icons.warning}</div>
                      <div>
                        <strong>تنبيه: قاعة مكررة في نفس الفترة</strong>
                        <span>
                          {duplicateManualRooms
                            .map((item) =>
                              dateMode === "all"
                                ? `${formatDate(item.date)} - ${item.period}: ${roomLabel(item.room)}`
                                : `${item.period}: ${roomLabel(item.room)}`,
                            )
                            .join("، ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {missingRooms > 0 && (
                <div
                  className="minimum-period-disabled"
                  style={{ marginTop: "8px" }}
                >
                  ينقص تخصيص قاعة لـ {missingRooms} فترة
                </div>
              )}

              {roomAssignments.length > 0 ? (
                <div className="room-summary">
                  <div className="room-summary-head">
                    <span>ملخص التوزيع</span>
                    <strong>{roomAssignments.length}</strong>
                  </div>

                  <div className="room-summary-scroll">
                    {periodProfessorGroups.map((group) => {
                      const items = roomAssignments.filter(
                        (item) =>
                          item.period === group.period &&
                          (dateMode !== "all" || item.date === group.date),
                      );

                      if (!items.length) return null;

                      return (
                        <div className="room-group" key={group.key}>
                          <div className="room-group-title">
                            {dateMode === "all"
                              ? `${formatDate(group.date)} - ${group.period}`
                              : group.period}
                            <small>{items.length}</small>
                          </div>

                          {items.map((item) => (
                            <div
                              className="room-row"
                              key={`${group.key}-${item.professorName}`}
                            >
                              <span
                                className="room-row-name"
                                title={item.professorName}
                              >
                                {item.professorName}
                              </span>
                              <span className="room-badge">
                                {roomLabel(item.roomNumber)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="minimum-period-disabled">
                  لا يوجد أساتذة لتوزيعهم على القاعات بعد
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
