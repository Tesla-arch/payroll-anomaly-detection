<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\Staff;
use App\Models\StaffAttendance;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StaffAttendance::query()->with('staff.user');

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->integer('staff_id'));
        }

        if ($request->filled('from')) {
            $query->whereDate('date', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('date', '<=', $request->date('to'));
        }

        return response()->json($query->orderByDesc('date')->orderBy('staff_id')->paginate(40));
    }

    public function roll(Request $request): JsonResponse
    {
        $date = $request->filled('date') ? $request->date('date') : now();

        $staff = Staff::query()
            ->where('status', 'active')
            ->with(['user', 'attendances' => fn ($query) => $query->whereDate('date', $date)])
            ->orderBy('department')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $leave = LeaveRequest::query()
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->get()
            ->keyBy('staff_id');

        $rows = $staff->map(function (Staff $member) use ($leave) {
            $row = $member->attendances->first();
            $approved = $leave->get($member->id);

            return [
                'staff_id' => $member->id,
                'employee_id' => $member->employee_id,
                'display_name' => $member->display_name,
                'department' => $member->department,
                'job_title' => $member->job_title ?: $member->rank,
                'status' => $row?->status ?? ($approved ? 'on_leave' : null),
                'check_in_time' => $this->timeValue($row?->check_in_time),
                'check_out_time' => $this->timeValue($row?->check_out_time),
                'hours_worked' => $row?->hours_worked,
                'on_approved_leave' => (bool) $approved,
                'leave_type' => $approved?->leave_type,
            ];
        })->values();

        $marked = $rows->filter(fn ($row) => filled($row['status']));

        return response()->json([
            'date' => $date->toDateString(),
            'can_mark' => true,
            'summary' => [
                'roll' => $rows->count(),
                'present' => $marked->whereIn('status', ['present', 'late'])->count(),
                'late' => $marked->where('status', 'late')->count(),
                'absent' => $marked->where('status', 'absent')->count(),
                'on_leave' => $marked->whereIn('status', ['on_leave', 'unpaid_leave'])->count(),
                'unmarked' => $rows->count() - $marked->count(),
            ],
            'staff' => $rows,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedRecord($request);
        $attendance = StaffAttendance::query()->updateOrCreate(
            ['staff_id' => $data['staff_id'], 'date' => $data['date']],
            $this->prepared($data),
        );

        return response()->json($attendance->load('staff.user'), 201);
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.staff_id' => ['required', 'exists:staff,id'],
            'records.*.status' => ['required', 'in:present,absent,late,on_leave,unpaid_leave'],
            'records.*.check_in_time' => ['nullable', 'date_format:H:i'],
            'records.*.check_out_time' => ['nullable', 'date_format:H:i'],
        ]);

        foreach ($data['records'] as $record) {
            StaffAttendance::query()->updateOrCreate(
                ['staff_id' => $record['staff_id'], 'date' => $data['date']],
                $this->prepared([...$record, 'date' => $data['date']]),
            );
        }

        $request->merge(['date' => $data['date']]);

        return $this->roll($request);
    }

    public function summary(Request $request): JsonResponse
    {
        $from = $request->date('from') ?? now()->startOfMonth();
        $to = $request->date('to') ?? now()->endOfMonth();

        $staff = Staff::query()->where('status', 'active')->with(['user', 'attendances' => function ($q) use ($from, $to) {
            $q->whereBetween('date', [$from, $to]);
        }])->get();

        return response()->json($staff->map(fn (Staff $member) => [
            'staff_id' => $member->id,
            'employee_id' => $member->employee_id,
            'name' => $member->display_name,
            'present' => $member->attendances->whereIn('status', ['present', 'late'])->count(),
            'absent' => $member->attendances->where('status', 'absent')->count(),
            'leave' => $member->attendances->where('status', 'on_leave')->count(),
            'penalties' => $member->attendances->sum('penalty_amount'),
        ]));
    }

    protected function validatedRecord(Request $request): array
    {
        return $request->validate([
            'staff_id' => ['required', 'exists:staff,id'],
            'date' => ['required', 'date'],
            'check_in_time' => ['nullable', 'date_format:H:i'],
            'check_out_time' => ['nullable', 'date_format:H:i'],
            'hours_worked' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:present,absent,late,on_leave,unpaid_leave'],
            'penalty_amount' => ['nullable', 'numeric', 'min:0'],
        ]);
    }

    protected function prepared(array $data): array
    {
        $status = $data['status'];
        if (in_array($status, ['absent', 'on_leave', 'unpaid_leave'], true)) {
            $data['check_in_time'] = null;
            $data['check_out_time'] = null;
            $data['hours_worked'] = 0;
        } else {
            $data['hours_worked'] = $this->hoursBetween($data['check_in_time'] ?? null, $data['check_out_time'] ?? null);
        }

        return $data;
    }

    protected function hoursBetween(?string $in, ?string $out): ?float
    {
        if (! $in || ! $out) {
            return null;
        }

        $start = Carbon::createFromFormat('H:i', substr($in, 0, 5));
        $end = Carbon::createFromFormat('H:i', substr($out, 0, 5));
        if ($end->lessThan($start)) {
            $end->addDay();
        }

        return round($start->diffInMinutes($end) / 60, 2);
    }

    protected function timeValue(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        return substr((string) $value, 0, 5);
    }
}
