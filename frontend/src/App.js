import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_BASE = "https://finsignal.onrender.com";
const COLORS = ["#2c3e50", "#4f6f8f", "#7f9db9", "#a7c0d8", "#d6e3ef", "#51606e", "#8090a0", "#a8b4c0", "#c5ced8", "#e1e7ee"];

function App() {
  const [benchmark, setBenchmark] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [bankOverview, setBankOverview] = useState(null);
  const [topIssues, setTopIssues] = useState([]);
  const [wordCloud, setWordCloud] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/benchmark`)
      .then((res) => res.json())
      .then((data) => {
        setBenchmark(data.benchmark || []);
        if (data.benchmark && data.benchmark.length > 0) {
          handleBankChange(data.benchmark[0].bank);
        }
      });
  }, []);

  function handleBankChange(bankName) {
    setSelectedBank(bankName);

    if (!bankName) {
      setBankOverview(null);
      setTopIssues([]);
      setWordCloud([]);
      setStrategy(null);
      return;
    }

    fetch(`${API_BASE}/bank/${encodeURIComponent(bankName)}`)
      .then((res) => res.json())
      .then((data) => setBankOverview(data));

    fetch(`${API_BASE}/top-issues/${encodeURIComponent(bankName)}`)
      .then((res) => res.json())
      .then((data) => setTopIssues(data.top_issues || []));

    fetch(`${API_BASE}/wordcloud/${encodeURIComponent(bankName)}`)
      .then((res) => res.json())
      .then((data) => setWordCloud(data.words || []));

    setStrategy(null);
  }

  function generateStrategy() {
    if (!selectedBank) return;
    setStrategyLoading(true);
    fetch(`${API_BASE}/strategy/${encodeURIComponent(selectedBank)}`)
      .then((res) => res.json())
      .then((data) => {
        setStrategy(data);
        setStrategyLoading(false);
      })
      .catch(() => {
        setStrategy({
          core_issue: "Could not generate strategy.",
          opportunity: "Please check the backend deployment.",
          strategic_move: "Try again after confirming the API is online.",
          source: "frontend_error",
        });
        setStrategyLoading(false);
      });
  }

  const totalComplaints = benchmark.reduce((sum, bank) => sum + bank.total, 0);
  const highestBank = benchmark[0]?.bank || "N/A";
  const highestShare = benchmark[0]?.complaint_share_pct || 0;
  const keywordSignal = wordCloud.slice(0, 4).map((item) => item.word).join(", ");

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <h1 style={titleStyle}>FinSignal</h1>
          <p style={subtitleStyle}>
            Financial complaint intelligence for banks and fintechs. Benchmark competitors,
            detect customer pain points, and identify underserved opportunities from consumer complaint data.
          </p>
        </div>
        <div style={badgeStyle}>Live Prototype</div>
      </div>

      <div style={summaryGridStyle}>
        <MetricCard label="Banks Tracked" value={benchmark.length} />
        <MetricCard label="Complaints Analyzed" value={totalComplaints.toLocaleString()} />
        <MetricCard label="Highest Complaint Load" value={highestBank} small />
        <MetricCard label="Top Share" value={`${highestShare}%`} />
      </div>

      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={h2Style}>Market Benchmark</h2>
          <p style={mutedTextStyle}>Which institutions attract the largest share of complaints?</p>
        </div>
      </div>

      <div style={chartGridStyle}>
        <div style={cardStyle}>
          <h3>Complaints by Bank</h3>
          <div style={{ height: "330px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...benchmark].sort((a, b) => b.total - a.total)} margin={{ top: 10, right: 20, bottom: 80, left: 10 }}>
                <XAxis dataKey="bank" angle={-35} textAnchor="end" interval={0} height={95} tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(value) => `${value} complaints`} />
                <Bar dataKey="total" fill="#2c3e50" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h3>Complaint Share</h3>
          <div style={{ height: "330px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[...benchmark].sort((a, b) => b.total - a.total)}
                  dataKey="total"
                  nameKey="bank"
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(1)}%`}
                >
                  {[...benchmark].sort((a, b) => b.total - a.total).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Benchmark Table</h3>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: "#2c3e50", color: "white" }}>
              <th style={{ padding: "12px" }}>Bank</th>
              <th>Total Complaints</th>
              <th>Complaint Share</th>
              <th>Main Complaint Area</th>
            </tr>
          </thead>
          <tbody>
            {benchmark.map((b, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                <td style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>{b.bank}</td>
                <td>{b.total}</td>
                <td style={{ fontWeight: "bold", color: "#2c3e50" }}>{b.complaint_share_pct}%</td>
                <td>{b.top_product}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={h2Style}>Institution Deep Dive</h2>
          <p style={mutedTextStyle}>Select one bank to reveal product-level pain points and keyword signals.</p>
        </div>
        <select value={selectedBank} onChange={(e) => handleBankChange(e.target.value)} style={selectStyle}>
          <option value="">Select bank</option>
          {benchmark.map((b, i) => (
            <option key={i} value={b.bank}>{b.bank}</option>
          ))}
        </select>
      </div>

      {bankOverview && (
        <div style={{ marginTop: "20px" }}>
          <h2 style={h2Style}>{selectedBank}</h2>

          <div style={summaryGridStyle}>
            <MetricCard label="Complaints" value={bankOverview.total_complaints} />
            <MetricCard label="Share of Dataset" value={`${bankOverview.complaint_share_pct}%`} />
            <MetricCard label="Main Complaint Area" value={bankOverview.top_product} small />
            <MetricCard label="Strategic Signal" value="Pain Point Gap" small />
          </div>

          <div style={chartGridStyle}>
            <div style={cardStyle}>
              <h3>Product Pain Point Distribution</h3>
              <p style={mutedTextStyle}>Where complaints are concentrated for the selected institution.</p>
              <div style={{ height: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topIssues.slice(0, 6)}
                      dataKey="count"
                      nameKey="product"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={105}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {topIssues.slice(0, 6).map((entry, index) => (
                        <Cell key={`painpoint-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={cardStyle}>
              <h3>Top Complaint Areas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {topIssues.slice(0, 7).map((item, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontWeight: "bold" }}>{item.product}</span>
                      <span>{item.count}</span>
                    </div>
                    <div style={barBackgroundStyle}>
                      <div style={{ ...barFillStyle, width: `${topIssues[0] ? (item.count / topIssues[0].count) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={insightGridStyle}>
            <div style={cardStyle}>
              <h3>Keyword Intelligence</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {wordCloud.slice(0, 35).map((item, i) => (
                  <span key={i} style={{ ...keywordStyle, fontSize: `${Math.min(22, 12 + item.count / 18)}px` }}>
                    {item.word}
                  </span>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3>AI Strategy Recommendation</h3>
              <p style={mutedTextStyle}>
                Generate an executive recommendation using the selected institution's complaint concentration, pain points, and keyword signals.
              </p>
              <button style={buttonStyle} onClick={generateStrategy} disabled={strategyLoading}>
                {strategyLoading ? "Generating..." : "Generate AI strategy"}
              </button>
              <div style={recommendationBoxStyle}>
                <p style={{ marginTop: 0 }}>
                  <strong>1. Core issue:</strong> {strategy?.core_issue || `${selectedBank} has a concentration of complaints in ${bankOverview.top_product}.`}
                </p>
                <p>
                  <strong>2. Opportunity:</strong> {strategy?.opportunity || "A challenger fintech can compete by simplifying customer flows and reducing customer effort."}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>3. Strategic move:</strong> {strategy?.strategic_move || `Build positioning around real customer pain points such as ${keywordSignal || "trust, transparency, support"}.`}
                </p>
                {strategy?.source && (
                  <p style={{ ...mutedTextStyle, marginBottom: 0, marginTop: "14px" }}>
                    Mode: {strategy.source === "ai_ready_data_driven_mode" ? "AI-ready data-driven recommendation" : strategy.source}{strategy.model ? ` · Model: ${strategy.model}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, small }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{label}</h3>
      <p style={small ? smallMetricStyle : metricStyle}>{value}</p>
    </div>
  );
}

const pageStyle = { padding: "42px", fontFamily: "Inter, Arial, sans-serif", backgroundColor: "#f5f7fa", minHeight: "100vh", color: "#1f2937" };
const heroStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "30px", marginBottom: "30px" };
const titleStyle = { fontSize: "48px", margin: 0, color: "#1f2937" };
const subtitleStyle = { maxWidth: "950px", fontSize: "18px", lineHeight: "1.6", color: "#374151" };
const badgeStyle = { backgroundColor: "#2c3e50", color: "white", padding: "12px 18px", borderRadius: "999px", fontWeight: "bold" };
const summaryGridStyle = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginTop: "25px", marginBottom: "25px" };
const chartGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "20px", marginBottom: "24px" };
const insightGridStyle = { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", marginTop: "24px" };
const cardStyle = { backgroundColor: "white", padding: "22px", borderRadius: "16px", boxShadow: "0px 8px 22px rgba(15, 23, 42, 0.08)" };
const metricStyle = { fontSize: "36px", fontWeight: "800", margin: 0, color: "#1f2937" };
const smallMetricStyle = { fontSize: "20px", fontWeight: "800", margin: 0, color: "#1f2937" };
const h2Style = { fontSize: "28px", color: "#1f2937", marginBottom: "4px" };
const mutedTextStyle = { color: "#4b5563", lineHeight: "1.6" };
const sectionHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", marginTop: "35px" };
const tableStyle = { borderCollapse: "collapse", width: "100%", backgroundColor: "white" };
const selectStyle = { padding: "13px", width: "380px", fontSize: "16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white" };
const keywordStyle = { backgroundColor: "#e8eef5", padding: "8px 12px", borderRadius: "20px", fontWeight: "600", color: "#2c3e50" };
const barBackgroundStyle = { height: "10px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" };
const barFillStyle = { height: "10px", backgroundColor: "#2c3e50", borderRadius: "999px" };
const recommendationBoxStyle = { marginTop: "18px", padding: "18px", backgroundColor: "#eef4fb", borderLeft: "5px solid #2c3e50", borderRadius: "10px", lineHeight: "1.6" };
const buttonStyle = { marginTop: "8px", marginBottom: "12px", padding: "12px 18px", backgroundColor: "#2c3e50", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };

export default App;