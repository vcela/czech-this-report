import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Czech Th!s Report — free website audit";

export default async function OgImage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const cs = locale === "cs";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0c1222 0%, #131b30 60%, #16324f 100%)",
          color: "#e8ecf6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
          Czech Th<span style={{ color: "#4fd1c5" }}>!</span>s{" "}
          <span style={{ color: "#9aa7c4", fontWeight: 400, marginLeft: 14 }}>Report</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            marginTop: 40,
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {cs
            ? "Audit webu zdarma: AI viditelnost, SEO a přístupnost"
            : "Free website audit: AI visibility, SEO & accessibility"}
        </div>
        <div style={{ display: "flex", marginTop: 44, gap: 20 }}>
          {(cs ? ["AI viditelnost", "SEO", "Přístupnost"] : ["AI visibility", "SEO", "Accessibility"]).map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  border: "2px solid #4fd1c5",
                  borderRadius: 999,
                  padding: "12px 32px",
                  fontSize: 30,
                  color: "#4fd1c5",
                }}
              >
                {label}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}
