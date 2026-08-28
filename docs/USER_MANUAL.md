# User manual (demo)

1. Start the API (`php artisan serve` in `backend`) and the UI (`npm run dev` in `frontend`).
2. **Officers:** sign in with email / `password`, or open **Create an officer account** to register as Administrator, HR, Auditor or Headteacher. **Staff:** use the Staff ID tab (`EMP-1001` / `teacher@school.gh` / `password`). HR issues that ID when registering employment.
3. Open **Anomalies** to work the investigation desk. Each case lists **what to do**: HR edits or deactivates the staff file; Payroll **recalculates** the slip or **removes them from this draft**. Then record an outcome. As accountant you can view only.
4. Open a case, follow the numbered steps for that rule, then save an outcome. Removing someone from a draft closes their flags so the Headteacher can approve.
5. As Headteacher (`head@school.gh`), try **Approve** on a run that still has critical flags — it should be blocked.
6. As a teacher, open **Leave** and use **Request leave** to submit the official leave form (demo: staff ID `EMP-1001` / `teacher@school.gh`). As HR (`hr@school.gh`), register staff, mark attendance, and review leave. New staff receive an auto-generated ID and sign in with that ID plus the email you captured.
7. As Payroll Officer (staff ID `EMP-PAY-01` / `payroll@school.gh`), open **Payroll** and **Prepare payroll**. The run deducts SSNIT, loans and absence only — not PAYE — then scans for anomalies.
8. As Headteacher, approve a draft only after critical flags are cleared. The Payroll Officer then marks it paid and can download payslips.
9. Open **Reports** for the school snapshot. Use **Salary**, **Flags** and **School** tabs: click a run or department, switch the salary chart metric, then **Download CSV** for the active tab.
10. As Headteacher (`head@school.gh`) or HR (`hr@school.gh`), open **Classes**. Each Grade and JHS card shows the current tutor. Use **Assign teacher**, search, and tap a name. Teachers then see that room under **My class**. **Clear** removes the tutor without deleting the classroom.
11. Open **Parents** as HR or a teacher. Register a household email, link wards, then **Compose** a meeting or **Broadcast to all**. Demo mail is written to the API log unless SMTP is configured. Sign in as `parent@school.gh` to see the in-app notice.
12. Open **Audit trail** as auditor (`auditor@school.gh`) or Headteacher. Click a KPI or a 14-day bar to pin a view, select an event, then open the related payroll run, staff file or flag. Download CSV for the current filter.
