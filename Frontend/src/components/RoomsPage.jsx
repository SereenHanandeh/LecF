import React, { useEffect, useMemo, useState } from "react";
import { listRooms, createRoom, updateRoom, deleteRoom } from "../api.js";
import Sidebar from "../components/Sidebar.jsx";
import "../pages/dashboard.css";
import "../assets/RoomsPage.css";

const CATEGORY_OPTIONS = ["مدمج", "دبلوم", "متطلبات"];

const TAG_OPTIONS = [
  { value: "", label: "بدون وسم" },
  { value: "out", label: "out" },
  { value: "mentor", label: "mentor" },
  { value: "خاصة", label: "خاصة" },
];

const Icons = {
  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
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
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  ),
  room: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 4v16" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
};

const emptyForm = {
  roomNumber: "",
  tag: "",
  categories: [],
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل"); // الكل | مفعّلة | معطّلة

  async function loadRooms() {
    setLoading(true);
    setError("");

    try {
      const data = await listRooms(false);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to load rooms:", err);
      setError(
        err?.response?.data?.error || err?.message || "تعذر تحميل القاعات",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  /* ============== Derived ============== */

  const stats = useMemo(() => {
    const total = rooms.length;
    const active = rooms.filter((r) => r.is_active).length;
    const byCategory = CATEGORY_OPTIONS.map((cat) => ({
      category: cat,
      count: rooms.filter((r) => (r.categories || []).includes(cat)).length,
    }));

    return { total, active, inactive: total - active, byCategory };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        !searchTerm.trim() ||
        String(room.room_number)
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase());

      const matchesCategory =
        categoryFilter === "الكل" ||
        (room.categories || []).includes(categoryFilter);

      const matchesStatus =
        statusFilter === "الكل" ||
        (statusFilter === "مفعّلة" ? room.is_active : !room.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [rooms, searchTerm, categoryFilter, statusFilter]);

  /* ============== Form helpers ============== */

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(room) {
    setEditingId(room.id);
    setForm({
      roomNumber: room.room_number ?? "",
      tag: room.tag ?? "",
      categories: Array.isArray(room.categories) ? room.categories : [],
    });
    setShowForm(true);
    setError("");
  }

  function toggleCategory(category) {
    setForm((f) => {
      const has = f.categories.includes(category);
      return {
        ...f,
        categories: has
          ? f.categories.filter((c) => c !== category)
          : [...f.categories, category],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.roomNumber.trim()) {
      setError("رقم/اسم القاعة مطلوب");
      return;
    }

    if (!form.categories.length) {
      setError("اختر فئة واحدة على الأقل لهذه القاعة.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      roomNumber: form.roomNumber.trim(),
      tag: form.tag || null,
      categories: form.categories,
    };

    try {
      if (editingId) {
        await updateRoom(editingId, payload);
        setSuccessMessage("تم حفظ التعديل بنجاح");
      } else {
        await createRoom(payload);
        setSuccessMessage("تمت إضافة القاعة بنجاح");
      }

      resetForm();
      setShowForm(false);
      await loadRooms();
    } catch (err) {
      console.error("❌ Failed to save room:", err);
      setError(err?.response?.data?.error || err?.message || "فشل حفظ القاعة");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(room) {
    if (!window.confirm(`هل تريد حذف القاعة "${room.room_number}"؟`)) return;

    setError("");

    try {
      await deleteRoom(room.id);

      if (editingId === room.id) {
        resetForm();
        setShowForm(false);
      }

      setSuccessMessage("تم حذف القاعة");
      await loadRooms();
    } catch (err) {
      console.error("❌ Failed to delete room:", err);
      setError(err?.response?.data?.error || err?.message || "فشل حذف القاعة");
    }
  }

  async function toggleActive(room) {
    setError("");

    try {
      await updateRoom(room.id, { isActive: !room.is_active });
      await loadRooms();
    } catch (err) {
      console.error("❌ Failed to toggle room status:", err);
      setError(
        err?.response?.data?.error || err?.message || "فشل تحديث حالة القاعة",
      );
    }
  }

  const roomLabel = (room) =>
    room.tag ? `قاعة ${room.room_number} (${room.tag})` : `قاعة ${room.room_number}`;

  /* ============== UI ============== */

  return (
    <div className="dashboard-page" dir="rtl">
      <Sidebar />

      <main className="dashboard-main rooms-main">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <div className="breadcrumb">
              لوحة التحكم
              <span>/</span>
              القاعات
            </div>

            <h1>إدارة القاعات</h1>
            <p>أضف، عدّل، أو عطّل القاعات المستخدمة في توزيع الخطط.</p>
          </div>

          <button type="button" className="rooms-add-btn" onClick={openAddForm}>
            {Icons.plus}
            إضافة قاعة
          </button>
        </header>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">{Icons.warning}</span>
            <div>
              <strong>تعذر إكمال العملية</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success">
            <span className="alert-icon">{Icons.check}</span>
            <div>
              <strong>تم بنجاح</strong>
              <p>{successMessage}</p>
            </div>
            <button type="button" onClick={() => setSuccessMessage("")}>
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="stats-strip">
          <div className="stat-item">
            <span className="stat-icon violet">{Icons.room}</span>
            <div>
              <span>إجمالي القاعات</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon green">{Icons.check}</span>
            <div>
              <span>مفعّلة</span>
              <strong>{stats.active}</strong>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon red">{Icons.close}</span>
            <div>
              <span>معطّلة</span>
              <strong>{stats.inactive}</strong>
            </div>
          </div>

          {stats.byCategory.map((item) => (
            <div className="stat-item" key={item.category}>
              <span className="stat-icon orange">{Icons.room}</span>
              <div>
                <span>{item.category}</span>
                <strong>{item.count}</strong>
              </div>
            </div>
          ))}
        </section>

        {/* Filters */}
        <section className="rooms-filters">
          <div className="rooms-search-wrap">
            <span className="rooms-search-icon">{Icons.search}</span>
            <input
              type="text"
              placeholder="ابحث برقم القاعة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rooms-filter-pills">
            {["الكل", ...CATEGORY_OPTIONS].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`rooms-pill ${categoryFilter === cat ? "active" : ""}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="rooms-filter-pills">
            {["الكل", "مفعّلة", "معطّلة"].map((status) => (
              <button
                key={status}
                type="button"
                className={`rooms-pill ghost ${
                  statusFilter === status ? "active" : ""
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        {/* Form (Add/Edit) */}
        {showForm && (
          <section className="rooms-form-card">
            <div className="rooms-form-head">
              <h3>{editingId ? "تعديل القاعة" : "إضافة قاعة جديدة"}</h3>
              <button
                type="button"
                className="rooms-form-close"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                {Icons.close}
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="rooms-field">
                <span>رقم/اسم القاعة *</span>
                <input
                  type="text"
                  value={form.roomNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, roomNumber: e.target.value }))
                  }
                  placeholder="مثال: 12 أو A101"
                  required
                />
              </label>

              <div className="rooms-field">
                <span>الوسم (اختياري)</span>
                <div className="rooms-filter-pills">
                  {TAG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value || "none"}
                      type="button"
                      className={`rooms-pill ghost ${
                        form.tag === opt.value ? "active" : ""
                      }`}
                      onClick={() =>
                        setForm((f) => ({ ...f, tag: opt.value }))
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rooms-field">
                <span>الفئات المسموحة *</span>
                <div className="rooms-filter-pills">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`rooms-pill ${
                        form.categories.includes(category) ? "active" : ""
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      {form.categories.includes(category) && Icons.check}
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rooms-form-actions">
                <button
                  type="submit"
                  className="rooms-submit-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? "جارٍ الحفظ..."
                    : editingId
                      ? "حفظ التعديل"
                      : "إضافة القاعة"}
                </button>

                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Rooms grid */}
        <section className="rooms-grid-section">
          {loading ? (
            <div className="rooms-loading">
              <span className="spinner" />
              جاري تحميل القاعات...
            </div>
          ) : filteredRooms.length ? (
            <div className="rooms-grid">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className={`room-card ${!room.is_active ? "inactive" : ""}`}
                >
                  <div className="room-card-top">
                    <div className="room-card-number">
                      <span className="room-card-icon">{Icons.room}</span>
                      {roomLabel(room)}
                    </div>

                    <button
                      type="button"
                      className={`status-toggle ${
                        room.is_active ? "active" : "disabled"
                      }`}
                      onClick={() => toggleActive(room)}
                    >
                      {room.is_active ? "مفعّلة" : "معطّلة"}
                    </button>
                  </div>

                  <div className="room-card-tags">
                    {(room.categories || []).map((cat) => (
                      <span className="room-category-tag" key={cat}>
                        {cat}
                      </span>
                    ))}

                    {room.tag && (
                      <span className="room-special-tag">{room.tag}</span>
                    )}
                  </div>

                  <div className="room-card-actions">
                    <button type="button" onClick={() => startEdit(room)}>
                      {Icons.edit}
                      تعديل
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(room)}
                    >
                      {Icons.trash}
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rooms-empty-state">
              <span className="rooms-empty-icon">{Icons.room}</span>
              <strong>لا توجد قاعات مطابقة</strong>
              <p>جرّب تعديل الفلاتر أو أضف قاعة جديدة.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}