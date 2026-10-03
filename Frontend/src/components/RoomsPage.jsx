import React, { useEffect, useState } from "react";
import "../assets/RoomsPage.css";

const API_BASE = "/rooms";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    roomNumber: "",
    capacity: "",
    building: "",
  });

  const [submitting, setSubmitting] = useState(false);

  async function loadRooms() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(API_BASE);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "تعذر تحميل القاعات");
      }

      setRooms(json.data);
    } catch (err) {
      setError(err.message || "تعذر تحميل القاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({ roomNumber: "", capacity: "", building: "" });
  }

  function startEdit(room) {
    setEditingId(room.id);
    setForm({
      roomNumber: room.room_number ?? "",
      capacity: room.capacity ?? "",
      building: room.building ?? "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.roomNumber.trim()) {
      setError("رقم/اسم القاعة مطلوب");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: form.roomNumber.trim(),
          capacity: form.capacity === "" ? null : Number(form.capacity),
          building: form.building.trim() || null,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "فشل حفظ القاعة");
      }

      resetForm();
      await loadRooms();
    } catch (err) {
      setError(err.message || "فشل حفظ القاعة");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(room) {
    if (!window.confirm(`هل تريد حذف القاعة "${room.room_number}"؟`)) {
      return;
    }

    setError("");

    try {
      const res = await fetch(`${API_BASE}/${room.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "فشل حذف القاعة");
      }

      if (editingId === room.id) {
        resetForm();
      }

      await loadRooms();
    } catch (err) {
      setError(err.message || "فشل حذف القاعة");
    }
  }

  async function toggleActive(room) {
    setError("");

    try {
      const res = await fetch(`${API_BASE}/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !room.is_active }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "فشل تحديث حالة القاعة");
      }

      await loadRooms();
    } catch (err) {
      setError(err.message || "فشل تحديث حالة القاعة");
    }
  }

  return (
    <div className="rooms-page">
      <div className="rooms-header">
        <h1>القاعات</h1>
        <p>إدارة القاعات المستخدمة في توزيع الخطط — الإضافة/التعديل/الحذف.</p>
      </div>

      <form className="rooms-form" onSubmit={handleSubmit}>
        <div className="rooms-form-row">
          <label>
            رقم/اسم القاعة *
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

          <label>
            السعة (اختياري)
            <input
              type="number"
              min="0"
              value={form.capacity}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacity: e.target.value }))
              }
              placeholder="عدد المقاعد"
            />
          </label>

          <label>
            المبنى (اختياري)
            <input
              type="text"
              value={form.building}
              onChange={(e) =>
                setForm((f) => ({ ...f, building: e.target.value }))
              }
              placeholder="مثال: المبنى A"
            />
          </label>
        </div>

        <div className="rooms-form-actions">
          <button type="submit" disabled={submitting}>
            {editingId ? "حفظ التعديل" : "إضافة قاعة"}
          </button>

          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              إلغاء
            </button>
          )}
        </div>
      </form>

      {error && <div className="rooms-error">{error}</div>}

      {loading ? (
        <div className="rooms-loading">جاري التحميل...</div>
      ) : (
        <table className="rooms-table">
          <thead>
            <tr>
              <th>القاعة</th>
              <th>السعة</th>
              <th>المبنى</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className={!room.is_active ? "inactive" : ""}>
                <td>{room.room_number}</td>
                <td>{room.capacity ?? "—"}</td>
                <td>{room.building ?? "—"}</td>
                <td>
                  <button
                    className={`status-toggle ${
                      room.is_active ? "active" : "disabled"
                    }`}
                    onClick={() => toggleActive(room)}
                    type="button"
                  >
                    {room.is_active ? "مفعّلة" : "معطّلة"}
                  </button>
                </td>
                <td className="rooms-actions-cell">
                  <button type="button" onClick={() => startEdit(room)}>
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(room)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}

            {!rooms.length && (
              <tr>
                <td colSpan={5} className="rooms-empty">
                  لا توجد قاعات مضافة بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}