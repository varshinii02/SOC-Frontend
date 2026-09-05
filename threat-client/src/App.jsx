import { useState } from "react";

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
        `http://localhost:3001/api/attack/${attackId.trim()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Attack not found");
      }

      setResult(data);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
  <div className="app">

    <div className="header">
      <h1>Threat Client</h1>

      <div className="search-container">

        <input
  type="text"
  placeholder="Search by technique name or ID"
  value={attackId}
  onChange={(e) => setAttackId(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }}
/>

        <button onClick={handleSearch}>
          Search
        </button>

        <button
          className="clear-button"
          onClick={() => {
            setResult(null);
            setError("");
            setAttackId("");
          }}
        >
          Clear
        </button>

      </div>
    </div>

    {error && (
      <p className="error">
        {error}
      </p>
    )}

    {result && (
      <div className="result">

        {/* FiGHT TECHNIQUE */}

        <div className="technique-header">
          <h2>{result.name}</h2>

          <p className="technique-meta">
            <strong>ID:</strong> {result.id}
          </p>

          <p className="technique-meta">
            <strong>Tactics:</strong>{" "}
            {result.tactics?.join(", ") || "Not specified"}
          </p>
        </div>

        {/* DESCRIPTION */}

        <div className="description">
          <strong>Description:</strong>{" "}
          {result.description || "No description available."}
        </div>

        {/* MITRE */}

        <section className="section">
          <h2 className="section-title">
            MITRE ATT&CK
          </h2>

          <div className="section-content">

            {result.mitreMappingAvailable && result.mitre ? (
              <>
                <p className="mitre-id">
                  <strong>MITRE ID:</strong>{" "}
                  {result.mitreId}
                </p>

                <h3 className="mitre-name">
                  {result.mitre.name}
                </h3>

                <p className="mitre-description">
                  {result.mitre.description}
                </p>

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
                MITRE mapping unavailable for this technique.
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
              result.mitigations.map((mitigation) => (
                <div
                  className="item"
                  key={mitigation.id}
                >
                  <h3 className="item-id">
                    {mitigation.id}
                  </h3>

                  <h4 className="item-name">
                    {mitigation.name}
                  </h4>

                  <p className="item-description">
                    {mitigation.description ||
                      "No description available."}
                  </p>
                </div>
              ))
            ) : (
              <p className="empty-message">
                No mitigations available.
              </p>
            )}

          </div>
        </section>

        {/* DETECTION */}

        <section className="section">
          <h2 className="section-title">
            Detection
          </h2>

          <div className="section-content">

            {result.detections?.length > 0 ? (
              result.detections.map((detection) => (
                <div
                  className="item"
                  key={detection.id}
                >
                  <h3 className="item-id">
                    {detection.id}
                  </h3>

                  <h4 className="item-name">
                    {detection.name}
                  </h4>

                  <p className="item-description">
                    {detection.description ||
                      "No description available."}
                  </p>
                </div>
              ))
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