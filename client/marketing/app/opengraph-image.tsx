import { ImageResponse } from "next/og";

export const alt = "Վիվա Ավտոդպրոց — ավտոդպրոց Երևան | Viva Autoschool Yerevan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #1a2332 0%, #243447 45%, #2d3f52 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#f48633",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            V
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Վիվա Ավտոդպրոց
            </div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.75)" }}>Viva Autoschool</div>
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 600, maxWidth: 900, lineHeight: 1.25, marginBottom: 20 }}>
          Վարորդական դասեր և տեսություն Երևանում
        </div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.8)", maxWidth: 860, lineHeight: 1.4 }}>
          Driving lessons & theory exam preparation in Yerevan, Armenia
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            color: "#f48633",
            fontWeight: 600,
          }}
        >
          viva-avtodproc.am
        </div>
      </div>
    ),
    { ...size },
  );
}
