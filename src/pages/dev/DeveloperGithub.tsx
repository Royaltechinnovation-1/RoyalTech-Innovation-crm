import { useMemo, useState } from "react";
import type { CrmStore } from "../../data/store";
import { RequirePermission } from "../../components/RequirePermission";

type RepoVisibility = "public" | "private";
type RepoFilter = "all" | RepoVisibility;
type DetailTab = "overview" | "commits" | "prs" | "branches" | "issues" | "settings";

type Commit = {
  id: string;
  message: string;
  author: string;
  when: string;
  hash: string;
};

type Contributor = {
  id: string;
  name: string;
  role: string;
  commits: number;
  tone: "cyan" | "violet" | "amber" | "green";
};

type PullRequest = {
  id: string;
  title: string;
  author: string;
  status: "open" | "merged" | "review";
  when: string;
};

type Issue = {
  id: string;
  title: string;
  status: "open" | "closed";
  when: string;
};

type Repo = {
  id: string;
  name: string;
  description: string;
  branch: string;
  commits: number;
  branches: number;
  pullRequests: number;
  issues: number;
  visibility: RepoVisibility;
  status: "Active" | "Private";
  updated: string;
  commitsDelta: string;
  branchesDelta: string;
  prsDelta: string;
  issuesDelta: string;
  recentCommits: Commit[];
  contributors: Contributor[];
  pullRequestList: PullRequest[];
  issueList: Issue[];
  branchList: string[];
};

const repos: Repo[] = [
  {
    id: "r1",
    name: "royaltech-crm",
    description: "CRM application for RoyalTech Innovation",
    branch: "main",
    commits: 12,
    branches: 3,
    pullRequests: 2,
    issues: 1,
    visibility: "public",
    status: "Active",
    updated: "2 hours ago",
    commitsDelta: "↑ 3 this week",
    branchesDelta: "↑ 1 new",
    prsDelta: "↑ 1 merged",
    issuesDelta: "↓ 1 open",
    recentCommits: [
      {
        id: "c1",
        message: "feat: update CRM dashboard UI",
        author: "Amit Sharma",
        when: "2 hours ago",
        hash: "a1b2c3d",
      },
      {
        id: "c2",
        message: "fix: resolved login issue",
        author: "Simran Kaur",
        when: "5 hours ago",
        hash: "f4e5d6f",
      },
      {
        id: "c3",
        message: "feat: add sales module",
        author: "Rohan Mehta",
        when: "1 day ago",
        hash: "e7f8g9h",
      },
      {
        id: "c4",
        message: "chore: update dependencies",
        author: "Amit Sharma",
        when: "2 days ago",
        hash: "b1c2d3e",
      },
    ],
    contributors: [
      { id: "u1", name: "Amit Sharma", role: "Developer", commits: 24, tone: "cyan" },
      { id: "u2", name: "Simran Kaur", role: "Developer", commits: 18, tone: "violet" },
      { id: "u3", name: "Rohan Mehta", role: "Developer", commits: 12, tone: "amber" },
      { id: "u4", name: "Priya Singh", role: "Designer", commits: 6, tone: "green" },
    ],
    pullRequestList: [
      { id: "p1", title: "Dashboard KPI polish", author: "Amit Sharma", status: "open", when: "1h ago" },
      { id: "p2", title: "Login validation fixes", author: "Simran Kaur", status: "merged", when: "Yesterday" },
    ],
    issueList: [
      { id: "i1", title: "Calendar sync timeout on large payloads", status: "open", when: "Today" },
    ],
    branchList: ["main", "develop", "feature/dashboard-ui"],
  },
  {
    id: "r2",
    name: "sales-management",
    description: "Sales management module",
    branch: "main",
    commits: 8,
    branches: 2,
    pullRequests: 1,
    issues: 0,
    visibility: "public",
    status: "Active",
    updated: "1 day ago",
    commitsDelta: "↑ 1 this week",
    branchesDelta: "—",
    prsDelta: "↑ 1 open",
    issuesDelta: "0 open",
    recentCommits: [
      {
        id: "c5",
        message: "feat: pipeline board filters",
        author: "Rahul Verma",
        when: "1 day ago",
        hash: "9aa11bb",
      },
      {
        id: "c6",
        message: "fix: follow-up reminder timing",
        author: "Sara Khan",
        when: "3 days ago",
        hash: "22cc33d",
      },
    ],
    contributors: [
      { id: "u5", name: "Rahul Verma", role: "Sales Manager", commits: 14, tone: "amber" },
      { id: "u6", name: "Sara Khan", role: "Sales Executive", commits: 9, tone: "cyan" },
    ],
    pullRequestList: [
      { id: "p3", title: "Lead sheet sync", author: "Sara Khan", status: "review", when: "2d ago" },
    ],
    issueList: [],
    branchList: ["main", "feature/pipeline"],
  },
  {
    id: "r3",
    name: "hr-portal",
    description: "HR management system",
    branch: "develop",
    commits: 15,
    branches: 4,
    pullRequests: 3,
    issues: 2,
    visibility: "public",
    status: "Active",
    updated: "5 hours ago",
    commitsDelta: "↑ 4 this week",
    branchesDelta: "↑ 2 new",
    prsDelta: "↑ 2 open",
    issuesDelta: "2 open",
    recentCommits: [
      {
        id: "c7",
        message: "feat: attendance calendar view",
        author: "Neha Kapoor",
        when: "5 hours ago",
        hash: "77ee88f",
      },
    ],
    contributors: [
      { id: "u7", name: "Neha Kapoor", role: "HR Admin", commits: 20, tone: "green" },
    ],
    pullRequestList: [
      { id: "p4", title: "Leave approval workflow", author: "Neha Kapoor", status: "open", when: "4h ago" },
    ],
    issueList: [
      { id: "i2", title: "Payroll export CSV encoding", status: "open", when: "Yesterday" },
      { id: "i3", title: "Onboarding checklist duplicate rows", status: "closed", when: "3d ago" },
    ],
    branchList: ["main", "develop", "feature/attendance", "hotfix/payroll"],
  },
  {
    id: "r4",
    name: "frontend-ui",
    description: "UI components and design system",
    branch: "main",
    commits: 22,
    branches: 5,
    pullRequests: 4,
    issues: 3,
    visibility: "public",
    status: "Active",
    updated: "3 hours ago",
    commitsDelta: "↑ 6 this week",
    branchesDelta: "↑ 1 new",
    prsDelta: "↑ 2 merged",
    issuesDelta: "3 open",
    recentCommits: [
      {
        id: "c8",
        message: "style: button tokens refresh",
        author: "Priya Singh",
        when: "3 hours ago",
        hash: "c0ffe12",
      },
    ],
    contributors: [
      { id: "u8", name: "Priya Singh", role: "Designer", commits: 16, tone: "violet" },
      { id: "u9", name: "Amit Sharma", role: "Developer", commits: 11, tone: "cyan" },
    ],
    pullRequestList: [
      { id: "p5", title: "Card density variants", author: "Priya Singh", status: "open", when: "Today" },
    ],
    issueList: [
      { id: "i4", title: "Focus ring contrast AA fail", status: "open", when: "Today" },
    ],
    branchList: ["main", "develop", "feature/tokens", "feature/cards", "chore/a11y"],
  },
  {
    id: "r5",
    name: "backend-api",
    description: "API services and database logic",
    branch: "main",
    commits: 18,
    branches: 3,
    pullRequests: 2,
    issues: 4,
    visibility: "private",
    status: "Private",
    updated: "6 hours ago",
    commitsDelta: "↑ 2 this week",
    branchesDelta: "—",
    prsDelta: "1 review",
    issuesDelta: "4 open",
    recentCommits: [
      {
        id: "c9",
        message: "perf: batch inventory sync",
        author: "Ananya Iyer",
        when: "6 hours ago",
        hash: "db001aa",
      },
    ],
    contributors: [
      { id: "u10", name: "Ananya Iyer", role: "Developer", commits: 28, tone: "cyan" },
      { id: "u11", name: "Vikram Shah", role: "Project Manager", commits: 7, tone: "amber" },
    ],
    pullRequestList: [
      { id: "p6", title: "Retry policy for sync jobs", author: "Ananya Iyer", status: "review", when: "5h ago" },
    ],
    issueList: [
      { id: "i5", title: "MySQL fallback health probe", status: "open", when: "Yesterday" },
    ],
    branchList: ["main", "develop", "feature/sync-retry"],
  },
  {
    id: "r6",
    name: "mobile-app",
    description: "Mobile application",
    branch: "main",
    commits: 6,
    branches: 2,
    pullRequests: 1,
    issues: 1,
    visibility: "public",
    status: "Active",
    updated: "4 days ago",
    commitsDelta: "↑ 1 this week",
    branchesDelta: "—",
    prsDelta: "1 open",
    issuesDelta: "1 open",
    recentCommits: [
      {
        id: "c10",
        message: "feat: push notification scaffolding",
        author: "Rohan Mehta",
        when: "4 days ago",
        hash: "m0bile1",
      },
    ],
    contributors: [
      { id: "u12", name: "Rohan Mehta", role: "Developer", commits: 10, tone: "amber" },
    ],
    pullRequestList: [
      { id: "p7", title: "iOS build pipeline", author: "Rohan Mehta", status: "open", when: "3d ago" },
    ],
    issueList: [
      { id: "i6", title: "Android keyboard covers chat input", status: "open", when: "2d ago" },
    ],
    branchList: ["main", "feature/push"],
  },
  {
    id: "r7",
    name: "ops-portal",
    description: "Internal ops tooling",
    branch: "main",
    commits: 9,
    branches: 2,
    pullRequests: 0,
    issues: 1,
    visibility: "private",
    status: "Private",
    updated: "1 week ago",
    commitsDelta: "—",
    branchesDelta: "—",
    prsDelta: "0",
    issuesDelta: "1 open",
    recentCommits: [
      {
        id: "c11",
        message: "chore: lockfile cleanup",
        author: "Vikram Shah",
        when: "1 week ago",
        hash: "op5c1ean",
      },
    ],
    contributors: [
      { id: "u13", name: "Vikram Shah", role: "Project Manager", commits: 9, tone: "amber" },
    ],
    pullRequestList: [],
    issueList: [{ id: "i7", title: "Deploy checklist outdated", status: "open", when: "1w ago" }],
    branchList: ["main", "develop"],
  },
  {
    id: "r8",
    name: "design-tokens",
    description: "Shared design tokens package",
    branch: "main",
    commits: 11,
    branches: 1,
    pullRequests: 1,
    issues: 0,
    visibility: "public",
    status: "Active",
    updated: "2 days ago",
    commitsDelta: "↑ 2 this week",
    branchesDelta: "—",
    prsDelta: "1 open",
    issuesDelta: "0 open",
    recentCommits: [
      {
        id: "c12",
        message: "feat: cyan/forest sales palette",
        author: "Priya Singh",
        when: "2 days ago",
        hash: "tok3n88",
      },
    ],
    contributors: [
      { id: "u14", name: "Priya Singh", role: "Designer", commits: 11, tone: "violet" },
    ],
    pullRequestList: [
      { id: "p8", title: "Export CSS variables", author: "Priya Singh", status: "open", when: "2d ago" },
    ],
    issueList: [],
    branchList: ["main"],
  },
  {
    id: "r9",
    name: "docs-site",
    description: "Public product documentation",
    branch: "main",
    commits: 7,
    branches: 2,
    pullRequests: 0,
    issues: 0,
    visibility: "public",
    status: "Active",
    updated: "5 days ago",
    commitsDelta: "↑ 1 this week",
    branchesDelta: "—",
    prsDelta: "0",
    issuesDelta: "0 open",
    recentCommits: [
      {
        id: "c13",
        message: "docs: developer onboarding guide",
        author: "Omar Siddiqui",
        when: "5 days ago",
        hash: "d0c511e",
      },
    ],
    contributors: [
      { id: "u15", name: "Omar Siddiqui", role: "Website Admin", commits: 7, tone: "green" },
    ],
    pullRequestList: [],
    issueList: [],
    branchList: ["main", "draft/onboarding"],
  },
  {
    id: "r10",
    name: "analytics-etl",
    description: "Nightly ETL for CRM analytics",
    branch: "main",
    commits: 14,
    branches: 2,
    pullRequests: 1,
    issues: 2,
    visibility: "private",
    status: "Private",
    updated: "8 hours ago",
    commitsDelta: "↑ 2 this week",
    branchesDelta: "—",
    prsDelta: "1 open",
    issuesDelta: "2 open",
    recentCommits: [
      {
        id: "c14",
        message: "fix: timezone handling in rollups",
        author: "Ananya Iyer",
        when: "8 hours ago",
        hash: "etl9z0ne",
      },
    ],
    contributors: [
      { id: "u16", name: "Ananya Iyer", role: "Developer", commits: 14, tone: "cyan" },
    ],
    pullRequestList: [
      { id: "p9", title: "Add lead conversion metrics", author: "Ananya Iyer", status: "open", when: "Today" },
    ],
    issueList: [
      { id: "i8", title: "Failed job alert noise", status: "open", when: "Yesterday" },
    ],
    branchList: ["main", "feature/metrics"],
  },
  {
    id: "r11",
    name: "qa-automation",
    description: "Playwright and API test suites",
    branch: "main",
    commits: 10,
    branches: 3,
    pullRequests: 2,
    issues: 1,
    visibility: "public",
    status: "Active",
    updated: "12 hours ago",
    commitsDelta: "↑ 3 this week",
    branchesDelta: "↑ 1 new",
    prsDelta: "↑ 1 merged",
    issuesDelta: "1 open",
    recentCommits: [
      {
        id: "c15",
        message: "test: calendar month view specs",
        author: "Priya Mehta",
        when: "12 hours ago",
        hash: "qa7c4l",
      },
    ],
    contributors: [
      { id: "u17", name: "Priya Mehta", role: "QA Engineer", commits: 10, tone: "violet" },
    ],
    pullRequestList: [
      { id: "p10", title: "Messages smoke tests", author: "Priya Mehta", status: "merged", when: "Yesterday" },
    ],
    issueList: [
      { id: "i9", title: "Flaky upload assertion", status: "open", when: "2d ago" },
    ],
    branchList: ["main", "develop", "feature/calendar-tests"],
  },
  {
    id: "r12",
    name: "infra-scripts",
    description: "Deploy and seed scripts",
    branch: "main",
    commits: 5,
    branches: 1,
    pullRequests: 0,
    issues: 0,
    visibility: "private",
    status: "Private",
    updated: "2 weeks ago",
    commitsDelta: "—",
    branchesDelta: "—",
    prsDelta: "0",
    issuesDelta: "0 open",
    recentCommits: [
      {
        id: "c16",
        message: "chore: memory-store seed refresh",
        author: "Vikram Shah",
        when: "2 weeks ago",
        hash: "inf4seed",
      },
    ],
    contributors: [
      { id: "u18", name: "Vikram Shah", role: "Project Manager", commits: 5, tone: "amber" },
    ],
    pullRequestList: [],
    issueList: [],
    branchList: ["main"],
  },
];

function prTone(status: PullRequest["status"]) {
  if (status === "merged") return "merged";
  if (status === "review") return "review";
  return "open";
}

export function DeveloperGithub({ store }: { store: CrmStore }) {
  const [filter, setFilter] = useState<RepoFilter>("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(repos[0].id);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");

  const counts = useMemo(
    () => ({
      all: repos.length,
      public: repos.filter((r) => r.visibility === "public").length,
      private: repos.filter((r) => r.visibility === "private").length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos.filter((r) => {
      if (filter !== "all" && r.visibility !== filter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    });
  }, [filter, query]);

  const active = repos.find((r) => r.id === activeId) ?? filtered[0] ?? repos[0];

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page gh-page">
        <header className="gh-head">
          <h2>GitHub Integration</h2>
          <p>Manage your repositories, commits and pull requests.</p>
        </header>

        {notice ? <p className="gh-notice">{notice}</p> : null}

        <section className="gh-shell">
          <aside className="gh-list-pane">
            <div className="gh-filters" role="tablist">
              {(
                [
                  ["all", "All Repositories", counts.all],
                  ["public", "Public", counts.public],
                  ["private", "Private", counts.private],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={filter === key ? "is-active" : undefined}
                  onClick={() => setFilter(key)}
                >
                  {label} <span>{count}</span>
                </button>
              ))}
            </div>

            <label className="gh-search">
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="m20 20-3.5-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repositories..."
              />
            </label>

            <ul className="gh-repo-list">
              {filtered.map((repo) => (
                <li key={repo.id}>
                  <button
                    type="button"
                    className={`gh-repo-item${repo.id === active.id ? " is-active" : ""}`}
                    onClick={() => {
                      setActiveId(repo.id);
                      setTab("overview");
                      setNotice("");
                    }}
                  >
                    <span className="gh-repo-ico" aria-hidden>
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M9 19c-4.2 1.4-4.2-2.3-6-2.5M15 21v-3.5a3.3 3.3 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.6a5 5 0 0 0-1.4-3.5 4.7 4.7 0 0 0-.1-3.5s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.4 2.6 5.3 2.9 5.3 2.9a4.7 4.7 0 0 0-.1 3.5A5 5 0 0 0 3.8 10c0 5.1 3.1 6.3 6.1 6.6A3.3 3.3 0 0 0 9 19.2V21"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="gh-repo-meta">
                      <strong>
                        {repo.name}
                        <em className={repo.visibility === "private" ? "is-private" : "is-active"}>
                          {repo.status}
                        </em>
                      </strong>
                      <small>{repo.description}</small>
                      <span>
                        {repo.branch} · {repo.commits} commits
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? <li className="gh-empty">No repositories found.</li> : null}
            </ul>
          </aside>

          <div className="gh-detail-pane">
            <header className="gh-detail-head">
              <div>
                <h3>
                  {active.name}
                  <span className={active.visibility === "private" ? "is-private" : "is-active"}>
                    {active.status}
                  </span>
                </h3>
                <p>{active.description}</p>
                <div className="gh-detail-meta">
                  <span>{active.branch}</span>
                  <span>{active.commits} commits</span>
                  <span>Updated {active.updated}</span>
                  <span>{active.visibility === "public" ? "Public" : "Private"}</span>
                </div>
              </div>
              <div className="gh-detail-actions">
                <a
                  className="gh-btn primary"
                  href={`https://github.com/royaltech/${active.name}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in GitHub
                </a>
                <button
                  type="button"
                  className={`gh-btn ghost${starred[active.id] ? " is-starred" : ""}`}
                  onClick={() => {
                    setStarred((prev) => ({ ...prev, [active.id]: !prev[active.id] }));
                    setNotice(starred[active.id] ? `Unstarred ${active.name}` : `Starred ${active.name}`);
                  }}
                >
                  {starred[active.id] ? "★ Starred" : "☆ Star"}
                </button>
              </div>
            </header>

            <div className="gh-tabs" role="tablist">
              {(
                [
                  ["overview", "Overview"],
                  ["commits", "Commits"],
                  ["prs", "Pull Requests"],
                  ["branches", "Branches"],
                  ["issues", "Issues"],
                  ["settings", "Settings"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "is-active" : undefined}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "overview" ? (
              <div className="gh-overview">
                <div className="gh-stats">
                  <article>
                    <p>Commits</p>
                    <strong>{active.commits}</strong>
                    <small>{active.commitsDelta}</small>
                  </article>
                  <article>
                    <p>Branches</p>
                    <strong>{active.branches}</strong>
                    <small>{active.branchesDelta}</small>
                  </article>
                  <article>
                    <p>Pull Requests</p>
                    <strong>{active.pullRequests}</strong>
                    <small>{active.prsDelta}</small>
                  </article>
                  <article>
                    <p>Issues</p>
                    <strong>{active.issues}</strong>
                    <small>{active.issuesDelta}</small>
                  </article>
                </div>

                <div className="gh-overview-split">
                  <section className="gh-card">
                    <header>
                      <h4>Recent Commits</h4>
                    </header>
                    <ul className="gh-commit-list">
                      {active.recentCommits.map((c) => (
                        <li key={c.id}>
                          <div>
                            <strong>{c.message}</strong>
                            <small>
                              {c.author} · {c.when}
                            </small>
                          </div>
                          <code>{c.hash}</code>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="gh-side-stack">
                    <section className="gh-card">
                      <header>
                        <h4>Contributors</h4>
                      </header>
                      <ul className="gh-contrib-list">
                        {active.contributors.map((c) => (
                          <li key={c.id}>
                            <span className={`gh-avatar tone-${c.tone}`}>
                              {c.name
                                .split(" ")
                                .map((p) => p[0])
                                .join("")
                                .slice(0, 2)}
                            </span>
                            <div>
                              <strong>{c.name}</strong>
                              <small>{c.role}</small>
                            </div>
                            <b>{c.commits}</b>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="gh-card">
                      <header>
                        <h4>Quick Actions</h4>
                      </header>
                      <div className="gh-quick">
                        <button type="button" onClick={() => { setTab("prs"); setNotice("Open a new pull request from GitHub."); }}>
                          Create Pull Request
                        </button>
                        <button type="button" onClick={() => setTab("issues")}>
                          View Issues
                        </button>
                        <button type="button" onClick={() => setNotice("Invite collaborators from GitHub settings.")}>
                          Add Collaborator
                        </button>
                        <button type="button" onClick={() => setTab("settings")}>
                          Settings
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "commits" ? (
              <section className="gh-card gh-tab-panel">
                <ul className="gh-commit-list">
                  {active.recentCommits.map((c) => (
                    <li key={c.id}>
                      <div>
                        <strong>{c.message}</strong>
                        <small>
                          {c.author} · {c.when}
                        </small>
                      </div>
                      <code>{c.hash}</code>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tab === "prs" ? (
              <section className="gh-card gh-tab-panel">
                {active.pullRequestList.length === 0 ? <p className="gh-empty">No pull requests.</p> : null}
                <ul className="gh-simple-list">
                  {active.pullRequestList.map((pr) => (
                    <li key={pr.id}>
                      <div>
                        <strong>{pr.title}</strong>
                        <small>
                          {pr.author} · {pr.when}
                        </small>
                      </div>
                      <span className={`gh-pill tone-${prTone(pr.status)}`}>{pr.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tab === "branches" ? (
              <section className="gh-card gh-tab-panel">
                <ul className="gh-simple-list">
                  {active.branchList.map((b) => (
                    <li key={b}>
                      <div>
                        <strong>{b}</strong>
                        <small>{b === active.branch ? "Default branch" : "Branch"}</small>
                      </div>
                      {b === active.branch ? <span className="gh-pill tone-open">default</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tab === "issues" ? (
              <section className="gh-card gh-tab-panel">
                {active.issueList.length === 0 ? <p className="gh-empty">No issues.</p> : null}
                <ul className="gh-simple-list">
                  {active.issueList.map((issue) => (
                    <li key={issue.id}>
                      <div>
                        <strong>{issue.title}</strong>
                        <small>{issue.when}</small>
                      </div>
                      <span className={`gh-pill tone-${issue.status === "open" ? "open" : "merged"}`}>
                        {issue.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tab === "settings" ? (
              <section className="gh-card gh-tab-panel">
                <div className="gh-settings">
                  <p>
                    <strong>Repository</strong>
                    <span>royaltech/{active.name}</span>
                  </p>
                  <p>
                    <strong>Visibility</strong>
                    <span>{active.visibility}</span>
                  </p>
                  <p>
                    <strong>Default branch</strong>
                    <span>{active.branch}</span>
                  </p>
                  <p>
                    <strong>Signed in as</strong>
                    <span>{store.currentUser.name}</span>
                  </p>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
