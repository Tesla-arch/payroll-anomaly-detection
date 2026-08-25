<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AllowanceType;
use App\Models\Loan;
use App\Models\Staff;
use App\Models\StaffAllowance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompensationController extends Controller
{
    public function allowanceTypes(): JsonResponse
    {
        return response()->json(AllowanceType::query()->orderBy('name')->get());
    }

    public function storeAllowance(Request $request, Staff $staff): JsonResponse
    {
        $data = $request->validate([
            'allowance_type_id' => ['required', 'exists:allowance_types,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'is_authorized' => ['nullable', 'boolean'],
        ]);

        $allowance = $staff->allowances()->create($data);

        return response()->json($allowance->load('allowanceType'), 201);
    }

    public function destroyAllowance(StaffAllowance $staffAllowance): JsonResponse
    {
        $staffAllowance->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function storeLoan(Request $request, Staff $staff): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['nullable', 'string', 'max:50'],
            'principal' => ['required', 'numeric', 'min:0'],
            'outstanding_balance' => ['nullable', 'numeric', 'min:0'],
            'monthly_deduction' => ['required', 'numeric', 'min:0'],
            'issued_on' => ['nullable', 'date'],
        ]);

        $loan = $staff->loans()->create([
            ...$data,
            'outstanding_balance' => $data['outstanding_balance'] ?? $data['principal'],
            'status' => 'active',
        ]);

        return response()->json($loan, 201);
    }

    public function loans(Staff $staff): JsonResponse
    {
        return response()->json($staff->loans()->latest()->get());
    }

    public function updateLoan(Request $request, Loan $loan): JsonResponse
    {
        $loan->update($request->validate([
            'outstanding_balance' => ['sometimes', 'numeric', 'min:0'],
            'monthly_deduction' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', 'in:active,closed'],
        ]));

        return response()->json($loan);
    }
}
