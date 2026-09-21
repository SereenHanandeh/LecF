import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});
// ==============================
// Plans
// ==============================

export const createPlan = (payload) =>
  api.post("/plan", payload).then((res) => res.data);

export const generatePlan = (
  planId,
  variant = 1,
  minimumPeriodsEnabled = false,
  minimumPeriods = 4,
) =>
  api
    .post(`/plan/${planId}/generate`, {
      variant,
      minimumPeriodsEnabled,
      minimumPeriods,
    })
    .then((res) => res.data);

export const getPlan = async (planId) => {
  console.log("🔎 getPlan planId:", planId);

  console.log(
    "🔎 getPlan URL:",
    `/plan/${planId}`
  );

  try {
    const res = await api.get(
      `/plan/${planId}`
    );

    console.log(
      "✅ getPlan response:",
      res.data
    );

    return res.data;
  } catch (error) {
    console.error(
      "❌ getPlan API error:",
      error.response?.data || error
    );

    throw error;
  }
};

export const getPlans = () =>
  api.get("/plan").then((res) => res.data);

export const getStats = (planId) =>
  api.get(`/plan/${planId}/stats`).then((res) => res.data);

// ==============================
// Plan Status (Accept / Reject)
// ==============================
//
// يفترض وجود Endpoint بالباك اند:
// POST /plan/:id/status  Body: { status: "accepted" | "rejected" | "draft" }
// يرجع { success: true, status }
// ==============================

export const updatePlanStatus = (planId, status) =>
  api
    .post(`/plan/${planId}/status`, { status })
    .then((res) => res.data);

export const acceptPlan = (planId) => updatePlanStatus(planId, "accepted");

export const rejectPlan = (planId) => updatePlanStatus(planId, "rejected");

// ==============================
// Excel Export (Download)
// ==============================
export const getPlanExportUrl = (planId) =>
  `${api.defaults.baseURL}/exports/plan_${planId}.xlsx`;

// ==============================
// Duty Pool
// ==============================

export const setDutyPool = (planId, supervisorIds) =>
  api
    .post(`/plan/${planId}/duty-pool`, { supervisorIds })
    .then((res) => res.data);

// ==============================
// Period Quotas
// ==============================

export const setPeriodQuotas = (planId, supervisors) =>
  api
    .post(`/plan/${planId}/period-quotas`, {
      supervisors,
    })
    .then((res) => res.data);

// ==============================
// Affinities
// ==============================

export const setAffinities = (planId, items) =>
  api
    .post(`/plan/${planId}/affinities`, items)
    .then((res) => res.data);

// ==============================
// Excel
// ==============================

export const uploadExcel = (formData) =>
  api.post("/excel/upload/excel", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const uploadExcelFromUrl = (body) =>
  api.post("/excel/upload/excel-url", body);

// ==============================
// Supervisors
// ==============================

export const listSupervisors = () =>
  api.get("/supervisors").then((res) => res.data);

export const getSupervisors = () =>
  api.get("/supervisors").then((res) => res.data);

export const createSupervisor = (payload) =>
  api.post("/supervisors", payload).then((res) => res.data);

export const updateSupervisor = (id, payload) =>
  api.patch(`/supervisors/${id}`, payload).then((res) => res.data);

// ==============================
// Assignments
// ==============================

export const moveAssignment = (planId, body) =>
  api.patch(`/plan/${planId}/assignments`, body).then((res) => res.data);

export const lockAssignment = (planId, sgId, supId) =>
  api
    .post(`/plan/${planId}/lock`, {
      sessionGroupId: sgId,
      supervisorId: supId,
    })
    .then((res) => res.data);

export const unlockAssignment = (planId, sgId) =>
  api
    .delete(`/plan/${planId}/lock/${sgId}`)
    .then((res) => res.data);


export const deletePlan = (planId) => {
  if (!planId || typeof planId !== "string") {
    return Promise.reject(new Error("معرف الخطة غير صحيح."));
  }

  return api
    .delete(`/plan/${planId}`)
    .then((res) => res.data);
};

export const getAcceptedSupervisorStats = () =>
  api
    .get("/plan/accepted-supervisor-stats")
    .then((res) => res.data);

export default api;