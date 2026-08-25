import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheck,
  FiHeart,
  FiHome,
  FiUser,
} from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const classLevels = ['Lower Primary', 'Upper Primary', 'Junior High']

const regions = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
  'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
  'Western', 'Western North',
]

const empty = {
  admission_number: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: 'female',
  date_of_birth: '',
  place_of_birth: '',
  nationality: 'Ghanaian',
  hometown: '',
  region: 'Greater Accra',
  religion: 'Christianity',
  birth_certificate_number: '',
  previous_school: '',
  admission_date: new Date().toISOString().slice(0, 10),
  residential_address: '',
  digital_address: '',
  class_id: '',
  guardian_name: '',
  guardian_relationship: 'Mother',
  guardian_occupation: '',
  guardian_phone: '',
  guardian_address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  blood_group: '',
  nhis_number: '',
  allergies: '',
  special_needs: '',
}

const steps = [
  { id: 'pupil', title: 'Pupil', hint: 'Bio-data', icon: FiUser, keys: ['first_name', 'last_name', 'gender', 'date_of_birth', 'hometown', 'region'] },
  { id: 'admission', title: 'Admission', hint: 'Class & school', icon: FiBookOpen, keys: ['admission_number', 'class_id', 'admission_date', 'previous_school'] },
  { id: 'guardian', title: 'Guardian', hint: 'Parent contact', icon: FiHome, keys: ['guardian_name', 'guardian_relationship', 'guardian_phone', 'residential_address'] },
  { id: 'health', title: 'Health', hint: 'Review file', icon: FiHeart, keys: ['nhis_number', 'blood_group', 'emergency_contact_name'] },
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

function ageFrom(date) {
  if (!date) return null
  const birth = new Date(date)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

export default function StudentRegisterPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    api.get('/classes').then(({ data }) => setClasses(data)).catch(() => {})
    if (id) {
      api.get(`/students/${id}`).then(({ data }) => {
        const next = { ...empty }
        Object.keys(empty).forEach((key) => {
          if (data[key] == null) return
          next[key] = data[key]
        })
        ;['date_of_birth', 'admission_date'].forEach((key) => {
          if (data[key]) next[key] = String(data[key]).slice(0, 10)
        })
        if (!next.guardian_phone && data.phone_number) next.guardian_phone = data.phone_number
        setForm(next)
      })
      return
    }
    api.get('/students/next-id').then(({ data }) => {
      setForm((current) => ({ ...current, admission_number: data.admission_number }))
    }).catch(() => {})
  }, [id])

  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')
  const initials = `${(form.first_name || 'P')[0]}${(form.last_name || 'S')[0]}`.toUpperCase()
  const selectedClass = classes.find((item) => String(item.id) === String(form.class_id))
  const age = ageFrom(form.date_of_birth)
  const progress = useMemo(() => {
    const tracked = steps.flatMap((item) => item.keys)
    return Math.round((filledCount(form, tracked) / tracked.length) * 100)
  }, [form])

  const validateStep = (index) => {
    if (index === 0 && (!form.first_name.trim() || !form.last_name.trim())) {
      toast.error('Enter the pupil’s first name and surname to continue')
      return false
    }
    if (index === 1 && !form.class_id) {
      toast.error('Select the class seeking admission')
      return false
    }
    if (index === 2 && !form.guardian_name.trim()) {
      toast.error('Enter the parent or guardian’s name')
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
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      setStep(!form.first_name.trim() || !form.last_name.trim() ? 0 : !form.class_id ? 1 : 2)
      return
    }
    setBusy(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]),
      )
      payload.phone_number = form.guardian_phone || null
      if (editing) await api.put(`/students/${id}`, payload)
      else await api.post('/students', payload)
      toast.success(editing ? 'Admission file updated' : 'Pupil admitted to the school register')
      navigate('/students')
    } catch (error) {
      const firstError = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]?.[0]
        : null
      toast.error(firstError || error.response?.data?.message || 'Could not save admission')
    } finally {
      setBusy(false)
    }
  }

  if (!hasRole('hr_officer', 'teacher')) {
    return (
      <div className="card max-w-lg">
        <p className="text-slate-600">Only teachers and HR officers can register students.</p>
        <Link to="/students" className="mt-4 inline-flex items-center gap-2 text-emerald-800">Back to student register</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/students" className="inline-flex items-center gap-2 text-sm text-emerald-800">
            <FiArrowLeft /> Student register
          </Link>
          <h3 className="mt-2 text-2xl font-semibold text-emerald-950">{editing ? 'Update admission file' : 'Pupil admission'}</h3>
          <p className="mt-1 text-sm text-slate-500">Basic-school admission file · complete one section at a time</p>
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
                className={`flex min-w-[10.5rem] shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition sm:min-w-0 sm:flex-1 ${active ? 'bg-emerald-800 text-white shadow' : complete ? 'bg-emerald-50 text-emerald-950' : 'text-slate-500 hover:bg-stone-50'}`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-full ${active ? 'bg-amber-400 text-emerald-950' : complete ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-slate-600'}`}>
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
                <h4 className="text-lg font-semibold text-emerald-950">Pupil bio-data</h4>
                <p className="text-sm text-slate-500">As on the birth certificate or previous school report.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Gender">
                  <div className="grid grid-cols-2 gap-2">
                    {[['female', 'Female'], ['male', 'Male']].map(([value, label]) => (
                      <button key={value} type="button" onClick={() => set('gender', value)} className={`rounded-xl border px-3 py-2 text-sm ${form.gender === value ? 'border-emerald-700 bg-emerald-50 font-medium text-emerald-950' : 'border-stone-200'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Date of birth">
                  <input type="date" className="input" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
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
                <Field label="Place of birth">
                  <input className="input" value={form.place_of_birth} onChange={(e) => set('place_of_birth', e.target.value)} placeholder="Accra" />
                </Field>
                <Field label="Nationality">
                  <input className="input" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
                </Field>
                <Field label="Religion">
                  <select className="input" value={form.religion} onChange={(e) => set('religion', e.target.value)}>
                    {['Christianity', 'Islam', 'Traditional', 'Other'].map((item) => <option key={item}>{item}</option>)}
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
                <Field label="Birth certificate number" wide hint="Optional. Use the number on the birth certificate or NHIS card if available.">
                  <input className="input" value={form.birth_certificate_number} onChange={(e) => set('birth_certificate_number', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Admission details</h4>
                <p className="text-sm text-slate-500">Class seeking admission in this basic school.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Admission number" hint="Generated automatically for every new pupil.">
                  <input className="input bg-stone-50 font-medium tracking-wide" value={form.admission_number || 'Generating…'} readOnly />
                </Field>
                <Field label="Date of admission">
                  <input type="date" className="input" value={form.admission_date} onChange={(e) => set('admission_date', e.target.value)} />
                </Field>
                <Field label="Class seeking admission" wide>
                  <div className="grid gap-3">
                    {classLevels.map((level) => (
                      <div key={level} className="rounded-2xl border border-stone-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{level}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {classes.filter((item) => item.level === level).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => set('class_id', String(item.id))}
                              className={`rounded-full px-3 py-1.5 text-sm ${String(form.class_id) === String(item.id) ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>
                <Field label="Previous school" wide hint="Leave blank if this is the pupil’s first school.">
                  <input className="input" value={form.previous_school} onChange={(e) => set('previous_school', e.target.value)} placeholder="Name of last school attended" />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Parent / guardian</h4>
                <p className="text-sm text-slate-500">The adult responsible for this pupil at home and in emergencies.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Guardian full name">
                  <input className="input" value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} placeholder="Mrs Akosua Mensah" />
                </Field>
                <Field label="Relationship">
                  <select className="input" value={form.guardian_relationship} onChange={(e) => set('guardian_relationship', e.target.value)}>
                    {['Mother', 'Father', 'Guardian', 'Grandparent', 'Uncle', 'Aunt', 'Sibling', 'Other'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Occupation">
                  <input className="input" value={form.guardian_occupation} onChange={(e) => set('guardian_occupation', e.target.value)} />
                </Field>
                <Field label="Mobile number">
                  <input className="input" placeholder="024XXXXXXX" value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} />
                </Field>
                <Field label="Residential address" wide>
                  <input className="input" value={form.residential_address} onChange={(e) => set('residential_address', e.target.value)} placeholder="House number, suburb, town" />
                </Field>
                <Field label="Digital address (GhanaPost GPS)">
                  <input className="input" placeholder="GA-123-4567" value={form.digital_address} onChange={(e) => set('digital_address', e.target.value)} />
                </Field>
                <Field label="Guardian address" hint="Fill only if different from the pupil’s residence.">
                  <input className="input" value={form.guardian_address} onChange={(e) => set('guardian_address', e.target.value)} />
                </Field>
                <Field label="Emergency contact name">
                  <input className="input" value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} />
                </Field>
                <Field label="Emergency contact phone">
                  <input className="input" value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <header>
                <h4 className="text-lg font-semibold text-emerald-950">Health notes and review</h4>
                <p className="text-sm text-slate-500">Optional medical details the class teacher should know. Confirm the file, then admit the pupil.</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Blood group">
                  <select className="input" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                    <option value="">Not stated</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="NHIS number">
                  <input className="input" value={form.nhis_number} onChange={(e) => set('nhis_number', e.target.value)} />
                </Field>
                <Field label="Allergies" wide>
                  <input className="input" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="None known" />
                </Field>
                <Field label="Special educational needs" wide>
                  <input className="input" value={form.special_needs} onChange={(e) => set('special_needs', e.target.value)} placeholder="None stated" />
                </Field>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Admission summary</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-slate-400">Pupil</dt><dd className="font-medium">{fullName || '—'}</dd></div>
                  <div><dt className="text-slate-400">Admission no.</dt><dd className="font-medium">{form.admission_number || '—'}</dd></div>
                  <div><dt className="text-slate-400">Class</dt><dd className="font-medium">{selectedClass ? `${selectedClass.name} · ${selectedClass.level}` : '—'}</dd></div>
                  <div><dt className="text-slate-400">Guardian</dt><dd className="font-medium">{form.guardian_name || '—'}</dd></div>
                  <div><dt className="text-slate-400">Phone</dt><dd className="font-medium">{form.guardian_phone || '—'}</dd></div>
                  <div><dt className="text-slate-400">Residence</dt><dd className="font-medium">{form.residential_address || '—'}</dd></div>
                </dl>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-stone-100 disabled:opacity-40" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
              Back
            </button>
            <div className="flex gap-3">
              <Link to="/students" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-stone-100">Cancel</Link>
              {step < steps.length - 1 ? (
                <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={goNext}>
                  Continue <FiArrowRight />
                </button>
              ) : (
                <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save admission file' : 'Admit pupil'}</button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-3xl bg-emerald-950 text-white shadow-lg">
            <div className="h-16 bg-gradient-to-r from-emerald-800 to-amber-500/80" />
            <div className="-mt-8 px-5 pb-5">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-400 text-lg font-bold text-emerald-950 shadow">
                {initials}
              </div>
              <p className="mt-3 text-lg font-semibold leading-snug">{fullName || 'New pupil'}</p>
              <p className="text-sm text-emerald-200">{selectedClass ? `${selectedClass.name} · ${selectedClass.level}` : 'Class not yet selected'}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Admission</dt><dd>{form.admission_number || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Age</dt><dd>{age == null ? '—' : `${age} years`}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Gender</dt><dd className="capitalize">{form.gender}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-emerald-300">Guardian</dt><dd>{form.guardian_name || '—'}</dd></div>
              </dl>
            </div>
          </div>
          <div className="card text-sm">
            <p className="font-semibold text-emerald-950">This step</p>
            <p className="mt-1 text-slate-500">{steps[step].title}: {filledCount(form, steps[step].keys)} of {steps[step].keys.length} key fields filled.</p>
            <p className="mt-3 text-xs text-slate-400">Required to finish: first name, surname, class and guardian name. New pupils are admitted as active.</p>
          </div>
        </aside>
      </form>
    </div>
  )
}
