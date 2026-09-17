import React from "react";
import Sidebar from "../components/Sidebar.jsx";
import "./simple-page.css";

export default function Supervisors() {
  return (
    <div className="simple-layout" dir="rtl">
      <Sidebar />

      <main className="simple-main">
        <div className="simple-breadcrumb">
          LectureFlow / المشرفون
        </div>

        <h1>المشرفون</h1>

        <p>
          إدارة المشرفين الموجودين في النظام.
        </p>

        <div className="empty-page">
          <div className="empty-page-icon">👥</div>

          <h2>إدارة المشرفين</h2>

          <span>
            ستتم إضافة إدارة المشرفين هنا.
          </span>
        </div>
      </main>
    </div>
  );
}