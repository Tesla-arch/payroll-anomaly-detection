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
        $female = fake()->boolean();
        $first = fake()->randomElement($female ? self::FEMALE_FIRST : self::MALE_FIRST);
        $last = fake()->randomElement(self::LAST);
        $guardianFirst = fake()->randomElement($female ? self::MALE_FIRST : self::FEMALE_FIRST);
        $guardianLast = fake()->randomElement(self::LAST);
        $guardian = trim($guardianFirst.' '.$guardianLast);
        $phone = '0'.fake()->randomElement(['24', '20', '54', '55', '26', '27']).fake()->numerify('#######');
        $town = fake()->randomElement(self::TOWNS);
        $birthYear = $this->birthYear($class->name);

        return Student::query()->create([
            'admission_number' => Student::nextAdmissionNumber(),
            'first_name' => $first,
            'middle_name' => fake()->randomElement(self::MIDDLE),
            'last_name' => $last,
            'gender' => $female ? 'female' : 'male',
            'date_of_birth' => sprintf('%d-%02d-%02d', $birthYear, fake()->numberBetween(1, 12), fake()->numberBetween(1, 28)),
            'place_of_birth' => fake()->randomElement(self::HOMETOWNS),
            'nationality' => 'Ghanaian',
            'hometown' => fake()->randomElement(self::HOMETOWNS),
            'region' => fake()->randomElement(self::REGIONS),
            'religion' => fake()->randomElement(['Christian', 'Muslim', 'Christian', 'Christian']),
            'birth_certificate_number' => 'BC-'.fake()->numerify('########'),
            'previous_school' => fake()->optional(0.35)->randomElement(['Local KG', 'Community primary', 'Private nursery']),
            'admission_date' => sprintf('%d-09-%02d', $birthYear + 6, fake()->numberBetween(1, 15)),
            'phone_number' => $phone,
            'residential_address' => $town,
            'digital_address' => 'GA-'.fake()->numerify('###').'-'.fake()->numerify('####'),
            'class_id' => $class->id,
            'parent_id' => $parentIds && fake()->boolean(40) ? fake()->randomElement($parentIds) : null,
            'guardian_name' => $guardian,
            'guardian_relationship' => fake()->randomElement(self::RELATIONSHIPS),
            'guardian_occupation' => fake()->randomElement(self::OCCUPATIONS),
            'guardian_phone' => $phone,
            'guardian_address' => $town,
            'emergency_contact_name' => $guardian,
            'emergency_contact_phone' => $phone,
            'blood_group' => fake()->randomElement(['O+', 'A+', 'B+', 'O+', 'AB+', 'O-']),
            'nhis_number' => fake()->numerify('##########'),
            'allergies' => fake()->optional(0.12)->randomElement(['Groundnut', 'Dust', 'None recorded']),
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
}
