const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const axios = require("axios");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3001;

// Load FiGHT YAML data


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

// MITRE ATT&CK TAXII API

const MITRE_API =
  "https://attack-taxii.mitre.org/api/v21/collections/x-mitre-collection--1f5f1533-f617-4ca8-9ab4-6a02367fa019/objects";

const MITRE_HEADERS = {
  Accept: "application/taxii+json;version=2.1"
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function axiosGetWithRetry(
  url,
  config,
  retries = 4,
  baseDelayMs = 500
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      const status = error.response?.status;

      const isRetryable =
        status === 502 ||
        status === 429 ||
        status === 503;

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      const retryAfterHeader =
        error.response?.headers?.["retry-after"];

      const delay = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : baseDelayMs * Math.pow(2, attempt) +
          Math.floor(Math.random() * 250);

      console.warn(
        `MITRE returned ${status}, retry ${attempt + 1}/${retries} in ${delay}ms`
      );

      await sleep(delay);
    }
  }
}

// MITRE CACHE

const mitreCache = {
  "attack-pattern": null,
  "relationship": null,
  "course-of-action": null,
  "x-mitre-detection-strategy": null,
  "x-mitre-analytic": null
};

const mitreLoading = {};

// Helper: Fetch all pages from MITRE TAXII

async function getAllMITREObjects(type) {

  // Return cached data if already loaded
  if (mitreCache[type]) {
    console.log(`Using cached MITRE ${type} objects`);

    return mitreCache[type];
  }

  // If another request is already loading the same data,
  // wait for that request instead of starting another one.
  if (mitreLoading[type]) {
    console.log(`Waiting for MITRE ${type} request already in progress`);

    return mitreLoading[type];
  }

  // Create the loading promise
  mitreLoading[type] = (async () => {

    let allObjects = [];
    let next = null;

    try {

      do {

        const params = {
          "match[type]": type,
          limit: 1000
        };

        if (next) {
          params.next = next;
        }

        const response = await axiosGetWithRetry(
  MITRE_API,
  {
    headers: MITRE_HEADERS,
    params,
    timeout: 30000
  }
);

        allObjects = allObjects.concat(
          response.data.objects || []
        );

        next = response.data.more
          ? response.data.next
          : null;

      } while (next);

      console.log(
        `MITRE ${type} objects received:`,
        allObjects.length
      );

      // Store in cache
      mitreCache[type] = allObjects;

      return allObjects;

    } catch (error) {

      console.error(
        `MITRE ${type} fetch failed:`,
        error.message
      );

      throw error;

    } finally {

      // Remove loading state
      delete mitreLoading[type];

    }

  })();

  return mitreLoading[type];
}

// API: FiGHT ID -> MITRE ATT&CK information

app.get("/api/attack/:id", async (req, res) => {

  try {

    const attackId = req.params.id;

    // Find FiGHT technique

const searchTerm = attackId
  .trim()
  .toLowerCase()
  .replace(/\s+/g, " ");

const technique =
  (fightData.techniques || []).find((item) => {

    const itemId = String(item.id || "")
      .trim()
      .toLowerCase();

    const itemName = String(item.name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    return (
      item["object-type"] === "technique" &&
      (
        itemId === searchTerm ||
        itemName === searchTerm
      )
    );
  });

  console.log("SEARCH:", JSON.stringify(attackId));
console.log(
  "MATCH:",
  technique
    ? {
        id: technique.id,
        name: technique.name
      }
    : "NOT FOUND"
);

  const debugTechnique =
  (fightData.techniques || []).find(
    (item) =>
      item["object-type"] === "technique" &&
      item.id?.toLowerCase() === searchTerm
  );

console.log("DEBUG TECHNIQUE:", debugTechnique);

    if (!technique) {

      return res.status(404).json({
        error: "Technique not found in FiGHT YAML"
      });

    }


function deriveMitreId(fightId) {

  const match = fightId.match(/^FGT(\d+(?:\.\d+)?)$/i);

  return match ? `T${match[1]}` : null;

}

const mitreId = deriveMitreId(technique.id);
const mitreIdSource = "direct";

if (!mitreId) {

  return res.status(404).json({
    error: `Could not derive MITRE ID from FiGHT ID ${attackId}`
  });

}

    // Step 1: Get MITRE attack-pattern

    const attackPatterns =
  await getAllMITREObjects(
    "attack-pattern"
  );

// Find exact MITRE mapping

let mitreTechnique =
  attackPatterns.find(
    (obj) =>
      obj.type === "attack-pattern" &&
      obj.external_references?.some(
        (ref) =>
          ref.source_name === "mitre-attack" &&
          ref.external_id === mitreId
      )
  );

// No exact MITRE mapping
// Do NOT fall back to the parent technique.

if (!mitreTechnique) {

  console.warn(
    `No exact MITRE mapping for FiGHT ${attackId} (looked for ${mitreId})`
  );

  return res.json({

    id: technique.id,

    name: technique.name,

    description: technique.description || "",

    tactics: technique.tactics || [],

    mitreId: null,

    mitreIdSource: "none",

    mitreMappingAvailable: false,

    mitre: null,

    mitigations: [],

    detections: []

  });

}

const techniqueStixId =
  mitreTechnique.id;

console.log(
  `Found exact MITRE match ${mitreId} with STIX ID: ${techniqueStixId}`
);

    // Step 2: Get relationships

    const relationships =
      await getAllMITREObjects(
        "relationship"
      );

    // Step 3: Find mitigations

    const mitigationIds =
      relationships
        .filter(
          (obj) =>
            obj.relationship_type ===
              "mitigates" &&
            obj.target_ref ===
              techniqueStixId
        )
        .map(
          (obj) =>
            obj.source_ref
        );

    console.log(
      "Mitigation relationships found:",
      mitigationIds.length
    );

    // Step 4: Find detection strategies

    const detectionIds =
      relationships
        .filter(
          (obj) =>
            obj.relationship_type ===
              "detects" &&
            obj.target_ref ===
              techniqueStixId
        )
        .map(
          (obj) =>
            obj.source_ref
        );

    console.log(
      "Detection relationships found:",
      detectionIds.length
    );

    // Step 5: Get mitigation objects

    const mitigationObjects =
      await getAllMITREObjects(
        "course-of-action"
      );

    const mitigations =
      mitigationObjects
        .filter(
  (obj) =>
    mitigationIds.includes(obj.id) &&
    !obj.revoked &&
    !obj.x_mitre_deprecated
)
        .map(
          (obj) => ({
            id:
              obj.external_references?.find(
                (ref) =>
                  ref.source_name ===
                  "mitre-attack"
              )?.external_id || null,

            name:
              obj.name,

            description:
              obj.description || ""
          })
        );

    console.log(
      "Mitigations found:",
      mitigations.length
    );

    // Step 6: Get detection strategy objects

    const detectionObjects =
  await getAllMITREObjects(
    "x-mitre-detection-strategy"
  );

const analyticObjects =
  await getAllMITREObjects(
    "x-mitre-analytic"
  );

console.log(
  "RAW DETECTION OBJECT:",
  JSON.stringify(
    detectionObjects.find((obj) =>
      detectionIds.includes(obj.id)
    ),
    null,
    2
  )
);

const analyticById = new Map(
  analyticObjects.map((obj) => [
    obj.id,
    obj
  ])
);

function getDetectionDescription(obj) {

  if (
    obj.description &&
    obj.description.trim().length > 0
  ) {
    return obj.description;
  }

  if (
    Array.isArray(obj.x_mitre_analytic_refs)
  ) {

    const analyticDescriptions =
      obj.x_mitre_analytic_refs
        .map(
          (ref) =>
            analyticById.get(ref)?.description
        )
        .filter(
          (desc) =>
            desc &&
            desc.trim().length > 0
        );

    if (analyticDescriptions.length > 0) {
      return analyticDescriptions.join("\n\n");
    }
  }

  return "";
}

    const detections =
      detectionObjects
        .filter(
  (obj) =>
    detectionIds.includes(obj.id) &&
    !obj.revoked &&
    !obj.x_mitre_deprecated
)
        .map(
          (obj) => ({
            id:
              obj.external_references?.find(
                (ref) =>
                  ref.source_name ===
                  "mitre-attack"
              )?.external_id || null,

            name:
              obj.name,
              description:
  getDetectionDescription(obj)

          })
        );

    console.log(
      "Detections found:",
      detections.length
    );

    // Send response back to client

    res.json({

      id:
        technique.id,

      name:
        technique.name,

      description:
        technique.description || "",

      tactics:
        technique.tactics || [],

      mitreId:

  mitreId,

mitreIdSource:

  mitreIdSource,

mitreMappingAvailable:

  true,

mitre: {

        name:
          mitreTechnique.name,

        description:
          mitreTechnique.description ||
          "",

        url:
          mitreTechnique.external_references?.find(
            (ref) =>
              ref.source_name ===
              "mitre-attack"
          )?.url || null

      },

      mitigations,

      detections

    });

  } catch (error) {

    console.error(
      "MITRE API error:",
      error.message
    );

    res.status(500).json({

      error:
        "Failed to fetch MITRE ATT&CK data",

      details:
        error.message

    });

  }

});

// Start server

// Serve React frontend
const distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));

// React fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Threat server running on port ${PORT}`);
});
