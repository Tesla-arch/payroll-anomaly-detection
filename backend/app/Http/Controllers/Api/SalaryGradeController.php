<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalaryGrade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryGradeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(SalaryGrade::query()->orderBy('code')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:30', 'unique:salary_grades,code'],
            'name' => ['required', 'string', 'max:100'],
            'basic_salary' => ['required', 'numeric', 'min:0'],
            'max_allowance_total' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        return response()->json(SalaryGrade::query()->create($data), 201);
    }

    public function update(Request $request, SalaryGrade $salaryGrade): JsonResponse
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:30', 'unique:salary_grades,code,'.$salaryGrade->id],
            'name' => ['sometimes', 'string', 'max:100'],
            'basic_salary' => ['sometimes', 'numeric', 'min:0'],
            'max_allowance_total' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $salaryGrade->update($data);

        return response()->json($salaryGrade);
    }
}
