import { useEffect, useState } from "react";
import { load } from "js-yaml";
import "./App.css";

function renderDescription(description) {
  if (!description) {
    return "No description available.";
  }

  const citations = [];

  // Remove citation markers and collect them for References
  const cleanDescription = description
    .replace(/\(Citation:\s*([^)]+)\)/g, (_, citation) => {
      citations.push(citation.trim());
      return "";
    })
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Convert Markdown-style links into clickable links
  const parts = cleanDescription.split(
    /(\[[^\]]+\]\(https?:\/\/[^)]+\))/g
  );

  const content = parts.map((part, index) => {
    const match = part.match(
      /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/
    );

    if (match) {
  return (
    <a
      key={index}
      href={match[2]}
      target="_blank"
      rel="noopener noreferrer"
    >
      {match[1]}
    </a>
  );
}

    return part;
  });

  return (
    <>
      <p className="description-paragraph">
        {content}
      </p>

      {citations.length > 0 && (
        <div className="description-references">
          <span className="references-title">
            References
          </span>

          <div className="references-list">
            {citations.map((citation, index) => (
              <span
                className="reference-item"
                key={index}
              >
                {citation}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function App() {
const [fightData, setFightData] = useState(null);
const [error, setError] = useState("");
const [search, setSearch] = useState("");
const [selectedTechnique, setSelectedTechnique] = useState(null);
const [selectedTactic, setSelectedTactic] = useState(null);

const [attackData, setAttackData] = useState(null);
const [attackLoading, setAttackLoading] = useState(false);
const [attackError, setAttackError] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}fight.yaml`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load FiGHT YAML");
        }

        return response.text();
      })
      .then((text) => {
        const data = load(text);
        setFightData(data);
      })
      .catch((error) => {
        console.error(error);
        setError(error.message);
      });
  }, []);

  useEffect(() => {
  if (!selectedTechnique) {
    setAttackData(null);
    return;
  }

  setAttackLoading(true);
  setAttackError("");

  fetch(`http://localhost:3001/api/attack/${selectedTechnique.id}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load MITRE ATT&CK data");
      }

      return response.json();
    })
    .then((data) => {
      setAttackData(data);
    })
    .catch((error) => {
      console.error(error);
      setAttackError(error.message);
      setAttackData(null);
    })
    .finally(() => {
      setAttackLoading(false);
    });
}, [selectedTechnique]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedTechnique) {
          setSelectedTechnique(null);
        } else if (selectedTactic) {
          setSelectedTactic(null);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTechnique, selectedTactic]);

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!fightData) {
    return (
      <div className="loading">
        Loading FiGHT Threat Intelligence...
      </div>
    );
  }

  const tactics = fightData.tactics || [];

  const techniques = (fightData.techniques || []).filter(
    (technique) =>
      technique["object-type"] === "technique" &&
      (
        technique.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        technique.id
          ?.toLowerCase()
          .includes(search.toLowerCase())
      )
  );

  const totalTechniques =
    fightData.techniques?.filter(
      (technique) => technique["object-type"] === "technique"
    ).length || 0;

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div>
          <h1>Threat Intel</h1>

          <p>
            FiGHT — 5G Telecom Threat Intelligence
          </p>
        </div>

        <div className="stats">
          <div>
            <strong>{tactics.length}</strong>
            <span>tactics</span>
          </div>

          <div>
            <strong>{totalTechniques}</strong>
            <span>techniques</span>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <section className="matrix-section">

        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="search by technique name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Matrix Title */}
        <div className="matrix-title">
          <h2>FiGHT Threat Matrix</h2>

          <p>
            MITRE FiGHT tactics and techniques for 5G telecom security
          </p>
        </div>

        {/* Matrix */}
        <div className="matrix">

          {tactics.map((tactic) => {

            const tacticTechniques = techniques.filter(
              (technique) =>
                technique.tactics?.includes(tactic.id)
            );

            return (
              <div
                className="tactic-column"
                key={tactic.id}
              >

                {/* Tactic Header */}
                <div
                  className="tactic-header"
                  onClick={() => setSelectedTactic(tactic)}
                >

                  <h3>{tactic.name}</h3>

                  <span>{tactic.id}</span>

                  <small>
                    {tacticTechniques.length} techniques
                  </small>

                </div>

                {/* Techniques */}
                <div className="technique-list">

                  {tacticTechniques.map((technique) => (

                    <div
                      className="technique-card"
                      key={technique.id}
                      onClick={() =>
                        setSelectedTechnique(technique)
                      }
                    >

                      <span>
                        {technique.id}
                      </span>

                      <div>
                        <strong>
                          {technique.name}
                        </strong>

                        {technique["subtechnique-of"] && (
                          <small>
                            sub-technique
                          </small>
                        )}
                      </div>

                    </div>

                  ))}

                  {tacticTechniques.length === 0 && (
                    <div className="empty" />
                  )}

                </div>

              </div>
            );
          })}

        </div>
      </section>

      {/* Tactic Popup */}
      {selectedTactic && (

        <div
          className="modal-overlay tactic-overlay"
          onClick={() => setSelectedTactic(null)}
        >

          <div
            className="modal tactic-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="modal-close"
              onClick={() => setSelectedTactic(null)}
            >
              ×
            </button>

            <h2>
              {selectedTactic.name}
            </h2>

            <p className="technique-id">
              {selectedTactic.id}
            </p>

            <p className="tactic-modal-label">
              tactic
            </p>

            <h3 className="modal-techniques-title">
              Techniques
            </h3>

            <div className="modal-technique-list">

              {techniques
                .filter((technique) =>
                  technique.tactics?.includes(
                    selectedTactic.id
                  )
                )
                .map((technique) => (

                  <div
                    className="modal-technique-card"
                    key={technique.id}
                    onClick={() => {
  setSelectedTactic(null);
  setSelectedTechnique(technique);
}}
                  >

                    <span>
                      {technique.id}
                    </span>

                    <div>
                      <strong>
                        {technique.name}
                      </strong>

                      {technique["subtechnique-of"] && (
                        <small>
                          sub-technique
                        </small>
                      )}
                    </div>

                  </div>

                ))}

            </div>

          </div>

        </div>

      )}

      {/* Technique Popup */}
      {selectedTechnique && (

        <div
          className="modal-overlay technique-overlay"
          onClick={() => setSelectedTechnique(null)}
        >

          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="modal-close"
              onClick={() =>
                setSelectedTechnique(null)
              }
            >
              ×
            </button>

            <h2>
              {selectedTechnique.name}
            </h2>

            <p className="technique-id">
              {selectedTechnique.id}
            </p>

            <p className="technique-tactic">

              <strong>
                Tactic:
              </strong>{" "}

              {tactics
                .filter((tactic) =>
                  selectedTechnique.tactics?.includes(
                    tactic.id
                  )
                )
                .map((tactic) => tactic.name)
                .join(", ") || "Not specified"}

            </p>

            {/* Description */}
            <div className="description-section">

              <div className="description-heading">
                Description
              </div>

              <div className="description">
                {renderDescription(
                  selectedTechnique.description
                )}
              </div>

            </div>

            {/* MITRE ATT&CK Information */}
{attackLoading && (
  <div className="attack-loading">
    Loading MITRE ATT&CK information...
  </div>
)}

{attackError && (
  <div className="attack-error">
    {attackError}
  </div>
)}

{attackData && (
  <>
    {/* MITRE ATT&CK */}
<div className="attack-section">
  <div className="attack-heading">
    MITRE ATT&CK
  </div>

  {attackData.mitreMappingAvailable ? (
    <div className="attack-card">
      <div className="attack-id">
        {attackData.mitreId}
      </div>

      <strong>
        {attackData.mitre?.name}
      </strong>

      <div className="description">
  {renderDescription(attackData.mitre?.description)}
</div>

      {attackData.mitre?.url && (
        <a
          href={attackData.mitre.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View MITRE ATT&CK
        </a>
      )}
    </div>
  ) : (
    <div className="attack-empty">
      MITRE mapping unavailable for this technique.
    </div>
  )}
</div>

    {/* Mitigations */}
    <div className="attack-section">
      <div className="attack-heading">
        Mitigations
      </div>

      {attackData.mitigations?.length > 0 ? (
        <div className="attack-list">
          {attackData.mitigations.map((mitigation) => (
            <div
              className="attack-card"
              key={mitigation.id}
            >
              <div className="attack-id">
                {mitigation.id}
              </div>

              <strong>
                {mitigation.name}
              </strong>

              <div className="description">
  {renderDescription(mitigation.description)}
</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="attack-empty">
          No mitigations available.
        </div>
      )}
    </div>

    {/* Detections */}
    <div className="attack-section">
      <div className="attack-heading">
        Detection
      </div>

      {attackData.detections?.length > 0 ? (
        <div className="attack-list">
          {attackData.detections.map((detection) => (
            <div
              className="attack-card"
              key={detection.id}
            >
              <div className="attack-id">
                {detection.id}
              </div>

              <strong>
                {detection.name}
              </strong>

              <div className="description">
  {renderDescription(
    detection.description || "No description available."
  )}
</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="attack-empty">
          No detection strategies available.
        </div>
      )}
    </div>
  </>
)}

            {/* Sub-technique Type */}
            {selectedTechnique["subtechnique-of"] && (
              <p>
                <strong>
                  Type:
                </strong>{" "}
                Sub-technique
              </p>
            )}

          </div>

        </div>

      )}

    </div>
  );
}

export default App;