import { useMemo, useRef, useState } from "react";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

type DocCategory =
  | "all"
  | "project"
  | "reports"
  | "design"
  | "hr"
  | "sales"
  | "others";

type DocType = "PDF" | "DOCX" | "XLSX" | "PNG" | "PPTX" | "ZIP";

type DocItem = {
  id: string;
  name: string;
  size: string;
  date: string;
  category: Exclude<DocCategory, "all">;
  categoryLabel: string;
  type: DocType;
  tag: string;
};

const PAGE_SIZE = 8;

const seedDocs: DocItem[] = [
  {
    id: "d1",
    name: "Project Proposal.pdf",
    size: "2.5 MB",
    date: "2026-11-11",
    category: "project",
    categoryLabel: "Project Files",
    type: "PDF",
    tag: "Project Files",
  },
  {
    id: "d2",
    name: "API Spec Draft.docx",
    size: "840 KB",
    date: "2026-11-10",
    category: "project",
    categoryLabel: "Project Files",
    type: "DOCX",
    tag: "Technical",
  },
  {
    id: "d3",
    name: "Weekly Progress.xlsx",
    size: "1.1 MB",
    date: "2026-11-09",
    category: "reports",
    categoryLabel: "Reports",
    type: "XLSX",
    tag: "Reports",
  },
  {
    id: "d4",
    name: "Dashboard Mock.png",
    size: "3.2 MB",
    date: "2026-11-08",
    category: "design",
    categoryLabel: "Design Files",
    type: "PNG",
    tag: "Design",
  },
  {
    id: "d5",
    name: "Sprint Review.pptx",
    size: "4.8 MB",
    date: "2026-11-07",
    category: "reports",
    categoryLabel: "Reports",
    type: "PPTX",
    tag: "Reports",
  },
  {
    id: "d6",
    name: "Build Assets.zip",
    size: "12.4 MB",
    date: "2026-11-06",
    category: "project",
    categoryLabel: "Project Files",
    type: "ZIP",
    tag: "Project Files",
  },
  {
    id: "d7",
    name: "Onboarding Checklist.pdf",
    size: "520 KB",
    date: "2026-11-05",
    category: "hr",
    categoryLabel: "HR Documents",
    type: "PDF",
    tag: "HR",
  },
  {
    id: "d8",
    name: "Client Pitch Deck.pptx",
    size: "6.1 MB",
    date: "2026-11-04",
    category: "sales",
    categoryLabel: "Sales Documents",
    type: "PPTX",
    tag: "Sales",
  },
  {
    id: "d9",
    name: "Auth Flow Notes.docx",
    size: "310 KB",
    date: "2026-11-03",
    category: "project",
    categoryLabel: "Project Files",
    type: "DOCX",
    tag: "Technical",
  },
  {
    id: "d10",
    name: "QA Bug Sheet.xlsx",
    size: "760 KB",
    date: "2026-11-02",
    category: "reports",
    categoryLabel: "Reports",
    type: "XLSX",
    tag: "Reports",
  },
  {
    id: "d11",
    name: "Icon Pack.png",
    size: "1.8 MB",
    date: "2026-11-01",
    category: "design",
    categoryLabel: "Design Files",
    type: "PNG",
    tag: "Design",
  },
  {
    id: "d12",
    name: "Leave Policy.pdf",
    size: "680 KB",
    date: "2026-10-28",
    category: "hr",
    categoryLabel: "HR Documents",
    type: "PDF",
    tag: "HR",
  },
  {
    id: "d13",
    name: "Proposal Template.docx",
    size: "450 KB",
    date: "2026-10-25",
    category: "sales",
    categoryLabel: "Sales Documents",
    type: "DOCX",
    tag: "Sales",
  },
  {
    id: "d14",
    name: "Wireframes Pack.zip",
    size: "9.6 MB",
    date: "2026-10-22",
    category: "design",
    categoryLabel: "Design Files",
    type: "ZIP",
    tag: "Design",
  },
  {
    id: "d15",
    name: "Release Notes.pdf",
    size: "290 KB",
    date: "2026-10-20",
    category: "reports",
    categoryLabel: "Reports",
    type: "PDF",
    tag: "Reports",
  },
  {
    id: "d16",
    name: "Scope — Brightleaf.pdf",
    size: "1.4 MB",
    date: "2026-10-18",
    category: "project",
    categoryLabel: "Project Files",
    type: "PDF",
    tag: "Project Files",
  },
  {
    id: "d17",
    name: "Invoice Summary.xlsx",
    size: "540 KB",
    date: "2026-10-15",
    category: "sales",
    categoryLabel: "Sales Documents",
    type: "XLSX",
    tag: "Sales",
  },
  {
    id: "d18",
    name: "Brand Guidelines.pdf",
    size: "2.1 MB",
    date: "2026-10-12",
    category: "design",
    categoryLabel: "Design Files",
    type: "PDF",
    tag: "Design",
  },
  {
    id: "d19",
    name: "Team Directory.docx",
    size: "210 KB",
    date: "2026-10-10",
    category: "hr",
    categoryLabel: "HR Documents",
    type: "DOCX",
    tag: "HR",
  },
  {
    id: "d20",
    name: "DB Schema Export.zip",
    size: "3.7 MB",
    date: "2026-10-08",
    category: "project",
    categoryLabel: "Project Files",
    type: "ZIP",
    tag: "Technical",
  },
  {
    id: "d21",
    name: "Daily Report Sample.pdf",
    size: "180 KB",
    date: "2026-10-05",
    category: "reports",
    categoryLabel: "Reports",
    type: "PDF",
    tag: "Reports",
  },
  {
    id: "d22",
    name: "UI Kit Preview.png",
    size: "2.9 MB",
    date: "2026-10-02",
    category: "design",
    categoryLabel: "Design Files",
    type: "PNG",
    tag: "Design",
  },
  {
    id: "d23",
    name: "Sales Pipeline.pptx",
    size: "5.2 MB",
    date: "2026-09-28",
    category: "sales",
    categoryLabel: "Sales Documents",
    type: "PPTX",
    tag: "Sales",
  },
  {
    id: "d24",
    name: "Misc Notes.docx",
    size: "95 KB",
    date: "2026-09-20",
    category: "others",
    categoryLabel: "Others",
    type: "DOCX",
    tag: "Others",
  },
];

const categories: { key: DocCategory; label: string; icon: "all" | "folder" | "report" | "design" | "hr" | "sales" | "other" }[] = [
  { key: "all", label: "All Documents", icon: "all" },
  { key: "project", label: "Project Files", icon: "folder" },
  { key: "reports", label: "Reports", icon: "report" },
  { key: "design", label: "Design Files", icon: "design" },
  { key: "hr", label: "HR Documents", icon: "hr" },
  { key: "sales", label: "Sales Documents", icon: "sales" },
  { key: "others", label: "Others", icon: "other" },
];

function CatIcon({ name }: { name: (typeof categories)[number]["icon"] }) {
  if (name === "all") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M5 7.5h14M5 12h14M5 16.5h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "folder") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M4.5 8.5h6l1.6 1.8H19.5v8.2a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18.5V8.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (name === "report") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M7 4.5h7.2L19 9.3v10.2a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19.5v-13A2 2 0 0 1 7 4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M9 14.5h6M9 17.2h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "design") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="4.5" y="5.5" width="15" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="10.5" r="1.6" fill="currentColor" />
        <path d="m8 16.5 3-3.2 2.2 2.2 3.3-3.8 2.5 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "hr") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="10.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M4.5 18c.8-2.2 2.5-3.3 4.5-3.3s3.7 1.1 4.5 3.3M13.2 18c.5-1.5 1.7-2.3 3-2.3 1.1 0 2 .5 2.6 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "sales") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M5 16.5 9.5 11l3.2 3.2L19 8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14.5 8.5H19v4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="6.5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="17.5" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

function typeTone(type: DocType) {
  if (type === "PDF") return "pdf";
  if (type === "DOCX") return "docx";
  if (type === "XLSX") return "xlsx";
  if (type === "PNG") return "png";
  if (type === "PPTX") return "pptx";
  return "zip";
}

export function DeveloperDocuments({ store }: { store: CrmStore }) {
  const projectDocs: DocItem[] = useMemo(
    () =>
      store.data.projects
        .filter((p) => store.visibleTasks.some((t) => t.projectId === p.id))
        .map((p) => ({
          id: `proj-${p.id}`,
          name: `${p.name} — Scope.pdf`,
          size: "1.2 MB",
          date: String(p.deadline).slice(0, 10),
          category: "project" as const,
          categoryLabel: "Project Files",
          type: "PDF" as const,
          tag: "Project Files",
        })),
    [store],
  );

  const [docs, setDocs] = useState<DocItem[]>(() => {
    const names = new Set(seedDocs.map((d) => d.name.toLowerCase()));
    const extra = projectDocs.filter((d) => !names.has(d.name.toLowerCase()));
    return [...seedDocs, ...extra];
  });
  const [category, setCategory] = useState<DocCategory>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | DocType>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const map: Record<DocCategory, number> = {
      all: docs.length,
      project: 0,
      reports: 0,
      design: 0,
      hr: 0,
      sales: 0,
      others: 0,
    };
    docs.forEach((d) => {
      map[d.category] += 1;
    });
    return map;
  }, [docs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.tag.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
      );
    });
  }, [docs, category, typeFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);
  const viewing = docs.find((d) => d.id === viewId) ?? null;

  const onUpload = (file?: File | null) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "pdf").toUpperCase();
    const type = (["PDF", "DOCX", "XLSX", "PNG", "PPTX", "ZIP"].includes(ext)
      ? ext
      : "PDF") as DocType;
    const next: DocItem = {
      id: `up-${Date.now()}`,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      date: new Date().toISOString().slice(0, 10),
      category: "others",
      categoryLabel: "Others",
      type,
      tag: "Others",
    };
    setDocs((prev) => [next, ...prev]);
    setCategory("all");
    setPage(1);
    setNotice(`Uploaded ${file.name}`);
  };

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page docs-page">
        <header className="docs-head">
          <h2>
            <span className="docs-title-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M7 4.5h7.2L19 9.3v10.2a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19.5v-13A2 2 0 0 1 7 4.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M14 4.8v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            Documents
          </h2>
          <p>Browse specs, reports, and handoff files for your work.</p>
        </header>

        {notice ? <p className="docs-notice">{notice}</p> : null}

        <section className="docs-shell">
          <aside className="docs-cats">
            <h3>Categories</h3>
            <ul>
              {categories.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    className={category === c.key ? "is-active" : undefined}
                    onClick={() => {
                      setCategory(c.key);
                      setPage(1);
                    }}
                  >
                    <span className="docs-cat-ico" aria-hidden>
                      <CatIcon name={c.icon} />
                    </span>
                    <span>{c.label}</span>
                    <b>{counts[c.key]}</b>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="docs-main">
            <header className="docs-toolbar">
              <label className="docs-search">
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
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search documents..."
                />
              </label>
              <label className="docs-type">
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M4 6h16M7 12h10M10 18h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as "all" | DocType);
                    setPage(1);
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="XLSX">XLSX</option>
                  <option value="PNG">PNG</option>
                  <option value="PPTX">PPTX</option>
                  <option value="ZIP">ZIP</option>
                </select>
              </label>
              <button
                type="button"
                className="docs-upload"
                onClick={() => uploadRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M12 16.5V8.2M9.2 10.5 12 7.7l2.8 2.8M6 16.5h12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Upload Document
              </button>
              <input
                ref={uploadRef}
                type="file"
                className="docs-file-input"
                onChange={(e) => {
                  onUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </header>

            <div className="docs-grid">
              {pageItems.map((doc) => (
                <article key={doc.id} className="docs-card">
                  <header className="docs-card-top">
                    <span className={`docs-type-ico tone-${typeTone(doc.type)}`} aria-hidden>
                      {doc.type}
                    </span>
                    <div className="docs-card-menu">
                      <button
                        type="button"
                        className="docs-icon-btn"
                        aria-label="More options"
                        onClick={() => setMenuId(menuId === doc.id ? null : doc.id)}
                      >
                        <svg viewBox="0 0 24 24">
                          <circle cx="12" cy="6.5" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="17.5" r="1.5" fill="currentColor" />
                        </svg>
                      </button>
                      {menuId === doc.id ? (
                        <div className="docs-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setViewId(doc.id);
                              setMenuId(null);
                              setNotice(`Opened ${doc.name}`);
                            }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNotice(`Downloading ${doc.name}…`);
                              setMenuId(null);
                            }}
                          >
                            Download
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </header>
                  <h3>{doc.name}</h3>
                  <p>
                    {doc.size} · {formatDate(doc.date)}
                  </p>
                  <span className="docs-tag">{doc.tag}</span>
                  <footer className="docs-card-actions">
                    <button
                      type="button"
                      className="docs-icon-btn"
                      title="Download"
                      aria-label={`Download ${doc.name}`}
                      onClick={() => setNotice(`Downloading ${doc.name}…`)}
                    >
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M12 5v10M8.5 11.5 12 15l3.5-3.5M6 19h12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="docs-icon-btn"
                      title="View"
                      aria-label={`View ${doc.name}`}
                      onClick={() => {
                        setViewId(doc.id);
                        setNotice(`Opened ${doc.name}`);
                      }}
                    >
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="docs-icon-btn"
                      title="More"
                      aria-label={`More for ${doc.name}`}
                      onClick={() => setMenuId(menuId === doc.id ? null : doc.id)}
                    >
                      <svg viewBox="0 0 24 24">
                        <circle cx="6.5" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="17.5" cy="12" r="1.5" fill="currentColor" />
                      </svg>
                    </button>
                  </footer>
                </article>
              ))}
              {pageItems.length === 0 ? (
                <p className="docs-empty">No documents match your filters.</p>
              ) : null}
            </div>

            <footer className="docs-pager">
              <p>
                Showing {from} – {to} of {filtered.length} documents
              </p>
              <div className="docs-pages">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={n === safePage ? "is-active" : undefined}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </footer>
          </div>
        </section>

        {viewing ? (
          <div className="docs-preview" role="dialog" aria-label="Document preview">
            <div className="docs-preview-card">
              <header>
                <div>
                  <h3>{viewing.name}</h3>
                  <p>
                    {viewing.type} · {viewing.size} · {formatDate(viewing.date)}
                  </p>
                </div>
                <button type="button" className="docs-icon-btn" onClick={() => setViewId(null)} aria-label="Close">
                  ×
                </button>
              </header>
              <div className={`docs-preview-body tone-${typeTone(viewing.type)}`}>
                <strong>{viewing.type}</strong>
                <p>{viewing.categoryLabel}</p>
                <p>Preview placeholder for {viewing.name}</p>
              </div>
              <footer>
                <button
                  type="button"
                  className="docs-upload"
                  onClick={() => setNotice(`Downloading ${viewing.name}…`)}
                >
                  Download
                </button>
                <button type="button" className="docs-close-btn" onClick={() => setViewId(null)}>
                  Close
                </button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </RequirePermission>
  );
}
