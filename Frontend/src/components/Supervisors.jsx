import React, { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar.jsx";

import {
  getSupervisors,
  createSupervisor,
  updateSupervisor,
} from "../api.js";

import "../assets/supervisors.css";

export default function Supervisors() {
  const [supervisors, setSupervisors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    active: true,
  });

  /* =========================================================
     Load Supervisors
  ========================================================= */

  const loadSupervisors = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getSupervisors();

      const data =
        response?.supervisors ??
        response?.data?.supervisors ??
        response?.data ??
        [];

      setSupervisors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load supervisors:", err);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "حدث خطأ أثناء تحميل المشرفين.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupervisors();
  }, []);

  /* =========================================================
     Statistics
  ========================================================= */

  const stats = useMemo(() => {
    const total = supervisors.length;

    const active = supervisors.filter(
      (supervisor) =>
        supervisor.active === true ||
        supervisor.active === 1 ||
        supervisor.active === "true",
    ).length;

    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }, [supervisors]);

  /* =========================================================
     Search
  ========================================================= */

  const filteredSupervisors = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return supervisors;

    return supervisors.filter((supervisor) =>
      String(supervisor.name ?? "")
        .toLowerCase()
        .includes(value),
    );
  }, [supervisors, search]);

  /* =========================================================
     Form
  ========================================================= */

  const resetForm = () => {
    setForm({
      name: "",
      active: true,
    });

    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (supervisor) => {
    setEditingId(supervisor.id);

    setForm({
      name: supervisor.name ?? "",
      active:
        supervisor.active === true ||
        supervisor.active === 1 ||
        supervisor.active === "true",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

  /* =========================================================
     Save
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("أدخل اسم المشرف.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId) {
        await updateSupervisor(editingId, {
          name,
          active: form.active,
        });

        setSuccess("تم تحديث بيانات المشرف بنجاح.");
      } else {
        await createSupervisor({
          name,
          active: form.active,
        });

        setSuccess("تم إضافة المشرف بنجاح.");
      }

      await loadSupervisors();

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Supervisor save error:", err);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "حدث خطأ أثناء حفظ بيانات المشرف.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     Toggle Active
  ========================================================= */

  const toggleSupervisor = async (supervisor) => {
    const currentActive =
      supervisor.active === true ||
      supervisor.active === 1 ||
      supervisor.active === "true";

    try {
      setError("");
      setSuccess("");

      await updateSupervisor(supervisor.id, {
        active: !currentActive,
      });

      setSupervisors((current) =>
        current.map((item) =>
          item.id === supervisor.id
            ? {
                ...item,
                active: !currentActive,
              }
            : item,
        ),
      );

      setSuccess(
        !currentActive
          ? `تم تفعيل ${supervisor.name}`
          : `تم إيقاف ${supervisor.name}`,
      );
    } catch (err) {
      console.error("Toggle supervisor error:", err);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "تعذر تغيير حالة المشرف.",
      );
    }
  };

  return (
    <div className="supervisors-page" dir="rtl">
      <Sidebar />

      <main className="supervisors-main">
        {/* =====================================================
            Header
        ===================================================== */}

        <header className="supervisors-header">
          <div>
            <div className="supervisors-breadcrumb">
              LectureFlow
              <span>/</span>
              المشرفون
            </div>

            <div className="supervisors-title-row">
              <div className="supervisors-title-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              <div>
                <h1>المشرفون</h1>

                <p>
                  إدارة المشرفين المتاحين واختيار المشرفين النشطين ضمن خطط
                  التوزيع.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="add-supervisor-button"
            onClick={openAddForm}
          >
            <span>+</span>
            إضافة مشرف
          </button>
        </header>

        {/* =====================================================
            Alerts
        ===================================================== */}

        {error && (
          <div className="supervisor-alert supervisor-alert-error">
            <span className="alert-symbol">!</span>

            <div>
              <strong>حدث خطأ</strong>
              <p>{error}</p>
            </div>

            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="supervisor-alert supervisor-alert-success">
            <span className="alert-symbol">✓</span>

            <div>
              <strong>تمت العملية</strong>
              <p>{success}</p>
            </div>

            <button type="button" onClick={() => setSuccess("")}>
              ×
            </button>
          </div>
        )}

        {/* =====================================================
            Statistics
        ===================================================== */}

        <section className="supervisor-stats">
          <div className="supervisor-stat-card">
            <div className="stat-card-icon total">
              <svg viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>

            <div>
              <span>إجمالي المشرفين</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="supervisor-stat-card">
            <div className="stat-card-icon active">
              <svg viewBox="0 0 24 24">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>

            <div>
              <span>المشرفون النشطون</span>
              <strong>{stats.active}</strong>
            </div>
          </div>

          <div className="supervisor-stat-card">
            <div className="stat-card-icon inactive">
              <svg viewBox="0 0 24 24">
                <path d="M6 6l12 12" />
                <path d="M18 6 6 18" />
              </svg>
            </div>

            <div>
              <span>غير النشطين</span>
              <strong>{stats.inactive}</strong>
            </div>
          </div>
        </section>

        {/* =====================================================
            Main Card
        ===================================================== */}

        <section className="supervisors-card">
          <div className="supervisors-card-header">
            <div>
              <h2>قائمة المشرفين</h2>

              <p>
                يمكنك تعديل بيانات المشرف أو تغيير حالته مباشرة.
              </p>
            </div>

            <div className="supervisor-search">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مشرف..."
              />
            </div>
          </div>

          {/* =================================================
              Table
          ================================================= */}

          <div className="supervisors-table-wrapper">
            {loading ? (
              <div className="supervisors-loading">
                <span className="loading-spinner" />
                <p>جاري تحميل المشرفين...</p>
              </div>
            ) : filteredSupervisors.length === 0 ? (
              <div className="supervisors-empty">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </div>

                <h3>
                  {search
                    ? "لم يتم العثور على مشرف"
                    : "لا يوجد مشرفون حتى الآن"}
                </h3>

                <p>
                  {search
                    ? "جرّبي البحث باسم مختلف."
                    : "ابدئي بإضافة أول مشرف إلى النظام."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={openAddForm}
                  >
                    + إضافة أول مشرف
                  </button>
                )}
              </div>
            ) : (
              <table className="supervisors-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المشرف</th>
                    <th>الحالة</th>
                    <th>رقم المشرف</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSupervisors.map((supervisor, index) => {
                    const isActive =
                      supervisor.active === true ||
                      supervisor.active === 1 ||
                      supervisor.active === "true";

                    return (
                      <tr key={supervisor.id}>
                        <td>
                          <span className="row-number">
                            {index + 1}
                          </span>
                        </td>

                        <td>
                          <div className="supervisor-person">
                            <div className="supervisor-avatar">
                              {String(supervisor.name ?? "?")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>{supervisor.name}</strong>

                              <span>
                                مشرف في النظام
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={
                              isActive
                                ? "status-toggle active"
                                : "status-toggle inactive"
                            }
                            onClick={() =>
                              toggleSupervisor(supervisor)
                            }
                            title={
                              isActive
                                ? "اضغط لإيقاف المشرف"
                                : "اضغط لتفعيل المشرف"
                            }
                          >
                            <span className="status-dot" />

                            {isActive
                              ? "نشط"
                              : "غير نشط"}
                          </button>
                        </td>

                        <td>
                          <span className="supervisor-id">
                            #{supervisor.id}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="edit-supervisor-button"
                            onClick={() =>
                              openEditForm(supervisor)
                            }
                          >
                            <svg viewBox="0 0 24 24">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>

                            تعديل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filteredSupervisors.length > 0 && (
            <div className="supervisors-card-footer">
              <span>
                عرض <strong>{filteredSupervisors.length}</strong> من{" "}
                <strong>{supervisors.length}</strong> مشرف
              </span>
            </div>
          )}
        </section>
      </main>

      {/* =====================================================
          Add / Edit Modal
      ===================================================== */}

      {showForm && (
        <div
          className="supervisor-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="supervisor-modal">
            <div className="modal-header">
              <div>
                <span className="modal-kicker">
                  {editingId ? "EDIT SUPERVISOR" : "NEW SUPERVISOR"}
                </span>

                <h2>
                  {editingId
                    ? "تعديل المشرف"
                    : "إضافة مشرف جديد"}
                </h2>

                <p>
                  {editingId
                    ? "عدّل بيانات المشرف ثم احفظ التغييرات."
                    : "أدخل بيانات المشرف لإضافته إلى النظام."}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="supervisor-name">
                  اسم المشرف
                </label>

                <input
                  id="supervisor-name"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                  placeholder="مثال: أحمد محمد"
                  autoFocus
                  disabled={saving}
                />
              </div>

              <label className="active-field">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      active: e.target.checked,
                    }))
                  }
                  disabled={saving}
                />

                <span className="custom-checkbox">
                  {form.active && "✓"}
                </span>

                <span>
                  <strong>المشرف نشط</strong>
                  <small>
                    يمكن اختياره ضمن المشرفين المناوبين.
                  </small>
                </span>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={closeForm}
                  disabled={saving}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="modal-save"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      {editingId
                        ? "حفظ التعديلات"
                        : "إضافة المشرف"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}