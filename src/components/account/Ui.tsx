/** Small presentational pieces shared by the site tabs. Server components. */

export const CARD = "rounded-xl border border-border bg-surface p-5 sm:p-6 mb-8";

export function Metric({ label, value, help, extra }: { label: string; value: string; help: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface border border-border p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {extra && <p className="text-xs mt-1">{extra}</p>}
      <p className="text-xs text-muted mt-2 leading-relaxed">{help}</p>
    </div>
  );
}

export function Table({
  title,
  empty,
  head,
  rows,
  id,
  footer,
}: {
  title?: string;
  empty: string;
  head: string[];
  rows: React.ReactNode[][];
  id?: string;
  footer?: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-xl bg-surface border border-border p-4 sm:p-5 scroll-mt-20">
      {title && <h2 className="font-semibold mb-3">{title}</h2>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted">
              <tr>
                {head.map((h, i) => (
                  <th key={h + i} scope="col" className={`py-1.5 font-medium ${i ? "text-right pl-3" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={`py-1.5 align-top ${j ? "text-right pl-3 whitespace-nowrap" : "break-words"}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </section>
  );
}

/** Result of the last action, carried in ?msg= after a redirect. */
export function Flash({ msg, text }: { msg?: string; text?: string }) {
  if (!msg || !text) return null;
  const bad = /error|rejected|key|none|busy|wait/.test(msg);
  return (
    <p role={bad ? "alert" : "status"} className={`mb-6 rounded-lg border px-4 py-3 text-sm ${bad ? "border-score-orange text-score-orange" : "border-score-green text-score-green"}`}>
      {text}
    </p>
  );
}

export function Hidden({ locale, siteId }: { locale: string; siteId: string }) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="siteId" value={siteId} />
    </>
  );
}

export const fill = (tpl: string, params: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
