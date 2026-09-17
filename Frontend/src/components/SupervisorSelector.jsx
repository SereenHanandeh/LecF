import React, { useEffect, useMemo, useState } from "react";
import { listSupervisors } from "../api.js";
import "../assets/SelectSup.css";

export default function SupervisorSelector({
  selected = [],
  setSelected,
  affinityMode = false,
  value = "",
  onValueChange = () => {},
}) {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);

        const res = await listSupervisors();

        console.log(
          "SUPERVISORS RESPONSE:",
          res
        );

        if (!mounted) return;

        const list = Array.isArray(
          res?.supervisors
        )
          ? res.supervisors
          : [];

        setSupervisors(list);
      } catch (error) {
        console.error(
          "❌ Failed to load supervisors:",
          error
        );

        if (mounted) {
          setSupervisors([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // Normalize selected IDs
  // ==========================================================

  const selectedIds = useMemo(() => {
    return selected
      .map((item) => {
        if (
          item &&
          typeof item === "object"
        ) {
          return Number(item.id);
        }

        return Number(item);
      })
      .filter((id) =>
        Number.isInteger(id)
      );
  }, [selected]);

  // ==========================================================
  // Affinity mode
  // ==========================================================

  if (affinityMode) {
    return (
      <div className="affinity-supervisor-selector">
        <div className="select-wrapper">
          <select
            value={value}
            onChange={(event) =>
              onValueChange(
                event.target.value
              )
            }
            className="modern-select"
            disabled={loading}
          >
            <option value="">
              اختر المشرف...
            </option>

            {supervisors.map((sup) => (
              <option
                key={sup.id}
                value={sup.id}
              >
                {sup.name}
              </option>
            ))}
          </select>
        </div>

        {!loading &&
          supervisors.length === 0 && (
            <div className="selector-error">
              لا يوجد مشرفون متاحون.
            </div>
          )}
      </div>
    );
  }

  // ==========================================================
  // Toggle
  // ==========================================================

  const toggleSupervisor = (id) => {
    const numericId = Number(id);

    if (!Number.isInteger(numericId)) {
      return;
    }

    if (selectedIds.includes(numericId)) {
      setSelected(
        selectedIds.filter(
          (supervisorId) =>
            supervisorId !== numericId
        )
      );
    } else {
      setSelected([
        ...selectedIds,
        numericId,
      ]);
    }
  };

  // ==========================================================
  // Select all
  // ==========================================================

  const selectAll = () => {
    const allIds = supervisors
      .map((sup) => Number(sup.id))
      .filter((id) =>
        Number.isInteger(id)
      );

    setSelected(allIds);
  };

  // ==========================================================
  // Clear all
  // ==========================================================

  const clearAll = () => {
    setSelected([]);
  };

  const allSelected =
    supervisors.length > 0 &&
    selectedIds.length ===
      supervisors.length;

  // ==========================================================
  // Normal mode
  // ==========================================================

  return (
    <div className="supervisor-selector">

      {/* Header */}

      <div className="selector-toolbar">

        <div className="selector-selected">

          <div className="selector-selected-number">
            {selectedIds.length}
          </div>

          <div>
            <strong>
              مشرف مختار
            </strong>

            <span>
              من أصل {supervisors.length}
            </span>
          </div>

        </div>

        <div className="selector-actions">

          <button
            type="button"
            className="selector-action primary"
            onClick={selectAll}
            disabled={
              loading ||
              supervisors.length === 0 ||
              allSelected
            }
          >
            تحديد الكل
          </button>

          <button
            type="button"
            className="selector-action"
            onClick={clearAll}
            disabled={
              loading ||
              selectedIds.length === 0
            }
          >
            إلغاء الكل
          </button>

        </div>

      </div>

      {/* Loading */}

      {loading && (
        <div className="supervisor-loading">
          <div className="loading-spinner" />

          <span>
            جاري تحميل المشرفين...
          </span>
        </div>
      )}

      {/* Supervisors */}

      {!loading &&
        supervisors.length > 0 && (
          <div className="supervisor-grid">
            {supervisors.map((sup) => {
              const supervisorId =
                Number(sup.id);

              const isSelected =
                selectedIds.includes(
                  supervisorId
                );

              const initials =
                String(
                  sup.name ?? ""
                )
                  .trim()
                  .charAt(0) || "?";

              return (
                <label
                  key={supervisorId}
                  className={
                    isSelected
                      ? "supervisor-card-item selected"
                      : "supervisor-card-item"
                  }
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      toggleSupervisor(
                        supervisorId
                      )
                    }
                  />

                  <div className="supervisor-check">
                    <span />
                  </div>

                  <div className="supervisor-avatar">
                    {initials}
                  </div>

                  <div className="supervisor-info">
                    <strong>
                      {sup.name}
                    </strong>

                    <span>
                      Supervisor #{sup.id}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="supervisor-selected-mark">
                      ✓
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        )}

      {/* Empty */}

      {!loading &&
        supervisors.length === 0 && (
          <div className="selector-empty">
            <div className="selector-empty-icon">
              👥
            </div>

            <strong>
              لا يوجد مشرفون متاحون
            </strong>

            <span>
              تأكد من وجود مشرفين في قاعدة
              البيانات.
            </span>
          </div>
        )}

    </div>
  );
}