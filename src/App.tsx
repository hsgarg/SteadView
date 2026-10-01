import { useState, useRef, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
type Screen = "intake" | "processing" | "hitl" | "analysis";

interface FormData {
  email: string;
  loanAmount: string;
  files: File[];
}

interface HITLItem {
  id: string;
  description: string;
  amount: string;
  month: string;
  flag: string;
  options: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION — CHANGE THIS TO YOUR N8N WEBHOOK URL 
// ══════════════════════════════════════════════════════════════════════════════
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://your-n8n-instance.app.n8n.cloud/webhook/steadview";
// ══════════════════════════════════════════════════════════════════════════════

// ── Mock/Demo Analysis Data ───────────────────────────────────────────────────
// This serves as: (1) demo data for "Try with demo data" button
//                  (2) fallback if the API call fails
const DEMO_ANALYSIS = {
  borrower: {
    email: "demo@steadview.io",
    loanAmount: 45000,
  },
  score: 71,
  verdict: "conditional" as "approved" | "conditional" | "declined" | "review",
  verdictLabel: "Conditional Approval",
  narrative:
    "Borrower demonstrates consistent multi-stream income across 18 months with moderate volatility; loan-to-income ratio is supportable pending verification of Q4 platform earnings and a 3-month bank statement gap.",
  shortNarrative:
    "Consistent multi-stream earner with moderate volatility; loan supportable pending Q4 verification and gap explanation.",
  metrics: {
    incomeStability: { grade: "B", cv: 0.22, label: "Moderate Stability" },
    diversification: { hhi: 0.41, score: "Good", label: "3 Active Streams" },
    dti: { ratio: 0.34, label: "34% DTI", status: "acceptable" },
    balanceRunway: { months: 4.2, label: "4.2 mo runway" },
    dataConfidence: { pct: 78, label: "78% Confidence", gaps: 1 },
  },
  incomeStreams: [
    { source: "Uber / Lyft", monthly: 2840, pct: 46, stability: "B", trend: "flat", months: 18 },
    { source: "Upwork (Freelance)", monthly: 2100, pct: 34, stability: "A", trend: "up", months: 14 },
    { source: "Etsy Shop", monthly: 820, pct: 13, stability: "C", trend: "down", months: 12 },
    { source: "YouTube AdSense", monthly: 430, pct: 7, stability: "D", trend: "up", months: 6 },
  ],
  expenses: {
    fixed: [
      { label: "Rent / Mortgage", monthly: 1400 },
      { label: "Vehicle Loan", monthly: 380 },
      { label: "Phone / Internet", monthly: 110 },
    ],
    essential: [
      { label: "Groceries", monthly: 420 },
      { label: "Utilities", monthly: 180 },
      { label: "Gas / Transport", monthly: 310 },
    ],
    discretionary: [
      { label: "Dining & Entertainment", monthly: 290 },
      { label: "Subscriptions", monthly: 85 },
      { label: "Misc Shopping", monthly: 210 },
    ],
    debt: [
      { label: "Credit Card (Chase)", monthly: 220 },
      { label: "Student Loan", monthly: 145 },
    ],
  },
  monthlyChart: [
    { month: "Mar '24", income: 5640, expenses: 3740 },
    { month: "Apr '24", income: 6120, expenses: 3890 },
    { month: "May '24", income: 5980, expenses: 4100 },
    { month: "Jun '24", income: 6800, expenses: 3750 },
    { month: "Jul '24", income: 7100, expenses: 4220 },
    { month: "Aug '24", income: 6450, expenses: 3980 },
    { month: "Sep '24", income: 5820, expenses: 4350 },
    { month: "Oct '24", income: 6340, expenses: 4100 },
    { month: "Nov '24", income: 7200, expenses: 4580 },
    { month: "Dec '24", income: 5100, expenses: 4890 },
    { month: "Jan '25", income: 6190, expenses: 3820 },
    { month: "Feb '25", income: 6550, expenses: 3950 },
  ],
  redFlags: [
    { severity: "high", text: "3-month gap in Uber payouts (Oct-Dec 2023). Possible platform suspension or unreported period." },
    { severity: "medium", text: "December spike in discretionary spending (+$1,140 vs. trailing average) may indicate seasonal pattern or one-off event." },
    { severity: "medium", text: "YouTube income < 6 months of history; insufficient runway to include in sustainable income baseline." },
    { severity: "low", text: "Etsy revenue trending down 18% over 6 months. Monitor for continued deterioration." },
  ],
  sustainableIncome: 5760,
  projectedIncome: 6190,
  cashSummary: {
    avgMonthlyBalance: 8420,
    minMonthlyBalance: 2140,
    maxMonthlyBalance: 14800,
    endingBalance: 9340,
    avgDailyFloat: 6180,
    nsfEvents: 0,
    overdraftCount: 0,
  },
  aiNarrative: `Maria Chen presents as a capable multi-stream earner whose primary income derives from rideshare (Uber/Lyft) supplemented by established freelance development work on Upwork. The Upwork stream demonstrates the highest stability (Grade A, CV 0.09) and has grown meaningfully over 14 months. The rideshare stream, while the largest single contributor, carries moderate seasonal variance consistent with platform norms.

The Etsy shop and YouTube channel are early-stage or declining contributors and have been excluded from the sustainable income baseline. This exclusion reduces the headline income figure but improves forecast reliability.

The primary concern for this file is a 3-month payout gap from the rideshare platform in late 2023. The borrower has not provided a satisfactory written explanation. This gap, combined with the missing bank statement period, creates a data confidence ceiling of 78%. A conditional approval is warranted contingent on: (1) written explanation of the rideshare gap, (2) supplemental bank statements covering Oct-Dec 2023, and (3) current Upwork contract confirmation.

At the requested loan amount, the projected monthly payment would represent approximately 9.2% of sustainable monthly income; within acceptable thresholds for borrowers with demonstrated cash reserves.`,
};

const DEMO_HITL_ITEMS: HITLItem[] = [
  {
    id: "h1",
    description: "Large deposit $3,400 - no matching invoice or platform payout",
    amount: "$3,400",
    month: "Sep 2023",
    flag: "Unexplained inflow",
    options: ["Client payment (freelance)", "Asset sale", "Family transfer", "Loan proceeds", "Platform payout - delayed"],
  },
  {
    id: "h2",
    description: "Recurring $380 ACH debit labeled 'WEB PMTS LLC' - unclear payee",
    amount: "$380/mo",
    month: "Jan-Aug 2024",
    flag: "Unclassified recurring debit",
    options: ["Vehicle loan payment", "Insurance premium", "Equipment lease", "Subscription service", "Other debt payment"],
  },
  {
    id: "h3",
    description: "No Uber payouts detected Oct-Dec 2023 despite account remaining active",
    amount: "~$8,400 est.",
    month: "Oct-Dec 2023",
    flag: "Income gap - 3 months",
    options: ["Platform suspension", "Cashed out via alternate account", "Paid via paper check", "Career break", "Unable to explain"],
  },
];

// ── N8N Response Transformer ──────────────────────────────────────────────────
// Converts the raw N8N JSON response into the display format used by Screen3

function formatStreamName(key: string): string {
  const names: Record<string, string> = {
    SALARY: "Salary",
    GIG_INCOME: "Gig Income",
    FREELANCE_INCOME: "Freelance Income",
    RENTAL_INCOME: "Rental Income",
    BUSINESS_INCOME: "Business Income",
    INTEREST: "Interest Income",
    DIVIDEND: "Dividend Income",
    PENSION: "Pension",
  };
  return names[key] || key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategoryName(key: string): string {
  const names: Record<string, string> = {
    RENT: "Rent",
    MORTGAGE: "Mortgage",
    UTILITIES: "Utilities",
    INSURANCE: "Insurance",
    TAX: "Tax / Fees",
    GROCERIES: "Groceries",
    FUEL: "Fuel / Transport",
    HEALTHCARE: "Healthcare",
    EDUCATION: "Education",
    DINING: "Dining & Entertainment",
    SHOPPING: "Shopping",
    SUBSCRIPTION: "Subscriptions",
    ENTERTAINMENT: "Entertainment",
    TRAVEL: "Travel",
    LOAN_PAYMENT: "Loan Payment",
    CREDIT_CARD_PAYMENT: "Credit Card Payment",
  };
  return names[key] || key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMonthKey(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return monthNames[parseInt(month) - 1] + " '" + year.slice(2);
}

function transformN8NResponse(raw: any, loanAmount: number, email: string): any {
  const n8n = Array.isArray(raw) ? raw[0] : raw;

  const totalMeanIncome = n8n.overall?.meanMonthlyIncome || 1;
  const incomeStreams = Object.entries(n8n.incomeStreams || {}).map(([key, stream]: [string, any]) => ({
    source: formatStreamName(key),
    monthly: Math.round(stream.meanMonthlyIncome || 0),
    pct: Math.round(((stream.meanMonthlyIncome || 0) / totalMeanIncome) * 100),
    stability: stream.stability?.grade || "?",
    trend: "flat",
    months: stream.recurrence?.totalMonths || 0,
  }));

  const expensesByType: Record<string, Array<{ label: string; monthly: number }>> = {
    fixed: [],
    essential: [],
    discretionary: [],
    debt: [],
  };
  Object.entries(n8n.expenses?.categories || {}).forEach(([key, cat]: [string, any]) => {
    const typeMap: Record<string, string> = {
      FIXED: "fixed",
      ESSENTIAL: "essential",
      DISCRETIONARY: "discretionary",
      DEBT: "debt",
    };
    const targetType = typeMap[cat.expenseType] || null;
    if (targetType && expensesByType[targetType]) {
      expensesByType[targetType].push({
        label: formatCategoryName(key),
        monthly: Math.round(cat.meanMonthly * 100) / 100,
      });
    }
  });

  const incomeMonths = Object.keys(n8n.overall?.monthlyIncome || {}).sort();
  const monthlyChart = incomeMonths.map((m) => ({
    month: formatMonthKey(m),
    income: Math.round(n8n.overall.monthlyIncome[m] || 0),
    expenses: Math.round((n8n.expenses?.monthlyTotals || {})[m] || 0),
  }));

  const severityMap: Record<string, string> = { CRITICAL: "high", WARNING: "medium", INFO: "low" };
  const redFlags = (n8n.redFlags || []).map((f: any) => ({
    severity: severityMap[f.severity] || "low",
    text: f.explanation || f.type || "Unknown flag",
  }));

  const assessmentMap: Record<string, { verdict: string; label: string }> = {
    STRONG: { verdict: "approved", label: "Strong Approval" },
    REASONABLE: { verdict: "conditional", label: "Conditional Approval" },
    REVIEW: { verdict: "review", label: "Further Review Required" },
    HIGH_RISK: { verdict: "declined", label: "High Risk" },
  };
  const assess = assessmentMap[n8n.underwriting?.assessment] || assessmentMap["REVIEW"];

  const confLevel = n8n.dataConfidence?.confidenceLevel || "Low";
  const confidencePct =
    confLevel === "High" ? 92 : confLevel === "Good" ? 78 : confLevel === "Moderate" ? 55 : 30;

  const dtiValue = n8n.debtAnalysis?.estimatedDTI || 0;
  const dtiWithLoan = n8n.debtAnalysis?.dtiWithNewLoan;
  const dtiDisplay = (dtiWithLoan != null && !isNaN(dtiWithLoan)) ? dtiWithLoan : dtiValue;
  const dtiStatus =
    dtiDisplay < 36 ? "strong" : dtiDisplay < 43 ? "acceptable" : dtiDisplay < 50 ? "elevated" : "high risk";

  const balRunway = n8n.balanceBuffer?.balanceRunway?.months;
  const hasBalanceData = balRunway != null && !isNaN(balRunway);

  const estPayment = n8n.debtAnalysis?.estimatedNewLoanMonthlyPayment
    || Math.round((loanAmount * 0.08) / 12 + loanAmount / 36);

  const sustainableMonthly = n8n.sustainableIncome?.monthlyFloorWeighted || totalMeanIncome;
  const projectedMonthly = n8n.overall?.meanMonthlyIncome || totalMeanIncome;

  const avgBal = n8n.balanceBuffer?.averageBalance || 0;
  const minBal = n8n.balanceBuffer?.minBalance || 0;
  const maxBal = n8n.balanceBuffer?.maxBalance || 0;

  const narrative = n8n.narrative || "Analysis complete. Review the metrics below.";
  const shortNarrative = n8n.shortNarrative || "";
  const dataConfNote = n8n.dataConfidence?.note || "";

  return {
    borrower: { email, loanAmount },
    score: n8n.underwriting?.compositeScore || 50,
    verdict: assess.verdict,
    verdictLabel: assess.label,
    narrative: narrative,
    shortNarrative: shortNarrative,
    dataConfidenceNote: dataConfNote,
    metrics: {
      incomeStability: {
        grade: n8n.overall?.stability?.grade || "?",
        cv: n8n.overall?.stability?.cv != null ? n8n.overall.stability.cv : 0,
        label: n8n.overall?.stability?.label || "Unknown",
      },
      diversification: {
        hhi: n8n.diversification?.hhi || 0,
        score: n8n.diversification?.grade || "Unknown",
        label: (n8n.overall?.streamCount || 0) + " Active Streams",
      },
      dti: {
        ratio: dtiDisplay / 100,
        label: dtiDisplay + "% DTI",
        status: dtiStatus,
      },
      balanceRunway: {
        months: hasBalanceData ? balRunway : 0,
        label: hasBalanceData ? balRunway.toFixed(1) + " mo runway" : "No data",
      },
      dataConfidence: {
        pct: confidencePct,
        label: confidencePct + "% Confidence",
        gaps: 0,
      },
    },
    incomeStreams,
    expenses: expensesByType,
    monthlyChart,
    redFlags,
    sustainableIncome: Math.round(sustainableMonthly),
    projectedIncome: Math.round(projectedMonthly),
    estLoanPayment: Math.round(estPayment),
    cashSummary: {
      avgMonthlyBalance: Math.round(avgBal),
      minMonthlyBalance: Math.round(minBal),
      maxMonthlyBalance: Math.round(maxBal),
      endingBalance: 0,
      avgDailyFloat: 0,
      nsfEvents: 0,
      overdraftCount: 0,
    },
    cashFlow: {
      meanResidual: Math.round(n8n.cashFlow?.meanResidual || 0),
      savingsRate: n8n.cashFlow?.savingsRate || 0,
    },
    monthsAnalyzed: n8n.dataConfidence?.monthsAnalyzed || 0,
    aiNarrative: narrative,
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(99,132,190,0.1)" strokeWidth="10" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="score-ring"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="64" y="60" textAnchor="middle" fill="#e2e8f0" fontSize="28" fontWeight="600" fontFamily="DM Mono">
        {score}
      </text>
      <text x="64" y="76" textAnchor="middle" fill="#4b6a8a" fontSize="10" fontFamily="Inter">
        / 100
      </text>
    </svg>
  );
}

function VerdictBadge({ verdict, label }: { verdict: string; label: string }) {
  const cls =
    verdict === "approved"
      ? "badge-approved"
      : verdict === "conditional"
      ? "badge-conditional"
      : verdict === "declined"
      ? "badge-declined"
      : "badge-review";
  const icon =
    verdict === "approved" ? "\u2713" : verdict === "conditional" ? "\u25D0" : verdict === "declined" ? "\u2715" : "\u2691";
  return (
    <span className={`${cls} inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium mono tracking-wider uppercase`}>
      {icon} {label}
    </span>
  );
}

function GradeChip({ grade }: { grade: string }) {
  return (
    <span className={`grade-bg-${grade} inline-block px-2 py-0.5 rounded-sm text-xs mono font-medium`}>
      {grade}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "high" ? "bg-red-500" : severity === "medium" ? "bg-amber-500" : "bg-blue-500";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${color}`} />;
}

function MetricTooltip({ text }: { text: string }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-sm text-xs hidden group-hover:block z-30 w-56 text-center pointer-events-none" style={{ background: "#1e293b", border: "1px solid rgba(99,132,190,0.3)", color: "#e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
      {text}
    </div>
  );
}

function Expandable({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section-card rounded-sm overflow-hidden">
      <button
        className="expandable-header w-full flex items-center justify-between px-5 py-4"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-text-primary tracking-wide">{title}</span>
        <span className="mono text-text-muted text-sm" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          {"\u25BE"}
        </span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-border animate-in">{children}</div>}
    </div>
  );
}

// ── Screen 1: Intake ──────────────────────────────────────────────────────────
function Screen1({
  onSubmit,
  onDemo,
}: {
  onSubmit: (data: FormData, apiResult?: any) => void;
  onDemo: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const LOADING_STEPS = [
    "Uploading documents...",
    "Classifying document types...",
    "Extracting transactions...",
    "Analyzing income streams...",
    "Computing stability metrics...",
    "Detecting red flags...",
    "Generating assessment...",
  ];

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted = Array.from(incoming).filter((f) =>
      ["application/pdf", "text/csv", "image/jpeg", "image/png"].includes(f.type) ||
      f.name.endsWith(".csv") || f.name.endsWith(".pdf")
    );
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...accepted.filter((f) => !names.has(f.name))];
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!email || !loanAmount || files.length === 0) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    setLoading(true);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);

    try {
      const fd = new FormData();
      fd.append("loanAmount", loanAmount.replace(/,/g, ""));
      fd.append("email", email);
      files.forEach((f) => fd.append("files", f));
      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: fd });
      const result = await res.json();
      console.log("N8N response:", result);
      clearInterval(stepInterval);
      onSubmit({ email, loanAmount, files }, result);
    } catch (err) {
      console.error("N8N call failed, using demo data:", err);
      clearInterval(stepInterval);
      onSubmit({ email, loanAmount, files });
    }
  };

  const valid = email && loanAmount && files.length > 0;

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#070c19" }}>
      <header className="border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "#3b82f6", fontSize: "13px" }}>{"\u25C8"}</div>
          <span className="text-sm font-semibold tracking-tight">SteadView</span>
          <span className="text-xs text-text-muted" style={{ letterSpacing: "0.01em" }}>Income intelligence for lenders</span>
        </div>
        <span className="text-xs text-text-muted mono">v2.4.1</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl animate-in">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-text-primary mb-2">New Income Assessment</h1>
            <p className="text-sm text-text-secondary mb-5">
              Turn messy bank statements into a structured income view, with stability scores, red flag detection, and a proportionality check against the loan requested.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3.5 py-2.5 rounded-sm" style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.15)" }}>
              {["9-layer analysis", "Stability scoring", "Red flag detection", "Human review when uncertain"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  {i > 0 && <span className="text-text-muted">{"\u00B7"}</span>}
                  {s}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                Loan Amount Requested <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm mono">$</span>
                <input type="text" value={loanAmount} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setLoanAmount(v ? Number(v).toLocaleString() : ""); }} placeholder="45,000" required className="input-field w-full rounded-sm pl-8 pr-3.5 py-2.5 text-sm mono" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                Bank Statements / Financial Documents <span className="text-red-400">*</span>
              </label>
              <div className={`upload-zone rounded-sm p-6 text-center cursor-pointer ${dragging ? "dragover" : ""}`} onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
                <input ref={fileRef} type="file" multiple accept=".pdf,.csv,.jpg,.jpeg,.png" className="hidden" onChange={(e) => addFiles(e.target.files)} />
                <div className="text-2xl mb-2" style={{ color: "#3b82f6", opacity: 0.6 }}>{"\u2191"}</div>
                <p className="text-sm text-text-secondary mb-1">Drag & drop files here, or <span className="text-primary underline">browse</span></p>
                <p className="text-xs text-text-muted mono">PDF, CSV, JPG, PNG {"\u00B7"} Bank statements, P&L, tax docs</p>
              </div>
              {files.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {files.map((f) => (
                    <div key={f.name} className="flex items-center justify-between px-3 py-2 rounded-sm" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="mono text-xs" style={{ color: "#3b82f6" }}>{f.name.endsWith(".pdf") ? "PDF" : f.name.endsWith(".csv") ? "CSV" : "IMG"}</span>
                        <span className="text-xs text-text-secondary truncate">{f.name}</span>
                        <span className="text-xs text-text-muted mono shrink-0">{(f.size / 1024).toFixed(0)}kb</span>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(f.name); }} className="text-text-muted hover:text-red-400 ml-3 text-xs transition-colors">{"\u00D7"}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                Assessor Email <span className="text-red-400">*</span>
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourfirm.com" required className="input-field w-full rounded-sm px-3.5 py-2.5 text-sm" />
            </div>

            <div className="pt-1 space-y-3">
              <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-sm text-sm font-semibold relative ${shake ? "shake" : ""}`} style={{ background: loading ? "rgba(14,165,233,0.6)" : "#0ea5e9", color: "#ffffff", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 0 0 1px rgba(14,165,233,0.44), 0 4px 24px rgba(14,165,233,0.36), 0 1px 4px rgba(0,0,0,0.5)", transition: "background 0.12s ease, box-shadow 0.12s ease", letterSpacing: "0.01em" }}
                onMouseEnter={(e) => { if (!loading) { const btn = e.currentTarget as HTMLButtonElement; btn.style.background = "#38bdf8"; btn.style.boxShadow = "0 0 0 1px rgba(56,189,248,0.52), 0 6px 32px rgba(14,165,233,0.48), 0 1px 4px rgba(0,0,0,0.5)"; } }}
                onMouseLeave={(e) => { if (!loading) { const btn = e.currentTarget as HTMLButtonElement; btn.style.background = "#0ea5e9"; btn.style.boxShadow = "0 0 0 1px rgba(14,165,233,0.44), 0 4px 24px rgba(14,165,233,0.36), 0 1px 4px rgba(0,0,0,0.5)"; } }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="flex gap-1">
                      <span className="processing-dot w-1.5 h-1.5 rounded-full bg-white inline-block" />
                      <span className="processing-dot w-1.5 h-1.5 rounded-full bg-white inline-block" />
                      <span className="processing-dot w-1.5 h-1.5 rounded-full bg-white inline-block" />
                    </span>
                    {LOADING_STEPS[loadingStep]}
                  </span>
                ) : (<>{"Run Income Analysis \u2192"}</>)}
              </button>
              {attempted && !valid && (
                <p className="text-xs text-center" style={{ color: "#f59e0b" }}>
                  {!loanAmount ? "Enter the loan amount" : files.length === 0 ? "Upload at least one bank statement" : "Enter your assessor email"}
                </p>
              )}
              <div className="text-center">
                <button type="button" onClick={() => onDemo()} className="text-xs transition-colors" style={{ color: "#4b6a8a" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#0ea5e9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#4b6a8a"; }}
                >{"Try with demo data \u2192"}</button>
              </div>
            </div>
          </form>
          <p className="text-xs text-text-muted text-center mt-6">Analysis is advisory only. Not a substitute for professional underwriting judgment.</p>
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: HITL (Real Data from N8N) ───────────────────────────────────────
function Screen2({ hitlData, resumeUrl, onComplete }: {
  hitlData: any;
  resumeUrl: string;
  onComplete: (analysisResult: any) => void;
}) {
  const flaggedTxns = hitlData?.flaggedTransactions || [];
  const categoryOptions = hitlData?.categoryOptions || { CREDIT: [], DEBIT: [] };
  const reviewSummary = hitlData?.reviewSummary || {};

  const [classifications, setClassifications] = useState<Record<number, string>>({});
  const [exclusions, setExclusions] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const allClassified = flaggedTxns.every((t: any) => classifications[t._id] || exclusions[t._id]);

    const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Update ALL transactions - flagged ones get human corrections applied
      const allTransactions = (hitlData.allTransactions || []).map((txn: any) => {
        if (txn.flagged) {
          return {
            ...txn,
            humanReviewed: true,
            ignored: exclusions[txn._id] || false,
            transactionCategory: exclusions[txn._id] ? txn.transactionCategory : (classifications[txn._id] || txn.transactionCategory),
          };
        }
        return txn;
      });

      console.log("Posting to resumeUrl:", resumeUrl);
      console.log("Total transactions:", allTransactions.length);
      console.log("Classifications:", classifications);
      console.log("Exclusions:", exclusions);

      const proxyUrl = resumeUrl.replace(/https?:\/\/[^/]+/, '');
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allTransactions }),
      });
      const result = await res.json();
      console.log("HITL resume response:", result);
      onComplete(result);
    } catch (err) {
      console.error("HITL submit failed:", err);
      onComplete(null);
    }
  };

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#070c19" }}>
      <header className="border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "#3b82f6", fontSize: "13px" }}>{"\u25C8"}</div>
          <span className="text-sm font-semibold tracking-tight">SteadView</span>
          <span className="text-xs mono px-2 py-0.5 rounded-sm" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
            HUMAN REVIEW REQUIRED
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Step</span>
          <span className="mono text-xs text-amber-400">2 / 3</span>
        </div>
      </header>

      <div className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full animate-in">
        <div className="mb-8">
          <p className="mono text-xs text-amber-400 tracking-widest uppercase mb-2">{"\u2691"} Analyst Verification</p>
          <h2 className="text-xl font-semibold text-text-primary mb-1.5">
            {flaggedTxns.length} transaction{flaggedTxns.length !== 1 ? "s" : ""} require human classification
          </h2>
          <p className="text-sm text-text-secondary">
            {reviewSummary.message || "The AI could not confidently classify the following transactions. Your input will be incorporated into the final assessment."}
          </p>
        </div>

        <div className="space-y-5">
          {flaggedTxns.map((txn: any, idx: number) => {
            const options = categoryOptions[txn.direction] || [];
            const flagReason = txn.flagReasons?.[0];
            const triggerLabel = flagReason?.trigger?.replace(/_/g, " ") || "Flagged";

            return (
              <div key={txn._id} className="section-card rounded-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="mono text-xs text-text-muted mt-0.5 w-5 shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs mono px-2 py-0.5 rounded-sm" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                        {triggerLabel}
                      </span>
                      <span className="text-xs text-text-muted mono">{txn.date}</span>
                      <span className="text-xs font-medium mono" style={{ color: txn.direction === "CREDIT" ? "#10b981" : "#ef4444" }}>
                        {txn.direction === "CREDIT" ? "+" : "-"}${txn.amount.toLocaleString()}
                      </span>
                      <span className="text-xs mono px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(99,132,190,0.1)", color: "#94a3b8" }}>
                        {txn.direction}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mb-1">{txn.description}</p>
                    {flagReason?.detail && (
                      <p className="text-xs text-text-muted mt-1">{flagReason.detail}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-text-muted">AI classified as: <span className="mono text-text-secondary">{txn.transactionCategory}</span></span>
                      <span className="text-xs text-text-muted">Confidence: <span className="mono" style={{ color: txn.classificationConfidence >= 0.8 ? "#f59e0b" : "#ef4444" }}>{(txn.classificationConfidence * 100).toFixed(0)}%</span></span>
                    </div>
                  </div>
                </div>

                <div className="ml-8">
                  {exclusions[txn._id] ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted italic">Excluded from analysis</span>
                      <button onClick={() => setExclusions((prev) => { const next = { ...prev }; delete next[txn._id]; return next; })} className="text-xs text-blue-400 underline">Undo</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Reclassify as:</p>
                      <select
                        value={classifications[txn._id] || ""}
                        onChange={(e) => setClassifications((prev) => ({ ...prev, [txn._id]: e.target.value }))}
                        className="input-field rounded-sm px-3 py-2 text-sm w-full mb-2"
                        style={{ background: "#0d1526", color: "#e2e8f0" }}
                      >
                        <option value="">Keep as {txn.transactionCategory}...</option>
                        {options.map((opt: string) => (
                          <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input type="checkbox" className="sr-only" onChange={(e) => { if (e.target.checked) { setExclusions((prev) => ({ ...prev, [txn._id]: true })); setClassifications((prev) => { const next = { ...prev }; delete next[txn._id]; return next; }); } }} />
                        <div className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center" style={{ border: "1px solid rgba(99,132,190,0.3)" }}>
                        </div>
                        <span className="text-xs text-text-muted">Exclude this transaction from analysis</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex-1 py-3 rounded-sm text-sm font-medium transition-all"
            style={{
              background: (allClassified && !submitting) ? "#3b82f6" : "rgba(59,130,246,0.3)",
              color: (allClassified && !submitting) ? "#fff" : "rgba(255,255,255,0.4)",
              cursor: (allClassified && !submitting) ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Processing corrections..." : "Submit Classifications \u2192 Generate Report"}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-3 text-center">
          {allClassified ? "Ready to submit." : "Classify or exclude all flagged transactions to proceed."}
        </p>
      </div>
    </div>
  );
}

// ── Screen 3: Analysis Dashboard ──────────────────────────────────────────────
function Screen3({ formData, analysisData }: { formData: FormData; analysisData: any }) {
  const [evaluatorScore, setEvaluatorScore] = useState("");
  const [evaluatorDecision, setEvaluatorDecision] = useState("");
  const [evaluatorNote, setEvaluatorNote] = useState("");
  const [noteSubmitted, setNoteSubmitted] = useState(false);
  const loanNum = Number((formData.loanAmount || "45000").replace(/,/g, "")) || 45000;

  const data = analysisData || { ...DEMO_ANALYSIS, borrower: { email: formData.email, loanAmount: loanNum } };

  const totalExpenses =
    [...(data.expenses.fixed || []), ...(data.expenses.essential || []), ...(data.expenses.discretionary || []), ...(data.expenses.debt || [])]
      .reduce((s: number, e: any) => s + e.monthly, 0);

  const donutData = data.incomeStreams.map((s: any) => ({ name: s.source, value: s.monthly }));
  const DONUT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a78bfa", "#ec4899", "#06b6d4"];

  const sustainableIncome = data.sustainableIncome || data.projectedIncome || 1;
  const estPayment = data.estLoanPayment || Math.round((loanNum * 0.065) / 12 + loanNum / (5 * 12));
  const hasBalanceData = data.cashSummary.avgMonthlyBalance > 0 || data.cashSummary.minMonthlyBalance > 0 || data.cashSummary.maxMonthlyBalance > 0;
  const loanIncomeRatio = loanNum / (sustainableIncome * 12);

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#070c19" }}>
      <header className="border-b border-border px-8 py-3.5 flex items-center justify-between sticky top-0 z-20" style={{ background: "#070c19" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "#3b82f6", fontSize: "13px" }}>{"\u25C8"}</div>
          <span className="text-sm font-semibold tracking-tight">SteadView</span>
          <span className="text-xs mono px-2 py-0.5 rounded-sm" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>ANALYSIS COMPLETE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-text-muted mono">{formData.email}</span>
          <span className="text-xs font-medium mono" style={{ color: "#e2e8f0" }}>{fmt(loanNum)} requested</span>
          <span className="text-xs text-text-muted">{formData.files.length} docs {"\u00B7"} {new Date().toLocaleDateString()}</span>
        </div>
      </header>

      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6 animate-in">
        {/* LEVEL 1: Hero */}
        <div className="section-card rounded-sm p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <ScoreRing score={data.score} />
              <div className="relative group">
                <span className="text-xs text-text-muted mono tracking-wider cursor-help border-b border-dashed border-text-muted">STEADVIEW SCORE</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-sm text-xs hidden group-hover:block z-30 w-72 text-center pointer-events-none" style={{ background: "#1e293b", border: "1px solid rgba(99,132,190,0.3)", color: "#e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                  Default weights, not yet calibrated to outcomes. Evaluator scores and actual loan results will refine these through regression over time.
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="mono text-xs text-text-muted tracking-widest uppercase mb-2">Assessment Result</p>
                  <VerdictBadge verdict={data.verdict} label={data.verdictLabel} />
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-muted mono mb-1">LOAN / INCOME RATIO</p>
                  <p className="text-xl font-semibold mono" style={{ color: "#f59e0b" }}>
                    {loanIncomeRatio < 0.1 ? loanIncomeRatio.toFixed(2) : loanIncomeRatio.toFixed(1)}{"\u00D7"}
                  </p>
                  <p className="text-xs text-text-muted">annual sustainable</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-4 border-l-2 pl-3" style={{ borderColor: "rgba(99,132,190,0.3)" }}>
                {data.shortNarrative || data.narrative}
              </p>

              {/* Evaluator capture */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(99,132,190,0.12)" }}>
                <p className="mono text-xs text-text-muted tracking-widest uppercase mb-3">Evaluator Assessment</p>
                {noteSubmitted ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm" style={{ color: "#10b981" }}><span>{"\u2713"}</span> Assessment recorded at {new Date().toLocaleTimeString()}</div>
                    <div className="flex gap-4 text-xs text-text-muted">
                      <span>Tool Score: <span className="mono text-text-primary">{data.score}</span></span>
                      <span>Your Score: <span className="mono text-text-primary">{evaluatorScore || "N/A"}</span></span>
                      <span>Decision: <span className="mono text-text-primary">{evaluatorDecision || "N/A"}</span></span>
                    </div>
                    <p className="text-xs text-text-muted italic">Both scores will be compared against actual loan outcomes to calibrate future model weights.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Your Score (0-100)</label>
                        <input type="number" min="0" max="100" value={evaluatorScore} onChange={(e) => setEvaluatorScore(e.target.value)} placeholder="0-100" className="input-field rounded-sm px-3 py-2 text-sm mono w-24" />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Decision</label>
                        <select value={evaluatorDecision} onChange={(e) => setEvaluatorDecision(e.target.value)} className="input-field rounded-sm px-3 py-2 text-sm w-40" style={{ background: "#0d1526", color: "#e2e8f0" }}>
                          <option value="">Select...</option>
                          <option value="Approve">Approve</option>
                          <option value="Conditional">Conditional</option>
                          <option value="Decline">Decline</option>
                          <option value="Refer">Refer for Review</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <textarea value={evaluatorNote} onChange={(e) => setEvaluatorNote(e.target.value)} placeholder="Add assessment notes, override rationale, or conditions..." rows={2} className="input-field flex-1 rounded-sm px-3 py-2 text-sm resize-none" />
                      <button onClick={() => (evaluatorScore || evaluatorDecision) && setNoteSubmitted(true)} disabled={!evaluatorScore && !evaluatorDecision} className="px-4 py-2 rounded-sm text-xs font-medium transition-all shrink-0 self-end" style={{ background: (evaluatorScore || evaluatorDecision) ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.08)", color: (evaluatorScore || evaluatorDecision) ? "#3b82f6" : "#4b6a8a", border: "1px solid rgba(59,130,246,0.2)", cursor: (evaluatorScore || evaluatorDecision) ? "pointer" : "not-allowed" }}>Submit</button>
                    </div>
                    <p className="text-xs text-text-muted">Your assessment is recorded alongside the tool's score. Over time, actual loan outcomes calibrate which factors best predict repayment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LEVEL 2: Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="metric-card rounded-sm p-4 relative group">
            <p className="text-xs text-text-muted uppercase tracking-wider mono mb-3">Income Stability</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold mono" style={{ color: data.metrics.incomeStability.cv < 5 ? "#10b981" : data.metrics.incomeStability.cv < 15 ? "#f59e0b" : "#ef4444" }}>
                {data.metrics.incomeStability.cv < 1 ? (data.metrics.incomeStability.cv * 100).toFixed(1) : data.metrics.incomeStability.cv.toFixed(1)}%
              </span>
              <span className="text-xs text-text-muted">CV</span>
            </div>
            <p className="text-xs text-text-secondary">{data.metrics.incomeStability.label}</p>
            <MetricTooltip text="Coefficient of Variation - how much monthly income swings around the average. Lower is better. Under 5% is payroll-level stable." />
          </div>
          <div className="metric-card rounded-sm p-4 relative group">
            <p className="text-xs text-text-muted uppercase tracking-wider mono mb-3">Source Diversity</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold mono" style={{ color: "#3b82f6" }}>{data.metrics.diversification.hhi.toFixed(2)}</span>
              <span className="text-xs text-text-muted">HHI</span>
            </div>
            <p className="text-xs text-text-secondary">{data.metrics.diversification.label}</p>
            <MetricTooltip text="Herfindahl-Hirschman Index - measures income concentration across sources. Lower means more diversified. Under 0.25 is well-diversified." />
          </div>
          <div className="metric-card rounded-sm p-4 relative group">
            <p className="text-xs text-text-muted uppercase tracking-wider mono mb-3">Debt-to-Income</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold mono" style={{ color: data.metrics.dti.ratio < 0.36 ? "#10b981" : data.metrics.dti.ratio < 0.45 ? "#f59e0b" : "#ef4444" }}>{(data.metrics.dti.ratio * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-text-secondary capitalize">{data.metrics.dti.status}</p>
            <MetricTooltip text="Existing debt payments as share of gross income. Lower is better. Under 36% is strong by Fannie Mae standards." />
          </div>
          <div className="metric-card rounded-sm p-4 relative group">
            <p className="text-xs text-text-muted uppercase tracking-wider mono mb-3">Balance Runway</p>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-lg font-semibold mono" style={{ color: "#14b8a6" }}>{data.metrics.balanceRunway.months > 0 ? data.metrics.balanceRunway.months : "N/A"}</span>
              {data.metrics.balanceRunway.months > 0 && <span className="text-xs text-text-muted">mo</span>}
            </div>
            <p className="text-xs text-text-secondary">{data.metrics.balanceRunway.months > 0 ? "Expense coverage" : "Insufficient data"}</p>
            <MetricTooltip text="Months of expenses coverable from savings alone. Higher is better. 6+ months is strong by Non-QM reserve standards." />
          </div>
          <div className="metric-card rounded-sm p-4 relative group">
            <p className="text-xs text-text-muted uppercase tracking-wider mono mb-3">Data Confidence</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold mono" style={{ color: data.metrics.dataConfidence.pct >= 85 ? "#10b981" : data.metrics.dataConfidence.pct >= 65 ? "#f59e0b" : "#ef4444" }}>{data.metrics.dataConfidence.pct}%</span>
            </div>
            <p className="text-xs text-text-secondary">{data.monthsAnalyzed ? data.monthsAnalyzed + " months analyzed" : data.metrics.dataConfidence.gaps + " gap period"}</p>
            <MetricTooltip text="Based on months of data provided vs. industry standard (12-24 months for Non-QM). Higher is better. More months = more reliable." />
          </div>
        </div>

        {/* Data Confidence Banner */}
        <div className="rounded-sm px-4 py-2.5 flex items-center gap-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span className="text-amber-400 text-sm">{"\u26A0"}</span>
          <p className="text-xs text-amber-400">
            <span className="font-medium">Data Confidence: {data.metrics.dataConfidence.pct}%</span> - {data.dataConfidenceNote || (data.monthsAnalyzed ? "Only " + data.monthsAnalyzed + " month(s) of data. Insufficient for reliable income assessment. Non-QM standards require 12-24 months." : "Gap periods detected. Supplemental statements may improve score.")}
          </p>
        </div>

        {/* Income Breakdown */}
        <Expandable title="Income Breakdown by Stream" defaultOpen>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">{["Source", "Avg Monthly", "Share", "Stability", "Trend", "History"].map((h) => (<th key={h} className="pb-2 pr-4 text-left text-xs text-text-muted mono font-normal uppercase tracking-wider last:pr-0">{h}</th>))}</tr></thead>
              <tbody>
                {data.incomeStreams.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-text-primary">{s.source}</td>
                    <td className="py-3 pr-4 mono font-medium" style={{ color: "#e2e8f0" }}>{fmt(s.monthly)}</td>
                    <td className="py-3 pr-4"><div className="flex items-center gap-2"><div className="w-16 h-1 rounded-full" style={{ background: "rgba(99,132,190,0.15)" }}><div className="h-1 rounded-full" style={{ width: `${s.pct}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} /></div><span className="text-xs mono text-text-secondary">{s.pct}%</span></div></td>
                    <td className="py-3 pr-4"><GradeChip grade={s.stability} /></td>
                    <td className="py-3 pr-4"><span className="text-xs mono" style={{ color: s.trend === "up" ? "#10b981" : s.trend === "down" ? "#ef4444" : "#94a3b8" }}>{s.trend === "up" ? "\u2191" : s.trend === "down" ? "\u2193" : "\u2192"} {s.trend}</span></td>
                    <td className="py-3 mono text-xs text-text-muted">{s.months} mo</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2" style={{ borderColor: "rgba(99,132,190,0.25)" }}><td className="pt-3 font-medium text-text-primary">Total</td><td className="pt-3 mono font-semibold" style={{ color: "#e2e8f0" }}>{fmt(data.incomeStreams.reduce((s: number, i: any) => s + i.monthly, 0))}</td><td className="pt-3 mono text-xs text-text-muted">100%</td><td colSpan={3} /></tr></tfoot>
            </table>
          </div>
        </Expandable>

        {/* Expense Breakdown */}
        <Expandable title="Expense Breakdown">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[{ label: "Fixed", items: data.expenses.fixed || [], color: "#ef4444" }, { label: "Essential", items: data.expenses.essential || [], color: "#f59e0b" }, { label: "Discretionary", items: data.expenses.discretionary || [], color: "#3b82f6" }, { label: "Debt Service", items: data.expenses.debt || [], color: "#a78bfa" }].map(({ label, items, color }) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wider mb-2 mono" style={{ color }}>{label}</p>
                {items.length > 0 ? (<div className="space-y-1.5">{items.map((e: any) => (<div key={e.label} className="flex justify-between items-center text-sm"><span className="text-text-secondary">{e.label}</span><span className="mono text-text-primary">{fmt(e.monthly)}</span></div>))}<div className="flex justify-between items-center text-xs pt-1.5 mt-1 border-t" style={{ borderColor: "rgba(99,132,190,0.15)" }}><span className="text-text-muted">Subtotal</span><span className="mono font-medium text-text-primary">{fmt(items.reduce((s: number, e: any) => s + e.monthly, 0))}</span></div></div>) : (<p className="text-xs text-text-muted italic">None detected</p>)}
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 flex justify-between items-center border-t" style={{ borderColor: "rgba(99,132,190,0.2)" }}><span className="text-sm text-text-secondary">Total Monthly Expenses</span><span className="mono text-lg font-semibold text-text-primary">{fmt(totalExpenses)}</span></div>
        </Expandable>

        {/* Monthly Chart */}
        {data.monthlyChart && data.monthlyChart.length > 0 && (
          <Expandable title={`Monthly Income vs. Expenses (${data.monthlyChart.length}-month)`} defaultOpen>
            <div className="mt-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,132,190,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: "#4b6a8a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4b6a8a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#111d33", border: "1px solid rgba(99,132,190,0.2)", borderRadius: "2px", fontSize: "12px", fontFamily: "DM Mono", color: "#e2e8f0" }} formatter={(v: unknown) => [fmt(Number(v)), ""]} />
                  <Area type="linear" dataKey="income" name="Income" stroke="#3b82f6" strokeWidth={1.5} fill="url(#incomeGrad)" />
                  <Area type="linear" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={1.5} fill="url(#expenseGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-5 mt-2">
              <div className="flex items-center gap-2"><div className="w-3 h-0.5 rounded-full" style={{ background: "#3b82f6" }} /><span className="text-xs text-text-muted">Income</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-0.5 rounded-full" style={{ background: "#ef4444" }} /><span className="text-xs text-text-muted">Expenses</span></div>
            </div>
          </Expandable>
        )}

        {/* Income Composition Donut */}
        <Expandable title="Income Composition">
          <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
            <div style={{ width: 220, height: 220, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} strokeWidth={0} dataKey="value">{donutData.map((_: any, i: number) => (<Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />))}</Pie><Tooltip contentStyle={{ background: "#111d33", border: "1px solid rgba(99,132,190,0.2)", borderRadius: "2px", fontSize: "12px", fontFamily: "DM Mono", color: "#e2e8f0" }} formatter={(v: unknown) => [fmt(Number(v)), "Monthly avg"]} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {data.incomeStreams.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} /><span className="text-text-secondary">{s.source}</span></div>
                  <div className="flex items-center gap-3"><span className="mono text-text-primary">{fmt(s.monthly)}</span><span className="mono text-xs text-text-muted w-8 text-right">{s.pct}%</span></div>
                </div>
              ))}
            </div>
          </div>
        </Expandable>

        {/* Red Flags */}
        {data.redFlags && data.redFlags.length > 0 && (
          <Expandable title={`Red Flags (${data.redFlags.length})`}>
            <div className="mt-4 space-y-3">
              {data.redFlags.map((flag: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <SeverityDot severity={flag.severity} />
                  <div>
                    <span className="text-xs mono px-1.5 py-0.5 rounded-sm mr-2" style={{ background: flag.severity === "high" ? "rgba(239,68,68,0.12)" : flag.severity === "medium" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)", color: flag.severity === "high" ? "#ef4444" : flag.severity === "medium" ? "#f59e0b" : "#3b82f6", border: `1px solid ${flag.severity === "high" ? "rgba(239,68,68,0.25)" : flag.severity === "medium" ? "rgba(245,158,11,0.25)" : "rgba(59,130,246,0.25)"}` }}>{flag.severity.toUpperCase()}</span>
                    <span className="text-sm text-text-secondary">{flag.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </Expandable>
        )}

        {/* Sustainable vs Projected */}
        <Expandable title="Sustainable vs. Projected Income">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-sm p-4" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}><p className="text-xs mono text-text-muted uppercase tracking-wider mb-2">Sustainable (Conservative)</p><p className="text-2xl font-semibold mono" style={{ color: "#10b981" }}>{fmt(sustainableIncome)}</p><p className="text-xs text-text-muted mt-1">/month {"\u00B7"} floor-weighted across streams</p></div>
            <div className="rounded-sm p-4" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)" }}><p className="text-xs mono text-text-muted uppercase tracking-wider mb-2">Projected (All Streams)</p><p className="text-2xl font-semibold mono" style={{ color: "#3b82f6" }}>{fmt(data.projectedIncome)}</p><p className="text-xs text-text-muted mt-1">/month {"\u00B7"} trailing avg</p></div>
            <div className="rounded-sm p-4" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}><p className="text-xs mono text-text-muted uppercase tracking-wider mb-2">Est. Loan Payment</p><p className="text-2xl font-semibold mono" style={{ color: "#f59e0b" }}>{fmt(estPayment)}</p><p className="text-xs text-text-muted mt-1">/month {"\u00B7"} {((estPayment / sustainableIncome) * 100).toFixed(1)}% of sustainable income</p></div>
          </div>
        </Expandable>

        {/* Balance Buffer */}
        <Expandable title="Balance Buffer Metrics">
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{ label: "Avg Monthly Balance", value: data.cashSummary.avgMonthlyBalance ? fmt(data.cashSummary.avgMonthlyBalance) : "N/A", color: data.cashSummary.avgMonthlyBalance ? "#e2e8f0" : "#4b6a8a" }, { label: "Min Balance", value: data.cashSummary.minMonthlyBalance ? fmt(data.cashSummary.minMonthlyBalance) : "N/A", color: data.cashSummary.minMonthlyBalance ? "#f59e0b" : "#4b6a8a" }, { label: "Max Balance", value: data.cashSummary.maxMonthlyBalance ? fmt(data.cashSummary.maxMonthlyBalance) : "N/A", color: data.cashSummary.maxMonthlyBalance ? "#10b981" : "#4b6a8a" }, { label: "Savings Rate", value: data.cashFlow?.savingsRate ? data.cashFlow.savingsRate.toFixed(1) + "%" : "N/A", color: data.cashFlow?.savingsRate ? "#3b82f6" : "#4b6a8a" }].map(({ label, value, color }) => (
              <div key={label} className="rounded-sm p-3.5" style={{ background: "rgba(13,21,38,0.8)", border: "1px solid rgba(99,132,190,0.1)" }}><p className="text-xs text-text-muted mb-2 leading-tight">{label}</p><p className="text-lg font-semibold mono" style={{ color }}>{value}</p></div>
            ))}
          </div>
          {!hasBalanceData && (<div className="mt-3 px-3 py-2 rounded-sm text-xs" style={{ background: "rgba(99,132,190,0.07)", border: "1px solid rgba(99,132,190,0.15)", color: "#94a3b8" }}>Balance data was not available in the uploaded statements. Providing statements with running balances would enable reserve and runway analysis.</div>)}
          <div className="mt-3 flex gap-4">
            <div className="flex items-center gap-2"><span className="mono text-xs" style={{ color: "#10b981" }}>{"\u2713"}</span><span className="text-xs text-text-secondary">{data.cashSummary.nsfEvents || 0} NSF events</span></div>
            <div className="flex items-center gap-2"><span className="mono text-xs" style={{ color: "#10b981" }}>{"\u2713"}</span><span className="text-xs text-text-secondary">{data.cashSummary.overdraftCount || 0} overdraft incidents</span></div>
          </div>
        </Expandable>

        {/* Cash Flow Summary */}
        <Expandable title="Cash Flow Summary">
          <div className="mt-4"><div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[["Avg Gross Monthly Income", fmt(data.incomeStreams.reduce((s: number, i: any) => s + i.monthly, 0))], ["Avg Monthly Expenses", fmt(totalExpenses)], ["Net Monthly Cash Flow", fmt(data.cashFlow?.meanResidual || (data.incomeStreams.reduce((s: number, i: any) => s + i.monthly, 0) - totalExpenses))], ["Projected Annual Income", fmt(data.projectedIncome * 12)], ["Sustainable Annual Income", fmt(sustainableIncome * 12)], ["Savings Rate", data.cashFlow?.savingsRate ? data.cashFlow.savingsRate.toFixed(1) + "%" : "N/A"]].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0"><span className="text-sm text-text-secondary">{label}</span><span className="mono text-sm font-medium text-text-primary">{val}</span></div>
            ))}
          </div></div>
        </Expandable>

        {/* AI Narrative */}
        <Expandable title="AI Narrative Analysis" defaultOpen>
          <div className="mt-4 space-y-4">
            {data.aiNarrative.split("\n\n").map((para: string, i: number) => (<p key={i} className="text-sm text-text-secondary leading-relaxed">{para}</p>))}
          </div>
          <div className="mt-5 flex items-center gap-2 pt-4 border-t" style={{ borderColor: "rgba(99,132,190,0.12)" }}>
            <span className="text-xs mono px-2 py-0.5 rounded-sm" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>AI Generated</span>
            <span className="text-xs text-text-muted">Model: SteadView v2.4 {"\u00B7"} Generated {new Date().toLocaleString()} {"\u00B7"} This narrative is advisory only and does not constitute a credit decision.</span>
          </div>
        </Expandable>

        <div className="pb-8" />
      </div>
    </div>
  );
}

// ── Help Button ───────────────────────────────────────────────────────────────
function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="absolute bottom-10 right-0 mb-1 rounded-sm overflow-hidden animate-in" style={{ background: "#111d33", border: "1px solid rgba(99,132,190,0.2)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: "148px" }}>
          {[{ label: "User Guide", icon: "\u2197", href: "https://github.com/hsgarg/SteadView/blob/main/README.md" }, { label: "Contact", icon: "\u2709", href: "mailto:harsh.sagar.garg.2028@anderson.ucla.edu" }].map(({ label, icon, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors" style={{ color: "#94a3b8", textDecoration: "none", display: "flex" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#e2e8f0"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(99,132,190,0.07)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            ><span className="mono text-xs" style={{ color: "#4b6a8a" }}>{icon}</span>{label}</a>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mono transition-all" style={{ background: open ? "rgba(99,132,190,0.2)" : "rgba(13,21,38,0.95)", color: "#64748b", border: "1px solid rgba(99,132,190,0.25)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,132,190,0.45)"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
        onMouseLeave={(e) => { if (!open) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,132,190,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; } }}
      >?</button>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("intake");
  const [formData, setFormData] = useState<FormData>({ email: "", loanAmount: "", files: [] });
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [hitlData, setHitlData] = useState<any>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");

  const handleIntake = (data: FormData, apiResult?: any) => {
    setFormData(data);
    if (apiResult) {
      const raw = Array.isArray(apiResult) ? apiResult[0] : apiResult;
      console.log("N8N response - hitlRequired:", raw.hitlRequired);

      if (raw.hitlRequired === true) {
        console.log("HITL triggered, flagged:", raw.flaggedTransactions?.length);
        setHitlData(raw);
        setResumeUrl(raw.resumeUrl || "");
        setScreen("hitl");
        return;
      }

      try {
        const loanNum = Number(data.loanAmount.replace(/,/g, "")) || 45000;
        const transformed = transformN8NResponse(apiResult, loanNum, data.email);
        console.log("Transformed data:", transformed);
        setAnalysisData(transformed);
      } catch (err) {
        console.error("Transform failed, using demo data:", err);
        setAnalysisData(null);
      }
    } else {
      setAnalysisData(null);
    }
    setScreen("analysis");
  };

  const handleHITLComplete = (analysisResult: any) => {
    if (analysisResult) {
      try {
        const loanNum = Number(formData.loanAmount.replace(/,/g, "")) || 45000;
        const transformed = transformN8NResponse(analysisResult, loanNum, formData.email);
        console.log("Post-HITL transformed data:", transformed);
        setAnalysisData(transformed);
      } catch (err) {
        console.error("Post-HITL transform failed:", err);
        setAnalysisData(null);
      }
    } else {
      setAnalysisData(null);
    }
    setScreen("analysis");
  };

  const handleDemo = () => {
    setFormData({ email: "demo@steadview.io", loanAmount: "45,000", files: [new File([], "demo_statements.pdf")] });
    setAnalysisData(null);
    setScreen("analysis");
  };

  return (
    <div className="size-full overflow-y-auto" style={{ background: "#070c19" }}>
      {screen === "intake" && <Screen1 onSubmit={handleIntake} onDemo={handleDemo} />}
      {screen === "hitl" && <Screen2 hitlData={hitlData} resumeUrl={resumeUrl} onComplete={handleHITLComplete} />}
      {screen === "analysis" && <Screen3 formData={formData} analysisData={analysisData} />}
      <HelpButton />
    </div>
  );
}
