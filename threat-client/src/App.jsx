import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function formatMarkdown(text) {
  if (!text) return "";

  return text
    // Put citations on their own line
    .replace(/\s*\(Citation:\s*/g, "\n\n**Citation:** ")
    .replace(/\)(?=\s*\n\n\*\*Citation:\*\*)/g, "")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function MarkdownText({ children }) {
  const formattedText = (children || "")
    .replace(/\n\s*\n(?=\(Citation:)/g, " ")
    .replace(/\)\s*\n\s*\(Citation:/g, ")(Citation:");

  return (
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
          />
        ),

        p: ({ children }) => (
          <p className="markdown-paragraph">
            {children}
          </p>
        ),

        ul: ({ children }) => (
          <ul className="markdown-list">
            {children}
          </ul>
        ),

        ol: ({ children }) => (
          <ol className="markdown-list">
            {children}
          </ol>
        ),

        li: ({ children }) => (
          <li>{children}</li>
        ),

        strong: ({ children }) => (
          <strong className="markdown-strong">
            {children}
          </strong>
        ),

        em: ({ children }) => (
          <em>{children}</em>
        ),

        code: ({ children, className, ...props }) => {
          const isInline = !className;

          if (isInline) {
            return (
              <code
                className="inline-code"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <pre className="code-block">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        }
      }}
    >
      {formattedText}
    </ReactMarkdown>
  );
}

function App() {
  const [attackId, setAttackId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
  if (!attackId.trim()) {
    setResult(null);
    setError("Please enter a FiGHT Technique ID");
    return;
  }

  setError("");
  setResult(null);

  try {
    const response = await fetch(
      `https://soc-threat-backend.onrender.com/api/attack/${encodeURIComponent(
        attackId.trim()
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Attack not found");
    }

    setResult(data);
  } catch (error) {
    setError(error.message || "Failed to fetch");
  }
};

  const handleClear = () => {
    setResult(null);
    setError("");
    setAttackId("");
  };

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        <h1>Threat Client</h1>

        <div className="search-container">

          <div className="search-box">
            <span className="search-prompt">&gt;</span>

            <input
              type="text"
              placeholder="Search by technique name or ID"
              value={attackId}
              onChange={(e) =>
                setAttackId(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>

          <div className="search-actions">
            <button onClick={handleSearch}>
              Search
            </button>

            <button
              className="clear-button"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>

        </div>
      </div>

      {/* ERROR */}
      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {/* RESULT */}
      {result && (
        <div className="result">

          {/* FiGHT TECHNIQUE */}
          <div className="technique-header">

            <h2>{result.name}</h2>

            <p className="technique-meta">
              <strong>ID:</strong>{" "}
              {result.id}
            </p>

            <p className="technique-meta">
              <strong>Tactics:</strong>{" "}
              {result.tactics?.join(", ") ||
                "Not specified"}
            </p>

          </div>

          {/* FIGHT DESCRIPTION */}
          <section className="description">

            <div className="description-label">
              Description
            </div>

            <div className="markdown-content">
              <MarkdownText>
                {result.description ||
                  "No description available."}
              </MarkdownText>
            </div>

          </section>

          {/* MITRE ATT&CK */}
          <section className="section">

            <h2 className="section-title">
              MITRE ATT&CK
            </h2>

            <div className="section-content">

              {result.mitreMappingAvailable &&
              result.mitre ? (
                <>

                  <p className="mitre-id">
                    <strong>MITRE ID:</strong>{" "}
                    {result.mitreId}
                  </p>

                  <h3 className="mitre-name">
                    {result.mitre.name}
                  </h3>

                  <div className="mitre-description markdown-content">
                    <MarkdownText>
                      {result.mitre.description ||
                        "No description available."}
                    </MarkdownText>
                  </div>

                  {result.mitre.url && (
                    <div className="mitre-link-container">
                      <a
                        className="mitre-link"
                        href={result.mitre.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View MITRE ATT&CK
                      </a>
                    </div>
                  )}

                </>
              ) : (
                <p className="empty-message">
                  MITRE mapping unavailable for this
                  technique.
                </p>
              )}

            </div>

          </section>

          {/* MITIGATIONS */}
          <section className="section">

            <h2 className="section-title">
              Mitigations
            </h2>

            <div className="section-content">

              {result.mitigations?.length > 0 ? (

                result.mitigations.map(
                  (mitigation) => (
                    <div
                      className="item"
                      key={
                        mitigation.id ||
                        mitigation.name
                      }
                    >

                      <h3 className="item-id">
                        {mitigation.id}
                      </h3>

                      <h4 className="item-name">
                        {mitigation.name}
                      </h4>

                      <div className="item-description markdown-content">
                        <MarkdownText>
                          {mitigation.description ||
                            "No description available."}
                        </MarkdownText>
                      </div>

                    </div>
                  )
                )

              ) : (

                <p className="empty-message">
                  No mitigations available.
                </p>

              )}

            </div>

          </section>

          {/* DETECTIONS */}
          <section className="section">

            <h2 className="section-title">
              Detection
            </h2>

            <div className="section-content">

              {result.detections?.length > 0 ? (

                result.detections.map(
                  (detection) => (
                    <div
                      className="item"
                      key={
                        detection.id ||
                        detection.name
                      }
                    >

                      <h3 className="item-id">
                        {detection.id}
                      </h3>

                      <h4 className="item-name">
                        {detection.name}
                      </h4>

                      <div className="item-description markdown-content">
                        <MarkdownText>
                          {detection.description ||
                            "No description available."}
                        </MarkdownText>
                      </div>

                    </div>
                  )
                )

              ) : (

                <p className="empty-message">
                  No detection strategies available.
                </p>

              )}

            </div>

          </section>

        </div>
      )}

    </div>
  );
}

export default App;