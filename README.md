# SteadView
Improve loan approval rates for gig workers by making underwriting faster. 

---

## Why This Product Exists

### The Job to Be Done

An underwriter sits down with a gig worker's bank statements and needs to answer one question: **"Can I trust this income?"**

Traditional income verification assumes a salary and a pay stub. But over 70 million Americans now participate in freelance or gig work, representing approximately 36% of the total U.S. workforce [1][2]. Their income arrives from multiple platforms, varies month to month, and appears across hundreds of bank transactions. By 2027, freelancers are projected to make up over 50% of the U.S. workforce [3].

Today, an underwriter manually reviews those statements, identifies income transactions, separates them from transfers and refunds, classifies sources, calculates totals, and compares against the loan request. This takes hours per application and is nearly impossible to standardize.

**SteadView automates the repetitive analysis while keeping the underwriter responsible for exceptions and final judgment.**

### Where SteadView Fits in Lending

Lending decisions fundamentally rest on two questions [4][5]:

1. **Can the borrower pay?** (Ability to pay) - Does the borrower have enough income, after existing obligations, to make the loan payments? This is what the numbers show: income, debt-to-income ratio, expenses, cash reserves.

2. **Will the borrower pay?** (Willingness to pay) - Has the borrower historically honored financial commitments? This shows up in credit history, payment patterns, employment stability, and behavioral signals.

Traditional credit bureaus (FICO, Experian, TransUnion) primarily answer question #2. They measure **willingness to pay** through credit history, payment behavior, utilization patterns, and length of credit history [5].

**SteadView answers question #1 for borrowers whose income doesn't fit traditional verification.** A gig worker's FICO score may show they *want* to pay, but a lender still needs to know: *can* they pay, reliably, given income that arrives from five platforms in varying amounts?

SteadView is not a credit bureau competitor. It's the missing piece: **income intelligence** that complements credit scores by quantifying the stability, sustainability, and sufficiency of non-traditional income.

### The Scale of the Problem

#### Time and Cost

Manual bank statement review is the single largest bottleneck in loan origination [6][7]:

| Metric | Value | Source |
|--------|-------|--------|
| Manual review time per statement | 20-40 minutes | ClearStaq industry benchmark [6] |
| Line items in a 12-month statement set | 300+ across multiple accounts | ClearStaq [6] |
| Self-employed files vs. W-2 files | 2-3x longer to review | ClearStaq, CapStonePlanet [6][8] |
| Document verification share of total review time | 60-70% | ClearStaq [7] |
| Average cost to originate one mortgage | $11,800 | Freddie Mac Q2 2025 [9][10] |
| Personnel cost per loan | ~$7,700 (67% of total) | Ocrolus / MBA data [11] |
| Fulfillment costs (processing, underwriting, closing) | $3,483-$4,077 per loan | Ocrolus / MBA data [11] |

Automated tools are already proving the savings potential:
- Freddie Mac's Loan Product Advisor saves **$1,700 per loan** and **5 days** of cycle time [9]
- AI document processing cuts review time by **up to 95%** and saves **$230-$570 per loan** [7][11]

SteadView targets the same bottleneck: the manual, repetitive work of reading bank statements, classifying transactions, and computing income metrics. The underwriter's judgment remains; the data entry disappears.

#### Fraud Exposure

Income misrepresentation is the most common fraud type in mortgage lending [12][13]:

| Metric | Value | Source |
|--------|-------|--------|
| Mortgage applications with fraud indicators | 1 in 116 (Q2 2025) | Cotality (formerly CoreLogic) Annual Fraud Report [12] |
| Fraud risk year-over-year increase | 6.1% (Q2 2025) | Cotality [12] |
| Income fraud share of Fannie Mae findings | 46% of all fraud cases (through 2024) | Cotality / Fannie Mae [12] |
| Median loss per mortgage fraud case | $849,584 | U.S. Sentencing Commission FY2025 [13] |
| Fraud cost multiplier | 4.5x the original transaction value | BackOfficePro / LexisNexis [14] |
| Canadian mortgage fraud involving falsified documents | 90%+ of cases | BackOfficePro [14] |

SteadView's red flag detection (round-number deposits, income spikes, missing months, internal transfers) surfaces the patterns that manual reviewers miss when scanning hundreds of transactions. It doesn't replace fraud investigation; it ensures suspicious patterns reach the underwriter's attention before a lending decision is made.

### Core Product Value

V1 answered: *"How much does this person earn?"*

V2 answers: **"How much can this person reliably earn going forward, and how confident should we be in that assessment?"**

That shift - from measuring income to measuring *sustainable* income - is what separates a calculator from an underwriting tool.

---

## How It Works

### The User Flow

```
Underwriter                    SteadView                         AI Pipeline
    |                              |                                  |
    |-- Upload statements -------->|                                  |
    |   + loan amount              |-- Classify documents ----------->|
    |   + assessor email           |-- Extract transactions --------->|
    |                              |-- Categorize income + expenses -->|
    |                              |-- Compute 9-layer analytics ----->|
    |                              |-- Detect red flags -------------->|
    |                              |-- Generate assessment ----------->|
    |                              |                                  |
    |<-- Stability Profile --------|                                  |
    |<-- Metric cards -------------|                                  |
    |<-- Income breakdown ---------|                                  |
    |<-- Expense analysis ---------|                                  |
    |<-- Red flags ----------------|                                  |
    |<-- Charts + narrative -------|                                  |
    |                              |                                  |
    |-- Enter evaluator score ---->|                                  |
    |-- Enter decision ----------->|                                  |
    |-- Add notes ---------------->|                                  |
    |                              |                                  |
    |   [Recorded for calibration] |                                  |
```

### The 9-Layer Analysis

| Layer | What It Does | Why It Matters |
|-------|-------------|----------------|
| 1. Document Classification | Identifies bank statements vs. other documents | Only analyzes relevant financial data |
| 2. Transaction Extraction | Pulls every credit and debit from each page | Raw data for all downstream analysis |
| 3. Income Categorization | Classifies income as salary, gig, freelance, rental, business, interest, dividend, or pension | Different income types carry different reliability profiles |
| 4. Expense Categorization | Groups spending into fixed, essential, discretionary, debt, and investigate | Reveals what the borrower *must* pay vs. what they *choose* to pay |
| 5. Stability Analysis | Computes volatility (CV), recurrence, and consistency per stream | Quantifies what underwriters assess subjectively |
| 6. Diversification Analysis | Measures income concentration across sources (HHI) | Single-source dependency is a known risk factor |
| 7. Red Flag Detection | Scans for round-number deposits, spikes, gaps, missing months | Surfaces patterns a human reviewer might miss in hundreds of transactions |
| 8. Balance Buffer Analysis | Evaluates cash reserves and runway (when balance data is available) | Can the borrower survive a bad month? |
| 9. Composite Assessment | Combines all layers into a SteadView Score and verdict | One-glance summary for the underwriter |

---

## Understanding the Dashboard

### SteadView Score (0-100)

A weighted summary of all analytical layers. **This score uses default weights that have not been calibrated to actual loan outcomes.**

| Range | Assessment | What It Means |
|-------|-----------|---------------|
| 75-100 | **Strong** | Income profile supports the loan request across most dimensions |
| 55-74 | **Conditional** | Supportable with conditions or additional documentation |
| 35-54 | **Review** | Significant concerns; requires detailed human evaluation |
| 0-34 | **High Risk** | Multiple risk factors present; loan may not be supportable |

**Why "default weights"?** The score combines seven factors (loan-to-income, stability, recurrence, diversification, red flags, DTI, residual income) using starting-point weights. These are informed hypotheses, not statistically calibrated values. See [The Calibration Flywheel](#the-calibration-flywheel) for how these weights improve over time.

---

### The Five Metric Cards

#### 1. Income Stability (CV %)

**What it is:** Coefficient of Variation - standard deviation divided by mean, expressed as a percentage. A standard statistical measure of dispersion used across finance.

**What it tells you:** How much monthly income swings around the average. A borrower earning $5,000/month with a CV of 5% varies by about $250/month. A CV of 40% means swings of $2,000/month.

| CV | Label | What It Looks Like |
|----|-------|-------------------|
| Under 5% | Stable | Payroll-level consistency. Salaried employee with minor overtime variation. |
| 5-15% | Moderate | Normal variation for a steady freelancer with regular clients. |
| 15-30% | Variable | Meaningful month-to-month swings. Common in seasonal or project-based work. |
| Over 30% | Volatile | Income swings by a third or more of the average. Genuinely unpredictable. |

**Lower is better.** These thresholds are configurable defaults, not regulatory cutoffs. They quantify what Fannie Mae Selling Guide B3-3.1 means by "stable, predictable, and likely to continue."

#### 2. Source Diversity (HHI)

**What it is:** Herfindahl-Hirschman Index - the sum of squared income shares across all streams. The same measure used by the DOJ and Federal Reserve for market concentration analysis.

**What it tells you:** How dependent the borrower is on a single income source. If one source disappears, how much income remains?

| HHI | Label | What It Looks Like |
|-----|-------|-------------------|
| Under 0.25 | Well-Diversified | Income spread across 4+ roughly equal sources |
| 0.25-0.50 | Moderate | 2-3 sources with some concentration |
| Over 0.50 | Concentrated | One source dominates; loss of that source = most income gone |

**Lower is better.** Conceptually borrowed from antitrust economics and portfolio diversification theory.

#### 3. Debt-to-Income (DTI %)

**What it is:** Identified monthly debt payments divided by gross monthly income, expressed as a percentage. This is an industry-standard measure with prescribed thresholds.

**What it tells you:** How much of the borrower's income is already committed to existing debt obligations.

| DTI | Label | Industry Basis |
|-----|-------|---------------|
| Under 36% | Strong | Fannie Mae preferred threshold |
| 36-43% | Acceptable | Within Fannie Mae maximum; FHA standard limit |
| 43-50% | Elevated | FHA maximum with compensating factors; Non-QM range |
| Over 50% | High Risk | Exceeds standard thresholds across most programs |

**Lower is better.** DTI thresholds are the most grounded of all metrics in this product: Fannie Mae, FHA, and Non-QM programs all publish specific DTI limits [15].

#### 4. Balance Runway

**What it is:** Minimum account balance divided by average monthly expenses. Expressed in months.

**What it tells you:** How many months the borrower could cover expenses with zero income, based on their lowest observed account balance.

| Months | Label | Industry Basis |
|--------|-------|---------------|
| 6+ | Strong | Exceeds Non-QM reserve requirements (Angel Oak, Deephaven: 3-6 months) |
| 3-6 | Adequate | Meets typical Non-QM reserve standards |
| 1-3 | Thin | Below standard; limited buffer for disruptions |
| Under 1 | Critical | Living paycheck to paycheck; high vulnerability |

**Higher is better.** Note: This metric requires account balance data in the uploaded statements. When balance data is unavailable, it displays N/A.

#### 5. Data Confidence (%)

**What it is:** A measure of how much data the tool has to work with, benchmarked against industry standards for bank statement lending programs.

**What it tells you:** Whether the analysis is based on enough data to be reliable.

| Months Provided | Confidence | Note |
|-----------------|-----------|------|
| 12-24 months | High (85%+) | Meets Non-QM bank statement program requirements [16] |
| 6-11 months | Good (65-84%) | Reasonable data window; 12+ months preferred |
| 3-5 months | Moderate (40-64%) | Preliminary assessment only |
| 1-2 months | Low (under 40%) | Insufficient for reliable income assessment |

**Higher is better.** Non-QM bank statement loan programs (Defy Mortgage, Angel Oak, Deephaven, National Mortgage Center) typically require 12-24 consecutive months of statements [16].

---

### Red Flags

The system automatically scans for patterns that may warrant additional scrutiny:

| Flag | What It Detects | Why It Matters |
|------|----------------|---------------|
| Round-number deposits | Deposits that are exact multiples of $100 over $500 | Known indicator of fabricated or doctored statements [6] |
| Income spikes | Deposits exceeding 3x the stream's monthly average | May inflate average income unrealistically |
| Missing months | Expected income stream absent in one or more months | Questions whether income is ongoing |
| Single-appearance streams | Income source appears in only 1 of N months | Cannot be relied on to continue |

Red flags do not automatically change the assessment. They are surfaced for the underwriter to investigate.

---

### Expense Categories

All identified debits are classified into obligation types:

| Category | Examples | Why It Matters |
|----------|----------|---------------|
| **Fixed** | Rent, mortgage, utilities, insurance | Non-negotiable; borrower cannot cut these |
| **Essential** | Groceries, fuel, healthcare, education | Necessary but somewhat flexible |
| **Discretionary** | Dining, shopping, subscriptions, travel | Can be reduced or eliminated if needed |
| **Debt** | Loan payments, credit card payments | Existing obligations that drive DTI |
| **Investigate** | ATM withdrawals, unclassified transfers | Cannot be categorized further; flagged for underwriter |

**Note on gross vs. net income:** For self-employed and freelance borrowers, bank deposits reflect gross receipts, not net income. Actual income available for loan repayment may be lower after business expenses. Underwriters should request a P&L or Schedule C for self-employment verification.

---

### Sustainable vs. Projected Income

| Metric | How It's Calculated | What It Means |
|--------|-------------------|---------------|
| **Projected Income** | Mean monthly income across all streams | Average-case scenario |
| **Sustainable Income** | Floor-weighted across streams (uses each stream's worst month) | Conservative scenario; can the borrower service the loan on a bad month? |

Sustainable income is typically lower than projected income. The gap between them indicates how much risk the lender takes by underwriting to the average rather than the floor.

**Basis:** Fannie Mae requires declining self-employment income to be underwritten at the lower figure. The floor-weighted approach extends this principle to all variable income streams.

---

## The Calibration Flywheel

The SteadView Score's default weights (Loan-to-Income 20%, Stability 20%, DTI 15%, Residual Income 15%, Recurrence 10%, Diversification 10%, Red Flags 10%) are starting-point hypotheses, not statistically validated coefficients.

The product captures three data points over time:

1. **The tool's score** - the composite score and all individual metrics
2. **The evaluator's independent assessment** - the human underwriter's score, decision, and notes
3. **The actual outcome** - did the borrower default within 12/24/36/60 months?

With 3-5 years of this data across thousands of loans, regression analysis can identify which factors actually predict defaults and at what weights. The default weights get replaced by data-driven ones.

This is how FICO was built. Fair Isaac started with expert hypotheses about what mattered, collected outcome data across millions of loans, and refined weights through statistical analysis of actual defaults over decades. SteadView builds the data collection infrastructure for that same journey, specific to non-traditional income.

```
Tool Score: 62         Evaluator Score: 55        Decision: Refer
                              |
                    12-60 months pass
                              |
               Outcome: Default / Current / Paid Off
                              |
               Regression: which factors predicted this?
                              |
               Calibrated weights (V3, V4, V5...)
```

---

## Known Limitations

1. **Gross receipts vs. net income.** Bank deposits show revenue, not profit. For self-employed borrowers, the tool cannot determine business expenses from bank data alone.

2. **Payment channel vs. economic source.** The same client paying through Stripe, PayPal, and Venmo may appear as three sources (overstating diversification). Conversely, Uber appears as one source but represents many customers.

3. **Correlated sources.** Five clients in the same industry may not provide real diversification. The tool does not assess industry correlation between income sources.

4. **Seasonality detection requires 12+ months.** With shorter statement periods, the tool cannot distinguish seasonal patterns from true instability.

5. **Gaming potential.** Borrowers can potentially inflate metrics by timing deposits, moving money between accounts, or submitting only their strongest accounts. The red flag system catches some of these patterns but not all.

6. **Forward-looking limitations.** Historical recurrence does not guarantee future continuation. The tool cannot assess whether contracts are ongoing or relationships are stable.

These limitations were identified in part through expert review by Professor Beatrice Michaeli (UCLA Anderson School of Management, Ph.D. Columbia Business School), whose research focuses on financial reporting, disclosure, and performance measurement.

---

## Architecture

**Backend:** N8N workflow automation with Gemini AI (document classification, transaction extraction, expense categorization)

**Analytics Engine:** Deterministic JavaScript (all stability metrics, red flags, and scoring are computed mathematically, not by AI)

**Frontend:** React + Vite + Tailwind CSS + Recharts

**Design Principle:** AI extracts and classifies. Math computes. Humans decide.

---

## References

[1] The Interview Guys. "Gig Economy Statistics." May 2026. Reports 70M+ Americans participating in gig/freelance work.

[2] Federal Reserve. Survey of Household Economics and Decisionmaking (SHED). May 2025. Cites approximately 36% workforce participation in gig/freelance.

[3] Statista. "Freelancers as share of U.S. workforce." Projects 50%+ by 2027.

[4] Consumer Financial Protection Bureau (CFPB). "What is ability to repay?" Defines the regulatory framework distinguishing ability-to-pay from creditworthiness assessment.

[5] myFICO. "What's in my FICO Score." Details the five factors (payment history 35%, amounts owed 30%, length of credit history 15%, new credit 10%, credit mix 10%) that measure willingness/historical behavior to pay.

[6] ClearStaq. "Underwrite Variable Income Borrowers From Bank Statements." August 2026. Benchmarks manual review at 20-40 minutes per statement; 300+ line items per 12-month set.

[7] ClearStaq. "Reduce Manual Underwriting Review Time in 2026." July 2026. Reports document verification consumes 60-70% of review time; automation cuts review time by up to 95%.

[8] CapStonePlanet. "How Long Does Underwriting Take? Complete Timeline by Type (2026)." April 2026. Reports mortgage underwriting averages 42-45 days; self-employed files take 2-3x longer.

[9] Freddie Mac Single-Family Team. "2025 Updates to the Cost to Originate Study." November 2025. Reports average cost to originate at $11,800/loan; LPA digital tools save $1,700/loan and 5 days.

[10] National Mortgage Professional. "Cost To Make A Mortgage: $11,800 Per Loan." December 2025. Summarizes Freddie Mac origination cost findings.

[11] Ocrolus. "Mortgage manufacturing rates: bending the cost curve with AI." October 2025. Reports $7,700 personnel cost per loan (67% of total); AI tools save $230-$570 per loan.

[12] Cotality (formerly CoreLogic). "2025 Annual Fraud Report." September 2025. Reports 1 in 116 applications with fraud indicators; 6.1% YoY increase; income fraud = 46% of Fannie Mae findings.

[13] U.S. Sentencing Commission. "Mortgage Fraud Quick Facts FY2025." Reports median loss of $849,584 per case; 47 federal cases in FY2025.

[14] BackOfficePro. "45 Mortgage Fraud Statistics & Risk Trends For 2025." April 2025. Compiles fraud cost multiplier (4.5x), Canadian falsified document rates (90%+), and geographic hotspot data.

[15] Fannie Mae Selling Guide B3-6-02; FHA Single Family Housing Policy Handbook 4000.1 II.A.5.d. Prescribes DTI thresholds by loan program.

[16] Defy Mortgage, Angel Oak, Deephaven, National Mortgage Center. Non-QM bank statement program guidelines. Require 12-24 consecutive months of statements.
