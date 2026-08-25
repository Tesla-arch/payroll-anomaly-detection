<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\Staff;
use App\Support\Auditor;
use App\Support\LeaveCatalogue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class LeaveRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LeaveRequest::query()->with(['staff.user', 'reviewer', 'approver']);
        $user = $request->user();

        if ($user->hasRole('teacher') && $user->staff) {
            $query->where('staff_id', $user->staff->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function types(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('staff');
        $staffId = $user->staff?->id;

        if ($request->filled('staff_id') && ($user->isSuperAdmin() || $user->hasRole('hr_officer'))) {
            $staffId = (int) $request->integer('staff_id');
        }

        $staff = $staffId ? Staff::query()->with('user')->find($staffId) : $user->staff;

        return response()->json([
            'staff' => $staff ? [
                'id' => $staff->id,
                'employee_id' => $staff->employee_id,
                'display_name' => $staff->display_name ?: $staff->user?->name,
                'department' => $staff->department,
                'job_title' => $staff->job_title,
            ] : null,
            'types' => $staff ? LeaveCatalogue::balances($staff->id) : array_values(LeaveCatalogue::TYPES),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'staff_id' => ['nullable', 'exists:staff,id'],
            'leave_type' => ['required', 'in:'.implode(',', LeaveCatalogue::codes())],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'contact_address' => ['nullable', 'string', 'max:255'],
            'handover_to' => ['nullable', 'string', 'max:160'],
            'duties_handed_over' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user()->loadMissing('staff');
        $ownStaffId = $user->staff?->id;
        $canApplyForOthers = $user->isSuperAdmin() || $user->hasRole('hr_officer');

        if ($canApplyForOthers) {
            $staffId = $data['staff_id'] ?? $ownStaffId;
        } else {
            if (! empty($data['staff_id']) && (int) $data['staff_id'] !== (int) $ownStaffId) {
                throw ValidationException::withMessages(['staff_id' => 'You can only request leave for your own staff record.']);
            }
            $staffId = $ownStaffId;
        }

        if (! $staffId) {
            throw ValidationException::withMessages(['staff_id' => 'Your account is not linked to a staff record.']);
        }

        $policy = LeaveCatalogue::get($data['leave_type']);
        $start = $request->date('start_date');
        $end = $request->date('end_date');
        $days = LeaveCatalogue::countDays($start, $end, $policy['count']);

        if ($days < 1) {
            throw ValidationException::withMessages(['end_date' => 'The selected dates do not include any countable leave days.']);
        }

        if ($days > $policy['max_per_request']) {
            throw ValidationException::withMessages([
                'end_date' => $policy['name'].' can be requested for at most '.$policy['max_per_request'].' days at a time.',
            ]);
        }

        $remaining = $policy['entitlement'] - LeaveCatalogue::usedDays($staffId, $data['leave_type']);
        if ($days > $remaining) {
            throw ValidationException::withMessages([
                'leave_type' => 'You have '.$remaining.' of '.$policy['entitlement'].' '.$policy['name'].' days remaining this year.',
            ]);
        }

        if ($policy['requires_note'] && blank($data['reason'] ?? null)) {
            throw ValidationException::withMessages(['reason' => 'State the reason for this '.$policy['name'].'.']);
        }

        $leave = LeaveRequest::query()->create([
            'staff_id' => $staffId,
            'leave_type' => $data['leave_type'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'days_requested' => $days,
            'reason' => $data['reason'] ?? null,
            'contact_phone' => $data['contact_phone'] ?? null,
            'contact_address' => $data['contact_address'] ?? null,
            'handover_to' => $data['handover_to'] ?? null,
            'duties_handed_over' => $data['duties_handed_over'] ?? null,
            'status' => 'pending_hr',
        ]);

        Auditor::log('leave.requested', $leave, [], $request->user(), $request);

        return response()->json($leave->load('staff.user'), 201);
    }

    public function review(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:forward,reject'],
            'review_notes' => ['nullable', 'string'],
        ]);

        if ($leaveRequest->status !== 'pending_hr') {
            throw ValidationException::withMessages(['status' => 'Only HR-pending requests can be reviewed.']);
        }

        $leaveRequest->update([
            'status' => $data['decision'] === 'forward' ? 'pending_headteacher' : 'rejected',
            'reviewed_by' => $request->user()->id,
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        Auditor::log('leave.reviewed', $leaveRequest, $data, $request->user(), $request);

        return response()->json($leaveRequest->fresh(['staff.user', 'reviewer']));
    }

    public function approve(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'review_notes' => ['nullable', 'string'],
        ]);

        if ($leaveRequest->status !== 'pending_headteacher') {
            throw ValidationException::withMessages(['status' => 'Only Headteacher-pending requests can be approved.']);
        }

        $approved = $data['decision'] === 'approve';
        $leaveRequest->update([
            'status' => $approved ? 'approved' : 'rejected',
            'approved_by' => $request->user()->id,
            'payroll_notified' => $approved,
            'review_notes' => $data['review_notes'] ?? $leaveRequest->review_notes,
        ]);

        Auditor::log('leave.'.$data['decision'], $leaveRequest, [], $request->user(), $request);

        return response()->json($leaveRequest->fresh(['staff.user', 'approver']));
    }
}
