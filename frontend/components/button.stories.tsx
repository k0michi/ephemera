import React from "react";
import PrimaryButton from "./button";

export const Table = () => {
  const hues = Array.from({ length: 13 }, (_, i) => i * 30);
  const lightnesses = Array.from({ length: 9 }, (_, i) => 10 + i * 10);
  const saturations = Array.from({ length: 5 }, (_, i) => 20 + i * 20);

  return (
    <div style={{ padding: "20px", overflowX: "auto", fontFamily: "sans-serif" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "900px" }}>
        <thead>
          <tr>
            <th style={thStyle}>Hue \ Lightness</th>
            {lightnesses.map((l) => (
              <th key={l} style={thStyle}>
                {l}%
              </th>
            ))}
          </tr>
        </thead>

        {saturations.map((s) => {
          const sPercent = `${s}%`;

          return (
            <tbody key={s}>
              <tr>
                <td
                  colSpan={lightnesses.length + 1}
                  style={sectionHeaderStyle}
                >
                  Saturation: {sPercent}
                </td>
              </tr>

              {hues.map((h) => (
                <tr key={h}>
                  <td style={{ ...tdStyle, fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                    {h}°
                    <div style={{ width: "24px", height: "12px", display: "inline-block", marginLeft: "8px", backgroundColor: `hsl(${h} ${sPercent} 50%)`, borderRadius: "2px", verticalAlign: "middle" }} />
                  </td>

                  {lightnesses.map((l) => {
                    const hslColor = `hsl(${h} ${sPercent} ${l}%)`;

                    return (
                      <td key={l} style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                          <PrimaryButton baseColor={hslColor} size="small">
                            Aa
                          </PrimaryButton>

                          <span style={{ fontSize: "10px", color: "#888", userSelect: "all" }}>
                            {h}°, {s}%, {l}%
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "12px 8px",
  backgroundColor: "#f5f5f5",
  textAlign: "center",
  fontSize: "13px",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "12px 6px",
  textAlign: "center",
  verticalAlign: "middle",
};

const sectionHeaderStyle: React.CSSProperties = {
  backgroundColor: "#222",
  color: "#fff",
  fontWeight: "bold",
  padding: "10px 16px",
  fontSize: "14px",
  textAlign: "left",
  letterSpacing: "1px",
};