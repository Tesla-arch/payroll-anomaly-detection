import { portalRoles } from './portalRoles'

export const MANUAL_HREF = '/School-SMS-User-Manual.pdf'

export const helpCategories = [
  { id: 'sign-in', label: 'Sign in' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'anomalies', label: 'Anomalies' },
  { id: 'leave', label: 'Leave' },
  { id: 'academic', label: 'Academic' },
  { id: 'reports', label: 'Reports' },
]

const deskName = Object.fromEntries(portalRoles.map((item) => [item.slug, item.label]))

export function desksLabel(slugs) {
  if (!slugs?.length) return null
  return slugs.map((slug) => deskName[slug] || slug).join(', ')
}

export const helpSynonyms = {
  pay: 'payroll',
  pays: 'payroll',
  salary: 'payroll',
  salaries: 'payroll',
  payslip: 'payroll',
  payslips: 'payroll',
  wage: 'payroll',
  wages: 'payroll',
  payday: 'payroll',
  flag: 'anomaly',
  flags: 'anomaly',
  ghost: 'ghost',
  alert: 'anomaly',
  alerts: 'anomaly',
  pension: 'ssnit',
  class: 'class',
  classroom: 'class',
  classrooms: 'class',
  tutor: 'class',
  pupil: 'student',
  pupils: 'student',
  admission: 'student',
  enrol: 'student',
  enroll: 'student',
  ward: 'parent',
  wards: 'parent',
  household: 'parent',
  notice: 'parent',
  notices: 'parent',
  message: 'parent',
  messages: 'parent',
  signin: 'login',
  login: 'login',
  password: 'login',
  desk: 'role',
  desks: 'role',
  permission: 'role',
  permissions: 'role',
  menu: 'role',
  menus: 'role',
  navigate: 'role',
  navigation: 'role',
  absent: 'attendance',
  absence: 'attendance',
  present: 'attendance',
  register: 'register',
  employment: 'staff',
  employee: 'staff',
  users: 'users',
  user: 'users',
  admin: 'users',
  administrator: 'users',
  csv: 'reports',
  report: 'reports',
  log: 'audit',
  logs: 'audit',
  trail: 'audit',
  blocked: 'approve',
  blocking: 'approve',
  approval: 'approve',
  paid: 'payroll',
}

export const helpArticles = [
  {
    id: 'what-the-system-does',
    title: 'What this portal does',
    category: 'sign-in',
    keywords: ['system', 'portal', 'sms', 'overview', 'what', 'school', 'ges'],
    roles: null,
    paths: ['/'],
    public: true,
    body: [
      'The School Management System is a web portal for Ghanaian basic schools. It keeps one employment file per staff member, one admission file per pupil, daily attendance, two-step leave, monthly salary runs, and an explainable anomaly desk.',
      'Payroll deducts employee 5.5% SSNIT, staff loans and unpaid absence. PAYE is not deducted. A draft cannot be approved or marked paid while critical anomalies are still open.',
    ],
    links: [
      { label: 'Open dashboard', to: '/', roles: null },
    ],
    related: ['roles-and-menus', 'monthly-workflow'],
  },
  {
    id: 'sign-in-email',
    title: 'Sign in with email and password',
    category: 'sign-in',
    keywords: ['login', 'sign in', 'email', 'password', 'officer', 'parent', 'headteacher', 'hr', 'auditor', 'admin'],
    roles: null,
    paths: ['/login'],
    public: true,
    body: [
      'Administrators, Headteachers, HR Officers, auditors and parents use the Email tab on the sign-in page.',
      [
        'Open Sign in and keep the Email tab selected.',
        'Enter the school or household email, then the password. Use the eye icon to show or hide it.',
        'Continue to portal.',
      ],
      'First-time officers use Create an officer account. Parents do not self-register — HR adds them on the parent register, then they sign in here with that email.',
    ],
    links: [
      { label: 'Open email sign-in', to: '/login', public: true },
      { label: 'Create an officer account', to: '/register', public: true },
    ],
    related: ['sign-in-staff', 'officer-register', 'demo-accounts'],
  },
  {
    id: 'sign-in-staff',
    title: 'Sign in with Staff ID (teachers and accountants)',
    category: 'sign-in',
    keywords: ['staff id', 'employee id', 'teacher', 'accountant', 'login', 'no password', 'emp-1001'],
    roles: ['teacher', 'accountant'],
    paths: ['/login'],
    public: true,
    body: [
      'Teachers and accountants do not use a password. HR issues a staff ID when the employment file is saved.',
      [
        'On Sign in, choose the Staff ID tab.',
        'Enter the generated ID (for example EMP-1001 or SMS-2026-0001).',
        'Enter the employment email captured on the staff file.',
        'Continue to portal — no password is asked.',
      ],
      'Staff cannot self-register. If login fails, ask HR to confirm the staff ID and employment email on the file.',
    ],
    links: [
      { label: 'Open Staff ID sign-in', to: '/login?desk=staff', public: true },
    ],
    related: ['register-staff', 'sign-in-email', 'demo-accounts'],
  },
  {
    id: 'officer-register',
    title: 'Create an officer account',
    category: 'sign-in',
    keywords: ['register', 'create account', 'officer', 'captcha', 'security code'],
    roles: ['super_admin', 'headteacher', 'hr_officer', 'auditor'],
    paths: ['/register'],
    public: true,
    body: [
      'Administrators, Headteachers, HR Officers and auditors may create their own account at /register. Teachers, accountants and parents cannot use this form.',
      [
        'Choose a desk: Administrator, Headteacher / Headmaster, HR Officer, or Auditor.',
        'Enter first name, surname, school email, Ghana mobile, password (at least 8 characters) and confirm it.',
        'Type the five-character security code from the picture. Use New code if it is hard to read.',
        'Register and open portal.',
      ],
      'Parents must be added by HR on the parent register. Teachers and accountants are enrolled from the staff employment file.',
    ],
    links: [
      { label: 'Create an officer account', to: '/register', public: true },
    ],
    related: ['sign-in-email', 'portal-users', 'register-staff'],
  },
  {
    id: 'demo-accounts',
    title: 'Demo accounts',
    category: 'sign-in',
    keywords: ['demo', 'password', 'sample', 'try', 'test account', 'admin@school.gh'],
    roles: null,
    paths: ['/login'],
    public: true,
    body: [
      'Officer and parent email logins use the password “password”. Staff sign in with staff ID and employment email only — no password.',
      [
        'admin@school.gh — Super Admin',
        'head@school.gh — Headteacher',
        'hr@school.gh — HR Officer',
        'auditor@school.gh — Auditor',
        'parent@school.gh — Parent',
        'EMP-1001 / teacher@school.gh — Teacher (Staff ID tab)',
        'EMP-ACC-01 / accounts@school.gh — Accountant (Staff ID tab)',
      ],
      'The seeder plants a July 2026 payroll run with deliberate flags so the dashboard is not empty.',
    ],
    links: [
      { label: 'Go to sign in', to: '/login', public: true },
    ],
    related: ['sign-in-email', 'sign-in-staff'],
  },
  {
    id: 'roles-and-menus',
    title: 'Roles and what each desk can open',
    category: 'sign-in',
    keywords: ['role', 'desk', 'menu', 'who', 'permission', 'sidebar', 'access'],
    roles: null,
    paths: ['/'],
    public: true,
    body: [
      'The left menu only shows desks you are allowed to open. Your name, role and Sign out sit at the bottom of the sidebar. On a phone, open the menu with the button at the top left.',
      [
        'Dashboard — everyone signed in.',
        'My class — Teacher (and Super Admin).',
        'Classes — Headteacher, HR, Super Admin.',
        'Staff — Headteacher, HR, Accountant, Auditor, Super Admin.',
        'Students — Headteacher, HR, Teacher, Parent, Super Admin.',
        'Parents — Headteacher, HR, Teacher, Super Admin.',
        'Attendance and Leave — HR, Headteacher, Teacher, Super Admin.',
        'Payroll, Anomalies, Reports — Headteacher, HR, Accountant, Auditor, Super Admin.',
        'Audit trail — Auditor, Headteacher, Super Admin.',
        'Users — Super Admin only.',
      ],
      'If a menu item is missing, your desk does not include that module. Use the sun/moon control in the header for light and dark theme.',
    ],
    links: [
      { label: 'Open dashboard', to: '/', roles: null },
    ],
    related: ['dashboard', 'accountant-desk', 'parent-desk'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard and school health',
    category: 'sign-in',
    keywords: ['dashboard', 'home', 'health', 'hold payroll', 'kpi', 'shortcut'],
    roles: null,
    paths: ['/'],
    public: false,
    body: [
      'After sign-in you land on the operations dashboard. It greets you by time of day and shows payroll health for the school.',
      [
        'Hold payroll — one or more critical flags are still open. Do not approve salaries.',
        'Review recommended — open flags remain, but they are not critical.',
        'Clear to proceed — no open payroll flags.',
      ],
      'Campus slides and shortcuts take you to the desks your role can open. Click a KPI card to jump to the related screen.',
    ],
    links: [
      { label: 'Open dashboard', to: '/', roles: null },
      { label: 'Open anomalies', to: '/anomalies', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['why-approve-blocked', 'roles-and-menus'],
  },
  {
    id: 'register-staff',
    title: 'Register staff and issue a Staff ID',
    category: 'payroll',
    keywords: ['staff', 'employment', 'register staff', 'hire', 'employee id', 'bank', 'ssnit', 'deactivate'],
    roles: ['hr_officer'],
    paths: ['/staff', '/staff/register'],
    public: false,
    body: [
      'Only HR can create or update employment files. Other payroll desks can search the register but cannot save changes.',
      [
        'Open Staff → Register staff. The form is a five-step GES-style file.',
        'Required: first name, surname, staff email, generated staff ID, portal desk (Teacher or Accountant on a new file), and basic monthly salary.',
        'Capture SSNIT number, bank name and account where you can — missing banking raises a Bank details missing flag later.',
        'Save, then tell the staff member their generated ID and the email on the file so they can sign in on the Staff ID tab.',
      ],
      'Deactivate stops the person being picked up on the next payroll prepare. Remove them from any open draft separately.',
    ],
    links: [
      { label: 'Open staff register', to: '/staff', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
      { label: 'Register staff', to: '/staff/register', roles: ['hr_officer'] },
    ],
    related: ['sign-in-staff', 'ssnit-and-paye', 'prepare-payroll'],
  },
  {
    id: 'ssnit-and-paye',
    title: 'SSNIT 5.5% and no PAYE',
    category: 'payroll',
    keywords: ['ssnit', 'paye', 'tax', '5.5', 'pension', 'cap', 'insurable', 'net'],
    roles: ['hr_officer', 'headteacher', 'accountant', 'auditor'],
    paths: ['/payroll', '/payroll/prepare'],
    public: false,
    body: [
      'School-level payroll deducts employee first-tier SSNIT at 5.5% of capped insurable basic (2026 cap GHS 69,000). Employer 13% is recorded, not taken from net pay.',
      'PAYE is not deducted. Net = gross − SSNIT − loans − unpaid absence.',
      'If SSNIT on the slip does not match 5.5% of capped basic, the scan raises Ssnit_Mismatch. Correct salary on the staff file, then recalculate the slip.',
    ],
    links: [
      { label: 'Prepare payroll', to: '/payroll/prepare', roles: ['hr_officer'] },
      { label: 'Open payroll', to: '/payroll', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['prepare-payroll', 'anomaly-rules'],
  },
  {
    id: 'prepare-payroll',
    title: 'Prepare monthly payroll',
    category: 'payroll',
    keywords: ['prepare', 'generate', 'payroll', 'run', 'month', 'salary run', 'create payroll'],
    roles: ['hr_officer'],
    paths: ['/payroll/prepare', '/payroll'],
    public: false,
    body: [
      'Only the HR Officer can prepare a salary run. Path: Payroll → Prepare payroll.',
      [
        'Enter first day of the period (last day and run name fill for that calendar month). Set payment date and run name.',
        'The run adds basic plus posted allowances, deducts SSNIT 5.5%, loans and unpaid absence. It does not take PAYE.',
        'Tick that attendance and approved leave for the period have been closed.',
        'Generate salary run. The anomaly scan runs automatically.',
      ],
      'You can cancel a draft, rescan, or recalculate a slip from the run. Headteacher approval comes after critical flags are cleared.',
    ],
    links: [
      { label: 'Prepare payroll', to: '/payroll/prepare', roles: ['hr_officer'] },
      { label: 'Open payroll runs', to: '/payroll', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['approve-payroll', 'anomalies-desk', 'monthly-workflow'],
  },
  {
    id: 'approve-payroll',
    title: 'Approve a salary run and mark it paid',
    category: 'payroll',
    keywords: ['approve', 'mark paid', 'payment', 'headteacher', 'draft', 'signed'],
    roles: ['headteacher', 'hr_officer'],
    paths: ['/payroll'],
    public: false,
    body: [
      'Status flow: Prepared (draft) → Headteacher signed (approved) → Paid.',
      [
        'HR can cancel a draft while it is still prepared.',
        'Headteacher approves for payment only when no open critical flags remain.',
        'HR marks the run paid after approval — still blocked if critical flags are open.',
        'Payslip PDFs can be downloaded from a staff line on the schedule.',
      ],
      'Accountant and auditor views are inspect-only. If the red banner shows open critical flags, the Headteacher button reads Clear critical flags first.',
    ],
    links: [
      { label: 'Open payroll', to: '/payroll', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
      { label: 'Open anomalies', to: '/anomalies', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['why-approve-blocked', 'payslips', 'prepare-payroll'],
  },
  {
    id: 'payslips',
    title: 'View payslips and the salary schedule',
    category: 'payroll',
    keywords: ['payslip', 'slip', 'schedule', 'net', 'gross', 'download pdf'],
    roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'],
    paths: ['/payroll'],
    public: false,
    body: [
      'Open Payroll, then open a run. Search the salary schedule and click a line for the slip: basic, allowances, SSNIT, loans, absence and net — no PAYE.',
      'Download the payslip PDF from that staff line. Accountants and auditors can inspect but cannot prepare, approve, recalculate or mark paid.',
    ],
    links: [
      { label: 'Open payroll', to: '/payroll', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['approve-payroll', 'ssnit-and-paye', 'accountant-desk'],
  },
  {
    id: 'monthly-workflow',
    title: 'Typical monthly payroll workflow',
    category: 'payroll',
    keywords: ['workflow', 'month', 'steps', 'process', 'how payroll works', 'cycle'],
    roles: ['hr_officer', 'headteacher'],
    paths: ['/payroll', '/'],
    public: false,
    body: [
      'A normal month follows this order:',
      [
        'HR keeps staff files current (salary, bank, status, SSNIT). Teachers mark class attendance; HR or Headteacher close the staff register.',
        'Staff request leave. HR forwards; Headteacher approves before pay day.',
        'HR prepares the month, confirms attendance and leave are closed, then generates the run.',
        'Open Anomalies. Work every critical case: fix the file, recalculate, or remove from draft. Save an outcome with notes.',
        'Headteacher opens the run. If critical flags remain, approval is blocked. When clear, Approve for payment.',
        'HR Mark paid and download payslips. Accountant uses Reports. Auditor uses Audit trail.',
      ],
    ],
    links: [
      { label: 'Prepare payroll', to: '/payroll/prepare', roles: ['hr_officer'] },
      { label: 'Open anomalies', to: '/anomalies', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['prepare-payroll', 'anomalies-desk', 'approve-payroll'],
  },
  {
    id: 'anomalies-desk',
    title: 'Investigate a payroll flag',
    category: 'anomalies',
    keywords: ['anomaly', 'investigation', 'outcome', 'resolve', 'acknowledge', 'false positive', 'recalculate', 'exclude'],
    roles: ['hr_officer', 'headteacher', 'auditor'],
    paths: ['/anomalies'],
    public: false,
    body: [
      'Open Anomalies, then a case. Filter by status, severity, rule and run. Each case shows what fired, recommended action, evidence, risk score, and whether it blocks approval.',
      [
        'HR edits the staff file, deactivates a leaver, or opens attendance.',
        'HR recalculates the slip from the current file, or removes the person from this draft.',
        'Removing someone from a draft closes their flags so the Headteacher can approve.',
        'Record an outcome: Acknowledge, Resolve, or False positive, with notes. Accountants can read only.',
      ],
      'Resolving a critical flag is what lets the Headteacher approve. Outcomes are written to the audit trail.',
    ],
    links: [
      { label: 'Open anomalies', to: '/anomalies', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['anomaly-rules', 'why-approve-blocked'],
  },
  {
    id: 'why-approve-blocked',
    title: 'Why payroll approval is blocked',
    category: 'anomalies',
    keywords: ['blocked', 'cannot approve', 'critical', 'clear flags', 'hold payroll', 'headteacher'],
    roles: ['headteacher', 'hr_officer'],
    paths: ['/payroll', '/anomalies'],
    public: false,
    body: [
      'A draft cannot be approved or marked paid while critical anomalies are still open. The Headteacher button then reads Clear critical flags first.',
      [
        'Open Anomalies and work every critical case.',
        'HR corrects the staff file, attendance or leave, then recalculates the slip.',
        'Or remove the person from this draft if they should not be paid this month.',
        'Save an investigation outcome with notes. When no critical flags remain, return to the run and Approve for payment.',
      ],
    ],
    links: [
      { label: 'Open anomalies', to: '/anomalies', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
      { label: 'Open payroll', to: '/payroll', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['anomalies-desk', 'anomaly-rules', 'approve-payroll'],
  },
  {
    id: 'anomaly-rules',
    title: 'The nine payroll detection rules',
    category: 'anomalies',
    keywords: [
      'ghost', 'ghost staff', 'inactive', 'attendance', 'duplicate', 'high salary', 'ssnit', 'bank', 'loan',
      'allowance', 'catalogue', 'rules', 'Ghost_No_User_Account', 'Ghost_Inactive_Staff',
      'Payment_Without_Attendance', 'Duplicate_Period_Payment', 'Unusually_High_Salary',
      'Ssnit_Mismatch', 'Bank_Details_Missing', 'Loan_Over_Deduction', 'Unauthorized_Allowance',
    ],
    roles: ['hr_officer', 'headteacher', 'accountant', 'auditor'],
    paths: ['/anomalies'],
    public: false,
    body: [
      'The engine is rule-based, not a trained model, so every flag can be explained to a Headteacher and an auditor. A scan runs after every generate, recalculate or related change.',
      [
        'Ghost — no user account: payee has no linked login. HR links a user, then recalculates.',
        'Ghost — inactive staff: an inactive employee is still on the run. Confirm status or remove from draft.',
        'Paid without attendance: no present/late mark and no approved leave. Mark the register or drop the line.',
        'Duplicate payment: more than one salary line for the same staff in this period. Remove the extra line.',
        'Unusually high salary: gross is above 1.5× the grade or basic. Correct salary or grade, then recalculate.',
        'SSNIT mismatch: employee 5.5% does not match capped basic. Correct salary, then recalculate.',
        'Bank details missing: capture bank name and account, or hold the person off the run.',
        'Loan over-deduction: recovery is higher than the outstanding balance. Cap it, then recalculate.',
        'Unauthorized allowance: not authorized or over the grade cap. Remove or authorize, then recalculate.',
      ],
    ],
    links: [
      { label: 'Open anomalies', to: '/anomalies', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['anomalies-desk', 'ssnit-and-paye', 'staff-attendance'],
  },
  {
    id: 'leave-request',
    title: 'Request leave',
    category: 'leave',
    keywords: ['leave', 'request', 'annual', 'sick', 'maternity', 'application', 'form'],
    roles: ['teacher', 'hr_officer'],
    paths: ['/leave', '/leave/request'],
    public: false,
    body: [
      'Open Leave → Request leave. Teachers apply for themselves. HR can apply for any active staff member.',
      [
        'Choose a leave type. Each card shows days left this year (annual 28, casual 7, sick 30, maternity 84, and others).',
        'Set first and last day. The form counts working days or calendar days according to the type.',
        'Add a reason when the type requires it, plus handover notes if you wish.',
        'Tick the declaration and Submit leave request. It goes to HR first, then to the Headteacher.',
      ],
      'Approved leave is used on the attendance register and suppresses Paid without attendance on the payroll scan.',
    ],
    links: [
      { label: 'Open leave', to: '/leave', roles: ['hr_officer', 'headteacher', 'teacher'] },
      { label: 'Request leave', to: '/leave/request', roles: ['hr_officer', 'headteacher', 'teacher'] },
    ],
    related: ['leave-approval', 'staff-attendance'],
  },
  {
    id: 'leave-approval',
    title: 'Review and approve leave',
    category: 'leave',
    keywords: ['leave', 'review', 'approve leave', 'forward', 'reject', 'awaiting'],
    roles: ['hr_officer', 'headteacher'],
    paths: ['/leave'],
    public: false,
    body: [
      'Open Leave. Filter: All, Awaiting HR, Awaiting Headteacher, Approved, Rejected.',
      [
        'Staff (or HR on their behalf) submit the form. Status: Awaiting HR.',
        'HR forwards or rejects. Forwarded status: Awaiting Headteacher.',
        'Headteacher approves or rejects. Approved leave suppresses the paid-without-attendance flag for that period.',
      ],
    ],
    links: [
      { label: 'Open leave', to: '/leave', roles: ['hr_officer', 'headteacher', 'teacher'] },
    ],
    related: ['leave-request', 'why-approve-blocked'],
  },
  {
    id: 'staff-attendance',
    title: 'Mark staff attendance',
    category: 'leave',
    keywords: ['attendance', 'register', 'present', 'absent', 'late', 'clock', 'staff attendance'],
    roles: ['hr_officer', 'headteacher', 'teacher'],
    paths: ['/attendance'],
    public: false,
    body: [
      'Open Attendance. This is the staff register, not the pupil roll under My class.',
      [
        'Pick the school day. Search or filter by status or department.',
        'Mark Present, Late, Absent or On leave. Present defaults check-in to 07:45.',
        'Mark all present sets everyone present except staff already on approved leave.',
        'Save the register — at least one person must be marked.',
      ],
      'Unpaid absence after approved leave is deducted on payroll. Paying someone with no present/late mark and no approved leave raises Paid without attendance.',
    ],
    links: [
      { label: 'Open staff attendance', to: '/attendance', roles: ['hr_officer', 'headteacher', 'teacher'] },
      { label: 'Open my class (pupils)', to: '/my-class', roles: ['teacher'] },
    ],
    related: ['my-class', 'anomaly-rules', 'leave-request'],
  },
  {
    id: 'classes',
    title: 'Assign class teachers',
    category: 'academic',
    keywords: ['classes', 'assign', 'tutor', 'jhs', 'grade', 'subject teacher'],
    roles: ['headteacher', 'hr_officer'],
    paths: ['/classes'],
    public: false,
    body: [
      'Open Classes. Grade 1–6 cards take one class teacher each. Junior High is assigned by subject — that teacher takes JHS 1, 2 and 3.',
      [
        'Each card shows the current tutor, or that none is assigned.',
        'Click Assign teacher, search by name, staff ID, title or department, then tap a name.',
        'Teachers then see that room under My class.',
        'Clear removes the tutor without deleting the classroom.',
      ],
    ],
    links: [
      { label: 'Open classes', to: '/classes', roles: ['headteacher', 'hr_officer'] },
      { label: 'Open my class', to: '/my-class', roles: ['teacher'] },
    ],
    related: ['my-class', 'students'],
  },
  {
    id: 'my-class',
    title: 'My class — register, attendance and assessments',
    category: 'academic',
    keywords: ['my class', 'class register', 'pupil attendance', 'mark class', 'empty class'],
    roles: ['teacher'],
    paths: ['/my-class'],
    public: false,
    body: [
      'Open My class. If several rooms are assigned to you, pick the class first.',
      [
        'Class register — read-only roll of pupils, with admission numbers.',
        'Daily attendance — mark Present, Late, Absent or Excused, then Save. At least one pupil must be marked.',
        'Assessments — shortcuts into each pupil’s term assessment form.',
      ],
      'If My class is empty, ask Headteacher or HR to assign you as class tutor under Classes.',
    ],
    links: [
      { label: 'Open my class', to: '/my-class', roles: ['teacher'] },
      { label: 'Open classes', to: '/classes', roles: ['headteacher', 'hr_officer'] },
    ],
    related: ['classes', 'assessments', 'students'],
  },
  {
    id: 'students',
    title: 'Admit or edit a pupil',
    category: 'academic',
    keywords: ['student', 'pupil', 'admission', 'enrol', 'guardian', 'class'],
    roles: ['hr_officer', 'teacher'],
    paths: ['/students', '/students/register'],
    public: false,
    body: [
      'Open Students → admit or edit. Required to finish: first name, surname, class and guardian name. New pupils are admitted as active.',
      [
        'Pupil bio-data — gender, names; date of birth is optional.',
        'Admission — generated admission number, class under Lower Primary, Upper Primary or Junior High.',
        'Parent / guardian — guardian full name is required; mobile is also stored as the pupil contact.',
        'Health notes are optional. Finish with Admit pupil or Save admission file.',
      ],
      'Parents see their own wards on Students after HR links them on the parent register.',
    ],
    links: [
      { label: 'Open students', to: '/students', roles: ['headteacher', 'hr_officer', 'teacher', 'parent'] },
      { label: 'Admit a pupil', to: '/students/register', roles: ['hr_officer', 'teacher'] },
    ],
    related: ['assessments', 'parents', 'my-class'],
  },
  {
    id: 'assessments',
    title: 'Record student assessments',
    category: 'academic',
    keywords: ['assessment', 'scores', 'term', 'classwork', 'pdf report', 'marks'],
    roles: ['teacher'],
    paths: ['/students'],
    public: false,
    body: [
      'Open Students, then a pupil’s assessment. Only the assigned class tutor can edit scores. Everyone else (including parents looking at their ward) has a view-only report.',
      [
        'Choose academic year and term.',
        'Enter classwork (30%), assignment (25%), project (25%) and homework (20%) per subject.',
        'Save scores (tutor only). Anyone who can open the page can Download PDF report.',
      ],
    ],
    links: [
      { label: 'Open students', to: '/students', roles: ['headteacher', 'hr_officer', 'teacher', 'parent'] },
      { label: 'Open my class', to: '/my-class', roles: ['teacher'] },
    ],
    related: ['my-class', 'students'],
  },
  {
    id: 'parents',
    title: 'Parent register and messages',
    category: 'academic',
    keywords: ['parent', 'message', 'broadcast', 'meeting', 'notice', 'whatsapp', 'household'],
    roles: ['hr_officer', 'headteacher', 'teacher'],
    paths: ['/parents'],
    public: false,
    body: [
      'Open Parents. Tabs: Directory, Compose, Sent. HR and Headteacher can create and edit household files. Teachers can compose messages.',
      [
        'Register a parent with name, email (used on the Email sign-in tab), password on create, and tick wards in the household.',
        'Compose a Notice, Meeting, or Broadcast to all. Meeting needs date, time and venue.',
        'Pick Email and/or WhatsApp. WhatsApp messages send from the school account 0591723646. Demo mail is written to the API log unless SMTP is configured.',
      ],
      'Parents see in-app notices after sign-in. Try parent@school.gh on the Email tab.',
    ],
    links: [
      { label: 'Open parents', to: '/parents', roles: ['headteacher', 'hr_officer', 'teacher'] },
    ],
    related: ['parent-desk', 'students', 'sign-in-email'],
  },
  {
    id: 'parent-desk',
    title: 'What a parent can do',
    category: 'academic',
    keywords: ['parent', 'ward', 'notice', 'meeting', 'household', 'inbox'],
    roles: ['parent'],
    paths: ['/', '/students'],
    public: false,
    body: [
      'Parents sign in on the Email tab with the household email HR registered. There is no payroll, staff or anomalies menu on this desk.',
      [
        'Dashboard — school notices after sign-in.',
        'Students — view your wards’ files and assessment reports (view only).',
        'You cannot self-register. If login fails, ask HR to add you on the parent register.',
      ],
    ],
    links: [
      { label: 'Open dashboard', to: '/', roles: null },
      { label: 'Open students', to: '/students', roles: ['headteacher', 'hr_officer', 'teacher', 'parent'] },
    ],
    related: ['parents', 'sign-in-email', 'assessments'],
  },
  {
    id: 'accountant-desk',
    title: 'What an accountant can do',
    category: 'payroll',
    keywords: ['accountant', 'read only', 'inspect', 'accounts', 'what can i'],
    roles: ['accountant'],
    paths: ['/payroll', '/reports'],
    public: false,
    body: [
      'Accountants sign in on the Staff ID tab. This desk is inspect-only for pay.',
      [
        'Open Staff, Payroll, Anomalies and Reports to review figures.',
        'Download payslips and CSV reports.',
        'You cannot prepare a run, approve it, mark it paid, resolve a flag, or edit a staff file.',
      ],
    ],
    links: [
      { label: 'Open payroll', to: '/payroll', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
      { label: 'Open reports', to: '/reports', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['payslips', 'reports', 'sign-in-staff'],
  },
  {
    id: 'reports',
    title: 'Reports and CSV download',
    category: 'reports',
    keywords: ['reports', 'csv', 'salary chart', 'flags', 'school snapshot', 'download'],
    roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'],
    paths: ['/reports'],
    public: false,
    body: [
      'Open Reports. Three tabs:',
      [
        'Salary — compare runs. Switch the chart metric: Net pay, Gross, SSNIT 5.5%, Open flags. Click a run to open it.',
        'Flags — open versus closed anomalies by rule and severity.',
        'School — roll snapshot by department / class.',
      ],
      'Download CSV exports the active tab.',
    ],
    links: [
      { label: 'Open reports', to: '/reports', roles: ['headteacher', 'hr_officer', 'accountant', 'auditor'] },
    ],
    related: ['audit-trail', 'anomalies-desk'],
  },
  {
    id: 'audit-trail',
    title: 'Use the audit trail',
    category: 'reports',
    keywords: ['audit', 'log', 'trail', 'assurance', 'csv', 'sensitive'],
    roles: ['auditor', 'headteacher'],
    paths: ['/audit'],
    public: false,
    body: [
      'Open Audit trail as auditor, Headteacher or Super Admin. Nobody can change payroll from this desk.',
      [
        'Filter by module, action, user, date range or search. Sensitive highlights events that touch pay or personal files.',
        'Click a KPI or a 14-day bar to pin a view.',
        'Select an event to open the related payroll run, staff file or flag.',
        'Download CSV exports the current filter.',
      ],
    ],
    links: [
      { label: 'Open audit trail', to: '/audit', roles: ['auditor', 'headteacher'] },
    ],
    related: ['anomalies-desk', 'reports'],
  },
  {
    id: 'portal-users',
    title: 'Create portal users',
    category: 'reports',
    keywords: ['users', 'create user', 'admin', 'account', 'deactivate user'],
    roles: ['super_admin'],
    paths: ['/users'],
    public: false,
    body: [
      'Only Super Admin can open Users. Path: Users → Create user or Edit.',
      [
        'Required: first name, surname, school email, password on create (at least 8 characters), and a desk.',
        'Desks: Administrator, Headteacher, HR Officer, Accountant, Auditor, Teacher, Parent.',
        'You cannot deactivate your own account. Leave password blank when editing to keep the current one.',
      ],
      'Teachers and accountants are normally created from the staff employment form, not here. Parents are created on the parent register.',
    ],
    links: [
      { label: 'Open users', to: '/users', roles: ['super_admin'] },
      { label: 'Create a user', to: '/users/create', roles: ['super_admin'] },
    ],
    related: ['officer-register', 'register-staff', 'parents'],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    category: 'sign-in',
    keywords: ['problem', 'failed', 'cannot', 'error', 'fix', 'help', 'stuck', 'missing menu'],
    roles: null,
    paths: ['/'],
    public: true,
    body: [
      'Common snags and what to try:',
      [
        'Login failed (staff) — use the Staff ID tab, not Email. Match the generated ID and employment email. Staff have no password.',
        'Login failed (officer) — Email tab plus password. Demo password is password. Parents must be registered by HR first.',
        'Cannot register staff — sign in as HR. First name, surname, email, staff ID and basic salary are required.',
        'Cannot prepare payroll — only HR can. Tick the attendance/leave closed box.',
        'Cannot approve payroll — open critical flags. Resolve them or remove the people from the draft.',
        'Leave rejected by the form — check remaining days, max per request, working vs calendar days, and the declaration.',
        'My class is empty — ask Headteacher or HR to assign you as class tutor under Classes.',
        'Cannot edit assessments — only the assigned class tutor can save scores.',
        'Parent did not get mail — demo writes to the API log unless SMTP is set. They still see in-app notices.',
        'Menu item missing — your desk does not include that module.',
      ],
    ],
    links: [
      { label: 'Browse all help topics', to: '/help', roles: null },
    ],
    related: ['sign-in-staff', 'why-approve-blocked', 'roles-and-menus'],
  },
]

export const articleById = Object.fromEntries(helpArticles.map((article) => [article.id, article]))

const AUTH_CHIPS = [
  { label: 'Email vs Staff ID', query: 'how do I sign in' },
  { label: 'I am a teacher', query: 'staff ID login' },
  { label: 'Create an officer account', query: 'how do I register' },
  { label: 'Demo accounts', query: 'demo accounts' },
]

const STARTER_CHIPS = {
  hr_officer: [
    { label: 'Prepare payroll', query: 'how do I prepare payroll' },
    { label: 'Register staff', query: 'how do I register staff' },
    { label: 'Review leave', query: 'how do I review leave' },
    { label: 'Fix a payroll flag', query: 'how do I fix an anomaly' },
  ],
  headteacher: [
    { label: 'Why can’t I approve?', query: 'why is payroll approval blocked' },
    { label: 'Assign class teachers', query: 'how do I assign class teachers' },
    { label: 'Approve leave', query: 'how do I approve leave' },
    { label: 'Open anomalies', query: 'how do I investigate a flag' },
  ],
  teacher: [
    { label: 'Mark my class', query: 'how do I mark class attendance' },
    { label: 'Request leave', query: 'how do I request leave' },
    { label: 'Parent messages', query: 'how do I message parents' },
    { label: 'My class is empty', query: 'my class is empty' },
  ],
  accountant: [
    { label: 'View payslips', query: 'how do I view payslips' },
    { label: 'Open reports', query: 'how do I download reports' },
    { label: 'What can I change?', query: 'what can the accountant do' },
  ],
  auditor: [
    { label: 'Audit trail', query: 'how do I use the audit trail' },
    { label: 'Record a flag outcome', query: 'how do I resolve an anomaly' },
    { label: 'Detection rules', query: 'what are the payroll rules' },
  ],
  parent: [
    { label: 'Notices and meetings', query: 'how do I see parent notices' },
    { label: 'My child’s records', query: 'how do I view my ward' },
    { label: 'How do I sign in?', query: 'parent email login' },
  ],
  super_admin: [
    { label: 'Create portal users', query: 'how do I create users' },
    { label: 'Prepare payroll', query: 'how do I prepare payroll' },
    { label: 'What can each desk do?', query: 'what can each role do' },
    { label: 'Fix a payroll flag', query: 'how do I fix an anomaly' },
  ],
  default: [
    { label: 'What can my desk do?', query: 'what can each role do' },
    { label: 'How do I sign in?', query: 'how do I sign in' },
    { label: 'Troubleshooting', query: 'login failed' },
  ],
}

const PAGE_HINTS = [
  { prefix: '/payroll/prepare', chips: [
    { label: 'What does prepare do?', query: 'how do I prepare payroll' },
    { label: 'SSNIT and PAYE', query: 'ssnit and paye' },
  ] },
  { prefix: '/payroll', chips: [
    { label: 'Approve this run', query: 'how do I approve payroll' },
    { label: 'Why is approve blocked?', query: 'why is payroll approval blocked' },
    { label: 'Download a payslip', query: 'how do I view payslips' },
  ] },
  { prefix: '/anomalies', chips: [
    { label: 'How do I fix a flag?', query: 'how do I investigate a flag' },
    { label: 'The nine rules', query: 'what are the payroll rules' },
    { label: 'Ghost staff', query: 'ghost staff' },
  ] },
  { prefix: '/staff', chips: [
    { label: 'Register staff', query: 'how do I register staff' },
    { label: 'Staff ID login', query: 'staff ID login' },
  ] },
  { prefix: '/leave', chips: [
    { label: 'Request leave', query: 'how do I request leave' },
    { label: 'HR then Headteacher', query: 'how do I approve leave' },
  ] },
  { prefix: '/attendance', chips: [
    { label: 'Mark the register', query: 'how do I mark staff attendance' },
    { label: 'Paid without attendance', query: 'paid without attendance' },
  ] },
  { prefix: '/my-class', chips: [
    { label: 'Mark pupil attendance', query: 'how do I mark class attendance' },
    { label: 'My class is empty', query: 'my class is empty' },
  ] },
  { prefix: '/classes', chips: [
    { label: 'Assign a tutor', query: 'how do I assign class teachers' },
    { label: 'JHS by subject', query: 'assign class teachers' },
  ] },
  { prefix: '/students', chips: [
    { label: 'Admit a pupil', query: 'how do I admit a pupil' },
    { label: 'Record assessments', query: 'how do I record assessments' },
  ] },
  { prefix: '/parents', chips: [
    { label: 'Register a household', query: 'how do I register a parent' },
    { label: 'Send a notice', query: 'how do I message parents' },
  ] },
  { prefix: '/reports', chips: [
    { label: 'Download CSV', query: 'how do I download reports' },
    { label: 'Salary vs flags', query: 'reports salary flags' },
  ] },
  { prefix: '/audit', chips: [
    { label: 'Filter the log', query: 'how do I use the audit trail' },
  ] },
  { prefix: '/users', chips: [
    { label: 'Create a user', query: 'how do I create users' },
  ] },
  { prefix: '/register', chips: AUTH_CHIPS },
  { prefix: '/login', chips: AUTH_CHIPS },
]

export function articlePlainText(article) {
  return (article.body || [])
    .map((block) => (Array.isArray(block) ? block.join(' ') : block))
    .join(' ')
}

export function visibleLinks(links, hasRole) {
  return (links || []).filter((link) => {
    if (link.download || link.public) return true
    if (!link.roles?.length) return Boolean(hasRole)
    return hasRole ? hasRole(...link.roles) : false
  })
}

export function roleNote(article, hasRole) {
  if (!article.roles?.length || !hasRole) return null
  if (hasRole(...article.roles)) return null
  return `This belongs to the ${desksLabel(article.roles)} desk. Your desk cannot perform it, but here is how it works.`
}

export function articlesForBrowse(hasRole, { all = false } = {}) {
  if (all || !hasRole) return { mine: helpArticles, rest: [] }
  const mine = []
  const rest = []
  for (const article of helpArticles) {
    if (!article.roles?.length || hasRole(...article.roles)) mine.push(article)
    else rest.push(article)
  }
  return { mine, rest }
}

function longestPageHint(pathname) {
  if (!pathname) return null
  return PAGE_HINTS.filter((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0] || null
}

export function getStarterChips({ mode, role, pathname }) {
  if (mode === 'auth') return AUTH_CHIPS
  const roleChips = STARTER_CHIPS[role] || STARTER_CHIPS.default
  const pageChips = longestPageHint(pathname)?.chips || []
  const seen = new Set()
  return [...pageChips, ...roleChips].filter((chip) => {
    if (seen.has(chip.query)) return false
    seen.add(chip.query)
    return true
  }).slice(0, 4)
}
