<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Student::query()->with(['schoolClass', 'parent']);

        if ($user->hasRole('parent')) {
            $query->where('parent_id', $user->id);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('admission_number', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('guardian_name', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('last_name')->paginate(20));
    }

    public function nextId(): JsonResponse
    {
        return response()->json(['admission_number' => Student::nextAdmissionNumber()]);
    }

    public function store(Request $request): JsonResponse
    {
        $student = Student::query()->create($this->payload($request));

        return response()->json($student->load('schoolClass'), 201);
    }

    public function show(Request $request, Student $student): JsonResponse
    {
        if ($request->user()->hasRole('parent') && $student->parent_id !== $request->user()->id) {
            abort(403);
        }

        return response()->json($student->load(['schoolClass', 'parent']));
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $student->update($this->payload($request, $student));

        return response()->json($student->load('schoolClass'));
    }

    public function classes(): JsonResponse
    {
        return response()->json(
            SchoolClass::query()->withCount('students')->orderBy('sort_order')->orderBy('name')->get()
        );
    }

    public function storeClass(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'level' => ['nullable', 'string', 'max:50'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'teacher_id' => ['nullable', 'exists:staff,id'],
        ]);

        return response()->json(SchoolClass::query()->create($data), 201);
    }

    protected function payload(Request $request, ?Student $student = null): array
    {
        $data = $this->validated($request, $student);

        if (empty($data['admission_number']) || Student::query()
            ->where('admission_number', $data['admission_number'])
            ->when($student, fn ($query) => $query->where('id', '!=', $student->id))
            ->exists()) {
            $data['admission_number'] = Student::nextAdmissionNumber();
        }

        if (empty($data['phone_number']) && ! empty($data['guardian_phone'])) {
            $data['phone_number'] = $data['guardian_phone'];
        }

        if (! $student) {
            $data['status'] = 'active';
        } else {
            unset($data['status']);
        }

        return $data;
    }

    protected function validated(Request $request, ?Student $student = null): array
    {
        $id = $student?->id;

        return $request->validate([
            'admission_number' => ['nullable', 'string', 'max:50', 'unique:students,admission_number,'.($id ?? 'NULL')],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['nullable', 'in:male,female'],
            'date_of_birth' => ['nullable', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:120'],
            'nationality' => ['nullable', 'string', 'max:80'],
            'hometown' => ['nullable', 'string', 'max:120'],
            'region' => ['nullable', 'string', 'max:80'],
            'religion' => ['nullable', 'string', 'max:80'],
            'birth_certificate_number' => ['nullable', 'string', 'max:80'],
            'previous_school' => ['nullable', 'string', 'max:160'],
            'admission_date' => ['nullable', 'date'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'residential_address' => ['nullable', 'string', 'max:255'],
            'digital_address' => ['nullable', 'string', 'max:40'],
            'class_id' => ['nullable', 'exists:school_classes,id'],
            'parent_id' => ['nullable', 'exists:users,id'],
            'guardian_name' => ['nullable', 'string', 'max:160'],
            'guardian_relationship' => ['nullable', 'string', 'max:40'],
            'guardian_occupation' => ['nullable', 'string', 'max:120'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'guardian_address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:160'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'nhis_number' => ['nullable', 'string', 'max:40'],
            'allergies' => ['nullable', 'string', 'max:255'],
            'special_needs' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
