import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StaffPage from './pages/StaffPage'
import StaffRegisterPage from './pages/StaffRegisterPage'
import StudentsPage from './pages/StudentsPage'
import ParentsPage from './pages/ParentsPage'
import StudentRegisterPage from './pages/StudentRegisterPage'
import StudentAssessmentPage from './pages/StudentAssessmentPage'
import MyClassPage from './pages/MyClassPage'
import AttendancePage from './pages/AttendancePage'
import LeavePage from './pages/LeavePage'
import LeaveRequestPage from './pages/LeaveRequestPage'
import PayrollPage from './pages/PayrollPage'
import PayrollPreparePage from './pages/PayrollPreparePage'
import PayrollDetailPage from './pages/PayrollDetailPage'
import AnomaliesPage from './pages/AnomaliesPage'
import AnomalyDetailPage from './pages/AnomalyDetailPage'
import ReportsPage from './pages/ReportsPage'
import AuditPage from './pages/AuditPage'
import UsersPage from './pages/UsersPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="my-class" element={<MyClassPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/register" element={<StaffRegisterPage />} />
            <Route path="staff/:id/edit" element={<StaffRegisterPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="parents" element={<ProtectedRoute roles={['headteacher', 'hr_officer', 'teacher']}><ParentsPage /></ProtectedRoute>} />
            <Route path="students/register" element={<StudentRegisterPage />} />
            <Route path="students/:id/assessment" element={<StudentAssessmentPage />} />
            <Route path="students/:id/edit" element={<StudentRegisterPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="leave/request" element={<LeaveRequestPage />} />
            <Route path="payroll" element={<ProtectedRoute roles={['headteacher', 'payroll_officer', 'accountant', 'auditor']}><PayrollPage /></ProtectedRoute>} />
            <Route path="payroll/prepare" element={<ProtectedRoute roles={['payroll_officer']}><PayrollPreparePage /></ProtectedRoute>} />
            <Route path="payroll/:id" element={<ProtectedRoute roles={['headteacher', 'payroll_officer', 'accountant', 'auditor', 'hr_officer']}><PayrollDetailPage /></ProtectedRoute>} />
            <Route path="anomalies" element={<ProtectedRoute roles={['headteacher', 'payroll_officer', 'accountant', 'auditor', 'hr_officer']}><AnomaliesPage /></ProtectedRoute>} />
            <Route path="anomalies/:id" element={<ProtectedRoute roles={['headteacher', 'payroll_officer', 'accountant', 'auditor', 'hr_officer']}><AnomalyDetailPage /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute roles={['headteacher', 'payroll_officer', 'accountant', 'auditor']}><ReportsPage /></ProtectedRoute>} />
            <Route path="audit" element={<ProtectedRoute roles={['auditor', 'headteacher', 'super_admin']}><AuditPage /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute roles={['super_admin']}><UsersPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
