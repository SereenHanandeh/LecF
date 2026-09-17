import React from "react";
import { NavLink } from "react-router-dom";
import "../assets/Sidebar.css";

/* =========================================================
   Icons
========================================================= */

const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),

  plans: (
    <svg viewBox="0 0 24 24">
      <path d="M6 3h9l3 3v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v4h4" />
      <path d="M8 11h8M8 15h8M8 19h5" />
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

  settings: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20H11v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 6.73 15 1.7 1.7 0 0 0 5.2 14H5v-3h.2a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11 5.2V5h3v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 19.8 11H20v3h-.2A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  ),
};

/* =========================================================
   Sidebar
========================================================= */

export default function Sidebar() {
  return (
    <aside className="app-sidebar">

      {/* ================= Brand ================= */}

      <div className="sidebar-brand">

        <div className="sidebar-brand-icon">
          {Icons.dashboard}
        </div>

        <div className="sidebar-brand-text">
          <strong>LectureFlow</strong>
          <span>Supervisor System</span>
        </div>

      </div>

      {/* ================= Navigation ================= */}

      <div className="sidebar-section-title">
        النظام
      </div>

      <nav className="sidebar-navigation">

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <span className="sidebar-link-icon">
            {Icons.dashboard}
          </span>

          <span className="sidebar-link-text">
            إنشاء خطة
          </span>

          <span className="sidebar-active-indicator" />
        </NavLink>

        <NavLink
          to="/plans"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <span className="sidebar-link-icon">
            {Icons.plans}
          </span>

          <span className="sidebar-link-text">
            الخطط السابقة
          </span>

          <span className="sidebar-active-indicator" />
        </NavLink>

        <NavLink
          to="/supervisors"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <span className="sidebar-link-icon">
            {Icons.users}
          </span>

          <span className="sidebar-link-text">
            المشرفون
          </span>

          <span className="sidebar-active-indicator" />
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <span className="sidebar-link-icon">
            {Icons.settings}
          </span>

          <span className="sidebar-link-text">
            الإعدادات
          </span>

          <span className="sidebar-active-indicator" />
        </NavLink>

      </nav>

      {/* ================= Bottom ================= */}

      <div className="sidebar-bottom">

        <div className="sidebar-help">

          <div className="sidebar-help-icon">
            ?
          </div>

          <div>
            <strong>تحتاج مساعدة؟</strong>

            <span>
              استخدم الأقسام من القائمة للتنقل.
            </span>
          </div>

        </div>

        <div className="sidebar-version">
          LectureFlow v1.0
        </div>

      </div>

    </aside>
  );
}