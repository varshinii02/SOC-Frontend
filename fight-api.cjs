const express = require("express");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3002;

// Load YAML file
const yamlPath = path.join(
  __dirname,
  "public",
  "fight.yaml"
);

const yamlText = fs.readFileSync(
  yamlPath,
  "utf8"
);

const fightData = yaml.load(yamlText);

console.log("FiGHT YAML loaded successfully");

// get all techniques

app.get("/api/fight/techniques", (req, res) => {

  const techniques = (fightData.techniques || []).filter(
    (item) =>
      item["object-type"] === "technique"
  );

  res.json({
    count: techniques.length,
    techniques: techniques
  });

});

// get one technique

app.get("/api/fight/techniques/:id", (req, res) => {

  const techniqueId =
    req.params.id.toLowerCase();

  const technique =
    (fightData.techniques || []).find(
      (item) =>
        item["object-type"] === "technique" &&
        String(item.id).toLowerCase() === techniqueId
    );

  if (!technique) {
    return res.status(404).json({
      error: "Technique not found"
    });
  }

  res.json(technique);

});

// get all tatics

app.get("/api/fight/tactics", (req, res) => {

  const tactics = (fightData.tactics || []).filter(
    (item) =>
      item["object-type"] === "tactic"
  );

  res.json({
    count: tactics.length,
    tactics: tactics
  });

});

// get one tatic

app.get("/api/fight/tactics/:id", (req, res) => {

  const tacticId =
    req.params.id.toLowerCase();

  const tactic =
    (fightData.tactics || []).find(
      (item) =>
        item["object-type"] === "tactic" &&
        String(item.id).toLowerCase() === tacticId
    );

  if (!tactic) {
    return res.status(404).json({
      error: "Tactic not found"
    });
  }

  res.json(tactic);

});

//  GET ALL MITIGATIONS


app.get("/api/fight/mitigations", (req, res) => {

  const mitigations =
    (fightData.mitigations || []).filter(
      (item) =>
        item["object-type"] === "mitigation"
    );

  res.json({
    count: mitigations.length,
    mitigations: mitigations
  });

});


// post

const customTechniques = [];

app.post("/api/fight/techniques", (req, res) => {

  const newTechnique = req.body;

  if (!newTechnique.id || !newTechnique.name) {
    return res.status(400).json({
      error: "id and name are required"
    });
  }

  customTechniques.push(newTechnique);

  res.status(201).json({
    message: "Technique created successfully",
    technique: newTechnique
  });

});

// patch

app.patch("/api/fight/techniques/:id", (req, res) => {

  const techniqueId = req.params.id.toLowerCase();

  const technique = customTechniques.find(
    (item) =>
      String(item.id).toLowerCase() === techniqueId
  );

  if (!technique) {
    return res.status(404).json({
      error: "Technique not found"
    });
  }

  Object.assign(technique, req.body);

  res.json({
    message: "Technique updated successfully",
    technique: technique
  });

});

// put

app.put("/api/fight/techniques/:id", (req, res) => {

  const techniqueId = req.params.id.toLowerCase();

  const index = customTechniques.findIndex(
    (item) =>
      String(item.id).toLowerCase() === techniqueId
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Technique not found"
    });
  }

  const replacement = req.body;

  if (!replacement.id || !replacement.name || !replacement.description) {
    return res.status(400).json({
      error: "id, name and description are required"
    });
  }

  customTechniques[index] = replacement;

  res.json({
    message: "Technique replaced successfully",
    technique: replacement
  });

});

// delete

app.delete("/api/fight/techniques/:id", (req, res) => {

  const techniqueId = req.params.id.toLowerCase();

  const index = customTechniques.findIndex(
    (item) =>
      String(item.id).toLowerCase() === techniqueId
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Technique not found"
    });
  }

  const deletedTechnique =
    customTechniques.splice(index, 1);

  res.json({
    message: "Technique deleted successfully",
    technique: deletedTechnique[0]
  });

});

app.listen(PORT, () => {

  console.log(
    `FiGHT API server running on port ${PORT}`
  );

});