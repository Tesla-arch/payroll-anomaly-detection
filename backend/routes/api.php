<?php

use App\Http\Controllers\Api\AnomalyController;
use App\Http\Controllers\Api\AssessmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\CompensationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\MyClassController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PayrollRunController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SalaryGradeController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::get('/auth/register-roles', [AuthController::class, 'registerRoles']);
Route::get('/auth/captcha', [AuthController::class, 'captcha']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/login/staff', [AuthController::class, 'loginStaff']);
Route::post('/auth/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);
    Route::get('/dashboard', DashboardController::class);

    Route::get('/notifications', [ReportController::class, 'notifications']);
    Route::post('/notifications/{notification}/read', [ReportController::class, 'markNotificationRead']);

    Route::middleware('role:super_admin')->group(function () {
        Route::get('/users/summary', [UserController::class, 'summary']);
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::get('/roles', [UserController::class, 'roles']);
    });

    Route::middleware('role:super_admin,headteacher,hr_officer,payroll_officer,accountant,auditor')->group(function () {
        Route::get('/staff', [StaffController::class, 'index']);
        Route::get('/staff/next-id', [StaffController::class, 'nextId']);
        Route::get('/staff/{staff}', [StaffController::class, 'show']);
        Route::get('/salary-grades', [SalaryGradeController::class, 'index']);
        Route::get('/allowance-types', [CompensationController::class, 'allowanceTypes']);
    });

    Route::middleware('role:super_admin,hr_officer')->group(function () {
        Route::post('/staff', [StaffController::class, 'store']);
        Route::put('/staff/{staff}', [StaffController::class, 'update']);
        Route::post('/staff/{staff}/deactivate', [StaffController::class, 'deactivate']);
        Route::post('/salary-grades', [SalaryGradeController::class, 'store']);
        Route::put('/salary-grades/{salaryGrade}', [SalaryGradeController::class, 'update']);
        Route::post('/staff/{staff}/allowances', [CompensationController::class, 'storeAllowance']);
        Route::delete('/staff-allowances/{staffAllowance}', [CompensationController::class, 'destroyAllowance']);
        Route::post('/staff/{staff}/loans', [CompensationController::class, 'storeLoan']);
        Route::get('/staff/{staff}/loans', [CompensationController::class, 'loans']);
        Route::put('/loans/{loan}', [CompensationController::class, 'updateLoan']);
    });

    Route::middleware('role:super_admin,headteacher,hr_officer,teacher,parent')->group(function () {
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/students/next-id', [StudentController::class, 'nextId']);
        Route::get('/students/{student}/assessment/pdf', [AssessmentController::class, 'pdf']);
        Route::get('/students/{student}/assessment', [AssessmentController::class, 'show']);
        Route::get('/students/{student}', [StudentController::class, 'show']);
        Route::get('/classes', [ClassController::class, 'index']);
    });

    Route::middleware('role:super_admin,teacher')->group(function () {
        Route::get('/my-class', [MyClassController::class, 'index']);
        Route::get('/my-class/{schoolClass}', [MyClassController::class, 'show']);
        Route::put('/my-class/{schoolClass}/attendance', [MyClassController::class, 'saveAttendance']);
        Route::put('/students/{student}/assessment', [AssessmentController::class, 'update']);
    });

    Route::middleware('role:super_admin,headteacher,hr_officer')->group(function () {
        Route::get('/classes/teachers', [ClassController::class, 'teachers']);
        Route::get('/classes/jhs-subjects', [ClassController::class, 'jhsSubjects']);
        Route::put('/classes/jhs-subjects/{subject}/teacher', [ClassController::class, 'assignJhsSubject']);
        Route::put('/classes/{schoolClass}/teacher', [ClassController::class, 'assignTeacher']);
    });

    Route::middleware('role:super_admin,hr_officer,teacher')->group(function () {
        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{student}', [StudentController::class, 'update']);
        Route::post('/classes', [ClassController::class, 'store']);
    });

    Route::middleware('role:super_admin,headteacher,hr_officer,teacher,parent')->get('/parent-messages', [ParentController::class, 'messages']);

    Route::middleware('role:super_admin,headteacher,hr_officer,teacher')->group(function () {
        Route::get('/parents', [ParentController::class, 'index']);
        Route::get('/parents/{parent}', [ParentController::class, 'show']);
        Route::post('/parent-messages', [ParentController::class, 'send']);
    });

    Route::middleware('role:super_admin,headteacher,hr_officer')->group(function () {
        Route::post('/parents', [ParentController::class, 'store']);
        Route::put('/parents/{parent}', [ParentController::class, 'update']);
    });

    Route::middleware('role:super_admin,hr_officer,teacher,headteacher,payroll_officer')->group(function () {
        Route::get('/attendance', [AttendanceController::class, 'index']);
        Route::get('/attendance/roll', [AttendanceController::class, 'roll']);
        Route::get('/attendance/summary', [AttendanceController::class, 'summary']);
        Route::post('/attendance', [AttendanceController::class, 'store']);
        Route::post('/attendance/bulk', [AttendanceController::class, 'bulk']);
    });

    Route::get('/leave-types', [LeaveRequestController::class, 'types']);
    Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
    Route::middleware('role:super_admin,hr_officer')->post('/leave-requests/{leaveRequest}/review', [LeaveRequestController::class, 'review']);
    Route::middleware('role:super_admin,headteacher')->post('/leave-requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve']);

    Route::middleware('role:super_admin,headteacher,payroll_officer,accountant,auditor')->group(function () {
        Route::get('/payroll-runs', [PayrollRunController::class, 'index']);
        Route::get('/payroll-runs/{payrollRun}', [PayrollRunController::class, 'show']);
        Route::get('/payrolls/{payroll}/payslip', [PayrollRunController::class, 'payslip']);
        Route::get('/reports/overview', [ReportController::class, 'overview']);
        Route::get('/reports/payroll', [ReportController::class, 'payrollSummary']);
        Route::get('/reports/anomalies', [ReportController::class, 'anomalyTrends']);
    });

    Route::middleware('role:super_admin,headteacher,payroll_officer,accountant,auditor,hr_officer')->group(function () {
        Route::get('/anomalies/summary', [AnomalyController::class, 'summary']);
        Route::get('/anomalies', [AnomalyController::class, 'index']);
        Route::get('/anomalies/{payrollAnomaly}', [AnomalyController::class, 'show']);
    });

    Route::middleware('role:super_admin,hr_officer')->get('/payroll-runs/{payrollRun}', [PayrollRunController::class, 'show']);

    Route::middleware('role:super_admin,payroll_officer,headteacher')->group(function () {
        Route::post('/payrolls/{payroll}/exclude', [PayrollRunController::class, 'exclude']);
        Route::post('/payrolls/{payroll}/restore', [PayrollRunController::class, 'restore']);
    });

    Route::middleware('role:super_admin,payroll_officer')->group(function () {
        Route::post('/payroll-runs', [PayrollRunController::class, 'store']);
        Route::post('/payroll-runs/{payrollRun}/cancel', [PayrollRunController::class, 'cancel']);
        Route::post('/payroll-runs/{payrollRun}/rescan', [AnomalyController::class, 'rescan']);
        Route::post('/payroll-runs/{payrollRun}/paid', [PayrollRunController::class, 'markPaid']);
        Route::post('/payrolls/{payroll}/recalculate', [PayrollRunController::class, 'recalculate']);
    });

    Route::middleware('role:super_admin,headteacher')->post('/payroll-runs/{payrollRun}/approve', [PayrollRunController::class, 'approve']);

    Route::middleware('role:super_admin,payroll_officer,auditor,headteacher')->post('/anomalies/{payrollAnomaly}/resolve', [AnomalyController::class, 'resolve']);

    Route::middleware('role:super_admin,auditor,headteacher')->group(function () {
        Route::get('/audit-logs/summary', [AuditLogController::class, 'summary']);
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });
});
