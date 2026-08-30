import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiCreditCard,
  FiHeart,
  FiMapPin,
  FiUser,
} from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const empty = {
  title: 'Mr',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: 'female',
  date_of_birth: '',
  nationality: 'Ghanaian',
  hometown: '',
  region: 'Greater Accra',
  marital_status: 'single',
  ghana_card_number: '',
  phone: '',
  alternate_phone: '',
  email: '',
  residential_address: '',
  digital_address: '',
  employee_id: '',
  portal_role: 'teacher',
  rank: 'Teacher',
  job_title: 'Class Teacher',
  department: 'Lower Primary',
  employment_type: 'GES Permanent',
  first_appointment_date: '',
  assumption_date: '',
  hire_date: '',
  current_posting: 'This basic school',
  highest_qualification: 'Diploma in Basic Education',
  professional_qualification: "Teacher's Certificate A",
  subject_specialization: '',
  years_of_experience: '',
  salary_grade_id: '',
  salary: '',
  salary_type: 'monthly',
  ssnit_number: '',
  tin: '',
  bank_name: '',
  bank_branch: '',
  bank_account: '',
  account_name: '',
  status: 'active',
  next_of_kin_name: '',
  next_of_kin_relationship: '',
  next_of_kin_phone: '',
}

const regions = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
  'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
  'Western', 'Western North',
]

const steps = [
  { id: 'personal', title: 'Personal', hint: 'Bio-data', icon: FiUser, keys: ['first_name', 'last_name', 'gender', 'date_of_birth', 'hometown', 'region'] },
  { id: 'contact', title: 'Contact', hint: 'ID, email & login', icon: FiMapPin, keys: ['ghana_card_number', 'phone', 'email', 'residential_address', 'digital_address'] },
  { id: 'appointment', title: 'Appointment', hint: 'Posting', icon: FiBriefcase, keys: ['employee_id', 'portal_role', 'rank', 'department', 'employment_type', 'assumption_date'] },
  { id: 'payroll', title: 'Payroll', hint: 'Pay & bank', icon: FiCreditCard, keys: ['salary', 'ssnit_number', 'bank_name', 'bank_account'] },
  { id: 'kin', title: 'Next of kin', hint: 'Review', icon: FiHeart, keys: ['next_of_kin_name', 'next_of_kin_phone'] },
]

function Field({ label, children, wide, hint }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function filledCount(form, keys) {
  return keys.filter((key) => String(form[key] ?? '').trim() !== '').length
}

export default function StaffRegisterPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [grades, setGrades] = useState([])
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    api.get('/salary-grades').then(({ data }) => setGrades(data)).catch(() => {})
    if (id) {
      api.get(`/staff/${id}`).then(({ data }) => {
        const next = { ...empty }
        Object.keys(empty).forEach((key) => {
          if (data[key] == null) return
          next[key] = data[key]
        })
        ;['date_of_birth', 'first_appointment_date', 'assumption_date', 'hire_date'].forEach((key) => {
          if (data[key]) next[key] = String(data[key]).slice(0, 10)
        })
        setForm(next)
      })
      return
    }
    api.get('/staff/next-id').then(({ data }) => {
      setForm((current) => ({ ...current, employee_id: data.employee_id }))
    }).catch(() => {})
  }, [id])

  const fullName = [form.title, form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')
  const initials = `${(form.first_name || 'S')[0]}${(form.last_name || 'F')[0]}`.toUpperCase()
  const progress = useMemo(() => {
    const tracked = steps.flatMap((item) => item.keys)
    return Math.round((filledCount(form, tracked) / tracked.length) * 100)
  }, [form])

  const validateStep = (index) => {
    if (index === 0 && (!form.first_name.trim() || !form.last_name.trim())) {
      toast.error('Enter the staff first name and surname to continue')
      return false
    }
    if (index === 1 && !editing && !form.email.trim()) {
      toast.error('Enter the employment email. Staff sign in with this address and their generated staff ID.')
      return false
    }
    if (index === 2 && !form.employee_id.trim()) {
      toast.error('The employee ID is still being generated. Please wait a moment.')
      return false
    }
    if (index === 3 && !form.salary) {
      toast.error('Enter the basic monthly salary to continue')
      return false
    }
    return true
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  const save = async (event) => {
    event.preventDefault()
    if (!validateStep(0) || (!editing && !validateStep(1)) || !validateStep(2) || !validateStep(3)) {
      setStep(!form.first_name.trim() || !form.last_name.trim() ? 0 : !editing && !form.email.trim() ? 1 : !form.employee_id.trim() ? 2 : 3)
      return
    }
    setBusy(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]),
      )
      payload.salary = Number(form.salary || 0)
      payload.hire_date = form.hire_date || form.assumption_date || null
      if (editing) {
        delete payload.portal_role
        await api.put(`/staff/${id}`, payload)
        toast.success('Staff record updated')
      } else {
        const { data } = await api.post('/staff', payload)
        const login = data.portal_login
        toast.success(
          login
            ? `Registered. Staff ID ${login.employee_id} — they sign in with this ID and ${login.email}`
            : 'Staff registered successfully',
        )
      }
      navigate('/staff')
    } catch (error) {
      const firstError = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]?.[0]
        : null
      toast.error(firstError || error.response?.data?.message || 'Could not save staff')
    } finally {
      setBusy(false)
    }
  }

  const pickGrade = (gradeId) => {
    const grade = grades.find((item) => String(item.id) === String(gradeId))
    setForm((current) => ({
      ...current,
      salary_grade_id: gradeId,
      salary: grade ? grade.basic_salary : current.salary,
    }))
  }

  if (!hasRole('hr_officer')) {
    return (
      <div className="card max-w-lg">
        <p className="text-slate-600">Only HR officers can register staff.</p>
        <Link to="/staff" className="mt-4 inline-flex items-center gap-2 text-emerald-800">Back to staff register</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/staff" className="inline-flex items-center gap-2 text-sm text-emerald-800">
            <FiArrowLeft /> Staff register
          </Link>
          <h3 className="mt-2 text-2xl font-semibold text-emerald-950">{editing ? 'Update staff record' : 'Register new staff'}</h3>
          <p className="mt-1 text-sm text-slate-500">GES-style employment file · complete one section at a time</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
          <p className="text-xs uppercase tracking-wide text-slate-400">File completion</p>
          <p className="text-2xl font-semibold text-emerald-900">{progress}%</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <div className="flex min-w-max items-center gap-2">
          {steps.map((item, index) => {
            const Icon = item.icon
            const complete = filledCount(form, item.keys) >= Math.ceil(item.keys.length / 2)
            const active = index === step
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (index <= step || validateStep(step)) setStep(index)
                }}
                className={`flex min-w-[10.5rem] shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition sm:min-w-0 sm:flex-1 ${active ? 'bg-emerald-800 text-white shadow' : complete ? 'tone-success' : 'text-slate-500 hover:bg-stone-50'}`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-full ${active ? 'bg-accent' : complete ? 'tone-success-solid' : 'bg-stone-200 text-slate-600'}`}>
                  {complete && !active ? <FiCheck /> : <Icon />}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{index + 1}. {item.title}</span>
                  <span className={`text-xs ${active ? 'text-emerald-100' : 'text-slate-400'}`}>{item.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <form onSubmit={save} className="grid items-start gap-6 xl:grid-cols-3">
        <div key={step} className="form-step card xl:col-span-2">
          {step === 0 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Personal details</h4>
                <p className="text-sm text-slate-500">As on the Ghana Card and GES personal file.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title">
                  <select className="input" value={form.title} onChange={(e) => set('title', e.target.value)}>
                    {['Mr', 'Mrs', 'Miss', 'Ms', 'Rev', 'Dr'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Gender">
                  <div className="grid grid-cols-2 gap-2">
                    {[['female', 'Female'], ['male', 'Male']].map(([value, label]) => (
                      <button key={value} type="button" onClick={() => set('gender', value)} className={`rounded-xl border px-3 py-2 text-sm ${form.gender === value ? 'border-emerald-700 bg-emerald-50 font-medium text-emerald-950' : 'border-stone-200'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="First name">
                  <input className="input" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Ama" />
                </Field>
                <Field label="Middle name">
                  <input className="input" value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
                </Field>
                <Field label="Surname">
                  <input className="input" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Mensah" />
                </Field>
                <Field label="Date of birth">
                  <input type="date" className="input" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                </Field>
                <Field label="Nationality">
                  <input className="input" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
                </Field>
                <Field label="Marital status">
                  <select className="input" value={form.marital_status} onChange={(e) => set('marital_status', e.target.value)}>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </Field>
                <Field label="Hometown">
                  <input className="input" value={form.hometown} onChange={(e) => set('hometown', e.target.value)} />
                </Field>
                <Field label="Region of origin">
                  <select className="input" value={form.region} onChange={(e) => set('region', e.target.value)}>
                    {regions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Contact and identification</h4>
                <p className="text-sm text-slate-500">Ghana Card, phones and GhanaPost GPS address.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ghana Card number" hint="Format GHA-XXXXXXXXX-X">
                  <input className="input" placeholder="GHA-000000000-0" value={form.ghana_card_number} onChange={(e) => set('ghana_card_number', e.target.value)} />
                </Field>
                <Field label="Staff email" hint="Required. Combined with the generated staff ID for portal sign-in.">
                  <input type="email" className="input" placeholder="name@school.gh" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
                <Field label="Mobile number">
                  <input className="input" placeholder="024XXXXXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                <Field label="Alternate phone">
                  <input className="input" value={form.alternate_phone} onChange={(e) => set('alternate_phone', e.target.value)} />
                </Field>
                <Field label="Residential address" wide>
                  <input className="input" value={form.residential_address} onChange={(e) => set('residential_address', e.target.value)} />
                </Field>
                <Field label="Digital address (GhanaPost GPS)">
                  <input className="input" placeholder="GA-123-4567" value={form.digital_address} onChange={(e) => set('digital_address', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Appointment and posting</h4>
                <p className="text-sm text-slate-500">School posting used for attendance, leave and payroll.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Staff / employee ID" hint="Generated automatically. Other staff sign in with this ID plus their employment email.">
                  <input className="input bg-stone-50 font-medium tracking-wide" value={form.employee_id || 'Generating…'} readOnly />
                </Field>
                {!editing && (
                <Field label="Portal desk" hint="Teachers and accountants cannot self-register. HR uses an officer email login.">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[['teacher', 'Teacher'], ['accountant', 'Accountant']].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set('portal_role', value)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm ${form.portal_role === value ? 'border-emerald-700 bg-emerald-50 font-medium text-emerald-950' : 'border-stone-200'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                )}
                <Field label="Rank">
                  <select className="input" value={form.rank} onChange={(e) => set('rank', e.target.value)}>
                    {['Headteacher', 'Assistant Headteacher', 'Senior Teacher', 'Teacher', 'KG Attendant', 'Clerk', 'Accountant', 'Storekeeper', 'Security', 'Cleaner'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Job title">
                  <input className="input" value={form.job_title} onChange={(e) => set('job_title', e.target.value)} />
                </Field>
                <Field label="Department / unit">
                  <div className="flex flex-wrap gap-2">
                    {['Kindergarten', 'Lower Primary', 'Upper Primary', 'JHS', 'Administration', 'Accounts', 'Ancillary'].map((item) => (
                      <button key={item} type="button" onClick={() => set('department', item)} className={`rounded-full px-3 py-1 text-xs ${form.department === item ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600'}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Employment type">
                  <select className="input" value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
                    {['GES Permanent', 'Contract', 'National Service', 'PTA', 'Volunteer', 'Intern'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Current posting">
                  <input className="input" value={form.current_posting} onChange={(e) => set('current_posting', e.target.value)} />
                </Field>
                <Field label="Date of first appointment">
                  <input type="date" className="input" value={form.first_appointment_date} onChange={(e) => set('first_appointment_date', e.target.value)} />
                </Field>
                <Field label="Date assumed duty">
                  <input type="date" className="input" value={form.assumption_date} onChange={(e) => set('assumption_date', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Payroll, SSNIT and banking</h4>
                <p className="text-sm text-slate-500">Selecting a grade fills the basic salary automatically. You can still edit it.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Highest academic qualification">
                  <select className="input" value={form.highest_qualification} onChange={(e) => set('highest_qualification', e.target.value)}>
                    {['WASSCE', "Teacher's Certificate A", 'Diploma in Basic Education', 'Bachelor of Education', "Bachelor's Degree", "Master's Degree", 'PhD', 'Other'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Professional qualification">
                  <select className="input" value={form.professional_qualification} onChange={(e) => set('professional_qualification', e.target.value)}>
                    {["Teacher's Certificate A", 'Diploma in Basic Education', 'Postgraduate Diploma in Education', 'None'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Subject specialization">
                  <input className="input" placeholder="Mathematics, Early Childhood…" value={form.subject_specialization} onChange={(e) => set('subject_specialization', e.target.value)} />
                </Field>
                <Field label="Years of experience">
                  <input type="number" min="0" className="input" value={form.years_of_experience} onChange={(e) => set('years_of_experience', e.target.value)} />
                </Field>
                <Field label="Salary grade">
                  <select className="input" value={form.salary_grade_id} onChange={(e) => pickGrade(e.target.value)}>
                    <option value="">Select grade</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>{grade.code} · {grade.name} · GHS {Number(grade.basic_salary).toLocaleString()}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Basic monthly salary (GHS)">
                  <input type="number" min="0" step="0.01" className="input" value={form.salary} onChange={(e) => set('salary', e.target.value)} />
                </Field>
                <Field label="SSNIT number">
                  <input className="input" placeholder="CXXXXXXXXXXX" value={form.ssnit_number} onChange={(e) => set('ssnit_number', e.target.value)} />
                </Field>
                <Field label="GRA TIN">
                  <input className="input" value={form.tin} onChange={(e) => set('tin', e.target.value)} />
                </Field>
                <Field label="Bank name">
                  <select className="input" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)}>
                    <option value="">Select bank</option>
                    {['GCB Bank', 'Ecobank', 'Absa', 'Stanbic', 'Fidelity Bank', 'CalBank', 'Zenith Bank', 'Agricultural Development Bank', 'National Investment Bank', 'Republic Bank', 'Other'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Bank branch">
                  <input className="input" value={form.bank_branch} onChange={(e) => set('bank_branch', e.target.value)} />
                </Field>
                <Field label="Account name" hint="Defaults to the staff name if left blank at save">
                  <input className="input" value={form.account_name} onChange={(e) => set('account_name', e.target.value)} placeholder={fullName} />
                </Field>
                <Field label="Account number">
                  <input className="input" value={form.bank_account} onChange={(e) => set('bank_account', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Next of kin and review</h4>
                <p className="text-sm text-slate-500">Confirm the file, then register the staff member onto the payroll.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Next of kin full name">
                  <input className="input" value={form.next_of_kin_name} onChange={(e) => set('next_of_kin_name', e.target.value)} />
                </Field>
                <Field label="Relationship">
                  <select className="input" value={form.next_of_kin_relationship} onChange={(e) => set('next_of_kin_relationship', e.target.value)}>
                    <option value="">Select</option>
                    {['Spouse', 'Parent', 'Sibling', 'Child', 'Guardian', 'Other'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Next of kin phone">
                  <input className="input" value={form.next_of_kin_phone} onChange={(e) => set('next_of_kin_phone', e.target.value)} />
                </Field>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Summary</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-slate-400">Name</dt><dd className="font-medium">{fullName || '—'}</dd></div>
                  <div><dt className="text-slate-400">Staff ID</dt><dd className="font-medium">{form.employee_id || '—'}</dd></div>
                  <div><dt className="text-slate-400">Login email</dt><dd className="font-medium">{form.email || '—'}</dd></div>
                  <div><dt className="text-slate-400">Portal desk</dt><dd className="font-medium capitalize">{(form.portal_role || 'teacher').replace('_', ' ')}</dd></div>
                  <div><dt className="text-slate-400">Posting</dt><dd className="font-medium">{form.rank} · {form.department}</dd></div>
                  <div><dt className="text-slate-400">Salary</dt><dd className="font-medium">{form.salary ? `GHS ${Number(form.salary).toLocaleString()}` : '—'}</dd></div>
                  <div><dt className="text-slate-400">SSNIT</dt><dd className="font-medium">{form.ssnit_number || 'Not captured'}</dd></div>
                  <div><dt className="text-slate-400">Bank</dt><dd className="font-medium">{form.bank_name || 'Not captured'}</dd></div>
                </dl>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-stone-100 disabled:opacity-40" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
              Back
            </button>
            <div className="flex gap-3">
              <Link to="/staff" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-stone-100">Cancel</Link>
              {step < steps.length - 1 ? (
                <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={goNext}>
                  Continue <FiArrowRight />
                </button>
              ) : (
                <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save staff record' : 'Register staff'}</button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="bg-brand overflow-hidden rounded-3xl text-white shadow-lg">
            <div className="id-card-stripe h-16" />
            <div className="-mt-8 px-5 pb-5">
              <div className="bg-accent grid h-16 w-16 place-items-center rounded-2xl text-lg font-bold shadow">
                {initials}
              </div>
              <p className="mt-3 text-lg font-semibold leading-snug">{fullName || 'New staff member'}</p>
              <p className="text-sm text-emerald-200">{form.job_title || 'Awaiting appointment details'}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Staff ID</dt><dd>{form.employee_id || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Unit</dt><dd>{form.department || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Type</dt><dd>{form.employment_type}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Salary</dt><dd>{form.salary ? `GHS ${Number(form.salary).toLocaleString()}` : '—'}</dd></div>
              </dl>
            </div>
          </div>
          <div className="card text-sm">
            <p className="font-semibold text-emerald-950">This step</p>
            <p className="mt-1 text-slate-500">{steps[step].title}: {filledCount(form, steps[step].keys)} of {steps[step].keys.length} key fields filled.</p>
            <p className="mt-3 text-xs text-slate-400">Required to finish: first name, surname, employment email, staff ID and basic salary. The staff member then signs in with the generated ID and that email.</p>
          </div>
        </aside>
      </form>
    </div>
  )
}
