const PARTIES = {
  TDP: { name: "Telugu Desam Party", color: "#F5C400", ink: "#1a1400", symbol: "Bicycle" },
  YSRCP: { name: "YSR Congress Party", color: "#1565C0", ink: "#fff", symbol: "Ceiling fan" },
  BJP: { name: "Bharatiya Janata Party", color: "#FF6F00", ink: "#1a0b00", symbol: "Lotus" },
  JSP: { name: "Janasena Party", color: "#E31C25", ink: "#fff", symbol: "Glass tumbler" },
  INC: { name: "Indian National Congress", color: "#19AAED", ink: "#041018", symbol: "Hand" },
  TRS: { name: "Telangana Rashtra Samithi", color: "#EC407A", ink: "#fff", symbol: "Car" },
  BRS: { name: "Bharat Rashtra Samithi", color: "#D81B60", ink: "#fff", symbol: "Car" },
  AIMIM: { name: "All India Majlis-e-Ittehadul Muslimeen", color: "#2E7D32", ink: "#fff", symbol: "Kite" },
  MIM: { name: "All India Majlis-e-Ittehadul Muslimeen", color: "#2E7D32", ink: "#fff", symbol: "Kite" },
  PRP: { name: "Praja Rajyam Party", color: "#8E24AA", ink: "#fff", symbol: "Railway engine" },
  JP: { name: "Janata Party", color: "#43A047", ink: "#fff", symbol: "Farmer" },
  JD: { name: "Janata Dal", color: "#2E7D32", ink: "#fff", symbol: "—" },
  CPI: { name: "Communist Party of India", color: "#DA1616", ink: "#fff", symbol: "Ears of corn" },
  "CPI(M)": { name: "Communist Party of India (Marxist)", color: "#B71C1C", ink: "#fff", symbol: "Hammer and sickle" },
  CPM: { name: "Communist Party of India (Marxist)", color: "#B71C1C", ink: "#fff", symbol: "Hammer and sickle" },
  BSP: { name: "Bahujan Samaj Party", color: "#1565C0", ink: "#fff", symbol: "Elephant" },
  NPT: { name: "Navodyam Party", color: "#6A1B9A", ink: "#fff", symbol: "—" },
  IND: { name: "Independent", color: "#78909C", ink: "#111", symbol: "—" },
  NOTA: { name: "None of the Above", color: "#90A4AE", ink: "#111", symbol: "—" },
  OTH: { name: "Others", color: "#607D8B", ink: "#fff", symbol: "—" }
};

function partyMeta(code) {
  if (!code) return PARTIES.OTH;
  return PARTIES[code] || { ...PARTIES.OTH, name: code };
}
