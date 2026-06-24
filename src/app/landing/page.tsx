'use client'

import { useRouter } from 'next/navigation'

const GITHUB_URL = 'https://github.com/mazurenkodmytro0710/ZeroAudit'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* NAV */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-xl font-bold">
            Zero<span className="text-primary">Audit</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={() => router.push('/onboarding')}
              className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => router.push('/onboarding')}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          Built for H0: Hack the Zero Stack · AWS + Vercel
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight max-w-4xl mx-auto">
          SOC 2 compliance,{' '}
          <span className="text-primary">automated</span>
          <br />by AI
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Connect your GitHub, and ZeroAudit&apos;s AI agent automatically collects
          evidence across 42 SOC 2 Type II controls — turning months of manual
          work into a 2-minute scan.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.push('/onboarding')}
            className="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            Start free trial →
          </button>
          <a
            href="#how-it-works"
            className="rounded-xl border border-border px-8 py-3.5 text-base font-medium hover:bg-muted transition-colors"
          >
            See how it works
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 max-w-2xl mx-auto">
          {[
            { value: '$30,000', label: 'Average audit cost saved' },
            { value: '42', label: 'SOC 2 controls monitored' },
            { value: '2 min', label: 'Evidence collection time' },
            { value: '2', label: 'Compliance frameworks' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-gray-400">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          No credit card required · SOC 2 Type II certified infrastructure · Powered by AWS DynamoDB
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">How it works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From zero to audit-ready in three steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Connect your tools',
              description: 'OAuth connect GitHub in one click. PagerDuty and AWS CloudTrail integrations read your real operational data.',
              icon: '🔌',
            },
            {
              step: '02',
              title: 'AI agent scans everything',
              description: 'Our agent analyzes pull requests, Dependabot alerts, branch protection, incident history, and IAM logs against 42 SOC 2 controls.',
              icon: '🤖',
            },
            {
              step: '03',
              title: 'Get audit-ready reports',
              description: 'Download SOC 2 Type II and ISO 27001 compliance reports in seconds. Share directly with your auditor.',
              icon: '📄',
            },
          ].map(item => (
            <div key={item.step} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-mono text-muted-foreground font-semibold">
                  STEP {item.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-muted/20 border-y border-border py-24">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Everything you need for SOC 2</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🔍', title: 'Real Evidence Collection', desc: 'Reads actual PRs, Dependabot alerts, branch protection rules, and CloudTrail logs — not simulated data.' },
              { icon: '🧠', title: 'AI Classification', desc: 'Grok AI analyzes each artifact against SOC 2 Trust Service Criteria and generates reasoning for auditors.' },
              { icon: '📊', title: 'Evidence Map', desc: 'Visual dashboard showing covered, partial, and missing controls across all 42 SOC 2 requirements.' },
              { icon: '📋', title: 'SOC 2 Type II Report', desc: 'Generate audit-ready PDF reports with executive summary, control evidence, and remediation recommendations.' },
              { icon: '🔄', title: 'ISO 27001 Crosswalk', desc: 'Automatically maps SOC 2 controls to ISO 27001:2022 Annex A requirements.' },
              { icon: '⚡', title: 'DynamoDB Single-Table', desc: 'Built on AWS DynamoDB with single-table design and GSI-optimized access patterns for multi-tenant evidence storage.' },
            ].map(f => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="text-2xl">{f.icon}</div>
                <div className="font-semibold">{f.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="max-w-6xl mx-auto px-6 py-24 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Built on the right stack</h2>
          <p className="text-muted-foreground">
            Designed for the H0 hackathon judges who care about architecture
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Data Layer
            </div>
            <h3 className="text-lg font-bold">AWS DynamoDB Single-Table Design</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              One table, two GSIs, zero joins. Evidence artifacts are stored with{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">ORG#orgId</span>
              {' '}as partition key for tenant isolation. GSI1 enables control-scoped queries,
              GSI2 enables status-based gap analysis.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['PK/SK pattern', 'GSI1 — by control', 'GSI2 — by status', 'Multi-tenant'].map(tag => (
                <span key={tag} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              AI Layer
            </div>
            <h3 className="text-lg font-bold">Multi-step Agentic Reasoning</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The agent fetches real evidence from GitHub, PagerDuty, and AWS CloudTrail,
              then uses Grok AI to classify each artifact against SOC 2 controls with
              structured JSON output: coverageStatus, riskLevel, and reasoning.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Grok AI', 'Structured outputs', 'Fire-and-forget', 'DynamoDB state'].map(tag => (
                <span key={tag} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/20 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold">
            Ready to automate your SOC 2 audit?
          </h2>
          <p className="text-muted-foreground">
            Connect GitHub and run your first compliance scan in under 2 minutes.
          </p>
          <button
            type="button"
            onClick={() => router.push('/onboarding')}
            className="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Start free trial →
          </button>
          <p className="text-xs text-muted-foreground">
            No credit card required
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm font-semibold">
            Zero<span className="text-primary">Audit</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Built for H0: Hack the Zero Stack · AWS + Vercel · 2026
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View source →
          </a>
        </div>
      </footer>

    </div>
  )
}
