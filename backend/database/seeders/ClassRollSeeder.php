<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;

class ClassRollSeeder extends Seeder
{
    public const PER_CLASS = 25;

    private const MALE_FIRST = [
        'Kwame', 'Kofi', 'Kwesi', 'Yaw', 'Kojo', 'Kwabena', 'Fiifi', 'Papa', 'Nana', 'Kwadwo',
        'Kwaku', 'Kobina', 'Ebo', 'Kweku', 'Yaw',
    ];

    private const FEMALE_FIRST = [
        'Ama', 'Akosua', 'Abena', 'Adwoa', 'Afia', 'Akua', 'Esi', 'Efua', 'Aba', 'Yaa',
        'Awo', 'Araba', 'Adjoa', 'Serwaa', 'Ama',
    ];

    private const LAST = [
        'Mensah', 'Owusu', 'Boateng', 'Asante', 'Appiah', 'Darko', 'Adjei', 'Sarpong', 'Nyarko', 'Osei',
        'Agyeman', 'Amoah', 'Opoku', 'Frimpong', 'Addo', 'Danso', 'Ankrah', 'Tetteh', 'Quaye', 'Lamptey',
    ];

    private const MIDDLE = ['Nana', 'Kwadwo', 'Serwaa', 'Akua', 'Yaw', 'Adjoa', null, null];

    private const TOWNS = [
        'Adenta, Accra', 'Madina, Accra', 'East Legon, Accra', 'Dansoman, Accra', 'Kaneshie, Accra',
        'Tema Community 5', 'Ashaiman', 'Achimota, Accra', 'Spintex, Accra', 'Dome, Accra',
        'Haatso, Accra', 'Teshie, Accra', 'Nungua, Accra', 'Kasoa', 'Dodowa',
    ];

    private const REGIONS = [
        'Greater Accra', 'Ashanti', 'Eastern', 'Central', 'Volta', 'Western', 'Northern',
    ];

    private const HOMETOWNS = [
        'Kumasi', 'Cape Coast', 'Koforidua', 'Tamale', 'Ho', 'Takoradi', 'Sunyani', 'Accra', 'Nkawkaw', 'Winneba',
    ];

    private const OCCUPATIONS = [
        'Trader', 'Teacher', 'Driver', 'Nurse', 'Mason', 'Seamstress', 'Civil servant', 'Farmer', 'Shopkeeper', 'Mechanic',
    ];

    private const RELATIONSHIPS = ['Mother', 'Father', 'Auntie', 'Uncle', 'Grandmother', 'Guardian'];

    public function run(): void
    {
        SchoolClass::syncCatalogue();

        $parentIds = User::query()
            ->whereHas('role', fn ($role) => $role->where('slug', 'parent'))
            ->pluck('id')
            ->all();

        $created = 0;

        foreach (SchoolClass::query()->orderBy('sort_order')->get() as $class) {
            $needed = self::PER_CLASS - $class->students()->count();
            if ($needed <= 0) {
                continue;
            }

            for ($index = 0; $index < $needed; $index++) {
                $this->enrol($class, $parentIds);
                $created++;
            }
        }

        $this->command?->info("Enrolled {$created} pupil".($created === 1 ? '' : 's').' so each class has '.self::PER_CLASS.'.');
    }

    private function enrol(SchoolClass $class, array $parentIds): Student
    {
        $female = $this->chance(50);
        $first = $this->pick($female ? self::FEMALE_FIRST : self::MALE_FIRST);
        $last = $this->pick(self::LAST);
        $guardianFirst = $this->pick($female ? self::MALE_FIRST : self::FEMALE_FIRST);
        $guardianLast = $this->pick(self::LAST);
        $guardian = trim($guardianFirst.' '.$guardianLast);
        $phone = '0'.$this->pick(['24', '20', '54', '55', '26', '27']).$this->digits(7);
        $town = $this->pick(self::TOWNS);
        $birthYear = $this->birthYear($class->name);

        return Student::query()->create([
            'admission_number' => Student::nextAdmissionNumber(),
            'first_name' => $first,
            'middle_name' => $this->pick(self::MIDDLE),
            'last_name' => $last,
            'gender' => $female ? 'female' : 'male',
            'date_of_birth' => sprintf('%d-%02d-%02d', $birthYear, random_int(1, 12), random_int(1, 28)),
            'place_of_birth' => $this->pick(self::HOMETOWNS),
            'nationality' => 'Ghanaian',
            'hometown' => $this->pick(self::HOMETOWNS),
            'region' => $this->pick(self::REGIONS),
            'religion' => $this->pick(['Christian', 'Muslim', 'Christian', 'Christian']),
            'birth_certificate_number' => 'BC-'.$this->digits(8),
            'previous_school' => $this->chance(35)
                ? $this->pick(['Local KG', 'Community primary', 'Private nursery'])
                : null,
            'admission_date' => sprintf('%d-09-%02d', $birthYear + 6, random_int(1, 15)),
            'phone_number' => $phone,
            'residential_address' => $town,
            'digital_address' => 'GA-'.$this->digits(3).'-'.$this->digits(4),
            'class_id' => $class->id,
            'parent_id' => $parentIds && $this->chance(40) ? $this->pick($parentIds) : null,
            'guardian_name' => $guardian,
            'guardian_relationship' => $this->pick(self::RELATIONSHIPS),
            'guardian_occupation' => $this->pick(self::OCCUPATIONS),
            'guardian_phone' => $phone,
            'guardian_address' => $town,
            'emergency_contact_name' => $guardian,
            'emergency_contact_phone' => $phone,
            'blood_group' => $this->pick(['O+', 'A+', 'B+', 'O+', 'AB+', 'O-']),
            'nhis_number' => $this->digits(10),
            'allergies' => $this->chance(12)
                ? $this->pick(['Groundnut', 'Dust', 'None recorded'])
                : null,
            'special_needs' => null,
            'status' => 'active',
        ]);
    }

    private function birthYear(string $className): int
    {
        return match ($className) {
            'Grade 1' => 2019,
            'Grade 2' => 2018,
            'Grade 3' => 2017,
            'Grade 4' => 2016,
            'Grade 5' => 2015,
            'Grade 6' => 2014,
            'JHS 1' => 2013,
            'JHS 2' => 2012,
            'JHS 3' => 2011,
            default => 2016,
        };
    }

    /** @param  list<mixed>  $items */
    private function pick(array $items): mixed
    {
        return $items[array_rand($items)];
    }

    private function chance(int $percent): bool
    {
        return random_int(1, 100) <= $percent;
    }

    private function digits(int $length): string
    {
        $out = '';
        for ($i = 0; $i < $length; $i++) {
            $out .= (string) random_int(0, 9);
        }

        return $out;
    }
}
