const express = require("express");
const cors = require("cors");
const { createClient } = require("redis");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 5002;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const ASSET_SERVICE_URL =
  process.env.ASSET_SERVICE_URL || "http://localhost:5001";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "";

const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on("connect", () => {
  console.log(`Incident Service connected to Redis at ${REDIS_URL}`);
});

redisClient.on("error", (err) => {
  console.error("Incident Service Redis Error:", err);
});

(async () => {
  await redisClient.connect();
})();

app.use(cors());
app.use(express.json());

const resolveTenant = (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"] || DEFAULT_TENANT_ID;

  if (!tenantId) {
    return res.status(400).json({
      error:
        "Missing tenant context. Send x-tenant-id header or set DEFAULT_TENANT_ID",
    });
  }

  req.tenantId = tenantId;
  next();
};

app.get("/health", (req, res) => {
  res.json({ status: "UP", service: "incident-service" });
});

// Helper: validate asset by calling asset-service API
async function getAssetForTenant(assetId, tenantId) {
  const response = await fetch(`${ASSET_SERVICE_URL}/api/assets`, {
    method: "GET",
    headers: {
      "x-tenant-id": tenantId,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch assets from asset-service: ${response.status}`
    );
  }

  const assets = await response.json();
  const asset = assets.find((a) => a.id === assetId);

  return asset || null;
}

app.post("/api/incidents", resolveTenant, async (req, res) => {
  try {
    const { title, assetId, severity, description } = req.body;

    if (!title || !assetId || !severity) {
      return res
        .status(400)
        .json({ error: "title, assetId and severity are required" });
    }

    const asset = await getAssetForTenant(assetId, req.tenantId);

    if (!asset) {
      return res.status(404).json({ error: "Related asset not found" });
    }

    if (asset.tenantId && asset.tenantId !== req.tenantId) {
      return res.status(403).json({ error: "Asset does not belong to tenant" });
    }

    const incidentId = uuidv4();
    const incident = {
      id: incidentId,
      title,
      assetId,
      severity,
      description: description || "",
      tenantId: req.tenantId,
      createdAt: new Date().toISOString(),
    };

    await redisClient.hSet(`incident:${incidentId}`, incident);
    await redisClient.sAdd(`tenant:${req.tenantId}:incidents`, incidentId);

    res.status(201).json(incident);
  } catch (error) {
    console.error("Error creating incident:", error.message);
    res.status(500).json({ error: "Failed to create incident" });
  }
});

app.get("/api/incidents", resolveTenant, async (req, res) => {
  try {
    const incidentIds = await redisClient.sMembers(
      `tenant:${req.tenantId}:incidents`
    );
    const incidents = [];

    for (const id of incidentIds) {
      const incident = await redisClient.hGetAll(`incident:${id}`);
      if (Object.keys(incident).length > 0) {
        incidents.push(incident);
      }
    }

    res.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

app.get("/api/incidents/:id", resolveTenant, async (req, res) => {
  try {
    const incident = await redisClient.hGetAll(`incident:${req.params.id}`);

    if (!incident || Object.keys(incident).length === 0) {
      return res.status(404).json({ error: "Incident not found" });
    }

    if (incident.tenantId !== req.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(incident);
  } catch (error) {
    console.error("Error fetching incident:", error);
    res.status(500).json({ error: "Failed to fetch incident" });
  }
});

app.put("/api/incidents/:id", resolveTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, assetId, severity, description } = req.body;

    const incident = await redisClient.hGetAll(`incident:${id}`);
    if (!incident || Object.keys(incident).length === 0) {
      return res.status(404).json({ error: "Incident not found" });
    }

    if (incident.tenantId !== req.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (assetId) {
      const asset = await getAssetForTenant(assetId, req.tenantId);

      if (!asset) {
        return res.status(404).json({ error: "Related asset not found" });
      }

      if (asset.tenantId && asset.tenantId !== req.tenantId) {
        return res
          .status(403)
          .json({ error: "Asset does not belong to tenant" });
      }
    }

    const updatedIncident = {
      ...incident,
      title: title || incident.title,
      assetId: assetId || incident.assetId,
      severity: severity || incident.severity,
      description:
        description !== undefined ? description : incident.description || "",
    };

    await redisClient.hSet(`incident:${id}`, updatedIncident);

    res.json(updatedIncident);
  } catch (error) {
    console.error("Error updating incident:", error);
    res.status(500).json({ error: "Failed to update incident" });
  }
});

app.delete("/api/incidents/:id", resolveTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await redisClient.hGetAll(`incident:${id}`);
    if (!incident || Object.keys(incident).length === 0) {
      return res.status(404).json({ error: "Incident not found" });
    }

    if (incident.tenantId !== req.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await redisClient.del(`incident:${id}`);
    await redisClient.sRem(`tenant:${req.tenantId}:incidents`, id);

    res.json({ message: "Incident deleted successfully" });
  } catch (error) {
    console.error("Error deleting incident:", error);
    res.status(500).json({ error: "Failed to delete incident" });
  }
});

app.listen(PORT, () => {
  console.log(`Incident Service running on port ${PORT}`);
});
