import { useEffect, useState } from "react";
import { load } from "js-yaml";
import "./App.css";

function renderDescription(description) {
  if (!description) {
    return "No description available.";
  }

  const parts = description.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g);

  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);

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
}

function App() {
  const [fightData, setFightData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [selectedTactic, setSelectedTactic] = useState(null);

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
            <span>Tactics</span>
          </div>

          <div>
            <strong>{totalTechniques}</strong>
            <span>Techniques</span>
          </div>
        </div>
      </header>


      {/* Main Section */}
      <section className="matrix-section">

        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by technique name or ID..."
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

                      <strong>
                        {technique.name}
                      </strong>

                      <span>
                        {technique.id}
                      </span>

                      {technique["subtechnique-of"] && (
                        <small>
                          Sub-technique
                        </small>
                      )}

                    </div>

                  ))}


                  {tacticTechniques.length === 0 && (
                    <div className="empty">
                      No techniques
                    </div>
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
              Tactic
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
                      setSelectedTechnique(technique);
                    }}
                  >

                    <strong>
                      {technique.name}
                    </strong>

                    <span>
                      {technique.id}
                    </span>

                    {technique["subtechnique-of"] && (
                      <small>
                        Sub-technique
                      </small>
                    )}

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


            <p>
              <strong>
                Description
              </strong>
            </p>


            <p className="description">
              {renderDescription(
                selectedTechnique.description
              )}
            </p>


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