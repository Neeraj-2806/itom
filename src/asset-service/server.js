const express = require("express");
const cors = require("cors");
const { createClient } = require("redis");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 5001;

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("connect", () => {
  console.log("Asset Service connected to Redis at localhost:6379");
});

redisClient.on("error", (err) => {
  console.error("Asset Service Redis Error:", err);
});

(async () => {
  await redisClient.connect();
})();

app.use(cors());
app.use(express.json());

const validateTenant = (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"];
  if (!tenantId) {
    return res.status(400).json({ error: "Missing X-Tenant-ID header" });
  }
  req.tenantId = tenantId;
  next();
};

app.get("/health", (req, res) => {
  res.json({ status: "UP", service: "asset-service" });
});

app.post("/api/assets", validateTenant, async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res
        .status(400)
        .json({ error: "Asset name and type are required" });
    }

    const allowedTypes = ["VM", "DB", "SWITCH"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid asset type. Allowed values: VM, DB, SWITCH",
      });
    }

    const assetId = uuidv4();
    const asset = {
      id: assetId,
      name,
      type,
      tenantId: req.tenantId,
      createdAt: new Date().toISOString(),
    };

    await redisClient.hSet(`asset:${assetId}`, asset);
    await redisClient.sAdd(`tenant:${req.tenantId}:assets`, assetId);

    res.status(201).json(asset);
  } catch (error) {
    console.error("Error creating asset:", error);
    res.status(500).json({ error: "Failed to create asset" });
  }
});

app.get("/api/assets", validateTenant, async (req, res) => {
  try {
    const assetIds = await redisClient.sMembers(`tenant:${req.tenantId}:assets`);
    const assets = [];

    for (const id of assetIds) {
      const asset = await redisClient.hGetAll(`asset:${id}`);
      if (Object.keys(asset).length > 0) {
        assets.push(asset);
      }
    }

    res.json(assets);
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

app.get("/api/assets/:id", validateTenant, async (req, res) => {
  try {
    const asset = await redisClient.hGetAll(`asset:${req.params.id}`);

    if (!asset || Object.keys(asset).length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    if (asset.tenantId !== req.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(asset);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.status(500).json({ error: "Failed to fetch asset" });
  }
});

app.put("/api/assets/:id", validateTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const asset = await redisClient.hGetAll(`asset:${id}`);
    if (!asset || Object.keys(asset).length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    if (asset.tenantId !== req.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (type) {
      const allowedTypes = ["VM", "DB", "SWITCH"];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          error: "Invalid asset type. Allowed values: VM, DB, SWITCH",
        });
      }
    }

    const updatedAsset = {
      ...asset,
      name: name || asset.name,
      type: type || asset.type,
    };

    await redisClient.hSet(`asset:${id}`, updatedAsset);

    res.json(updatedAsset);
  } catch (error) {
    console.error("Error updating asset:", error);
    res.status(500).json({ error: "Failed to update asset" });
  }
});

app.delete("/api/assets/:id", validateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await redisClient.hGetAll(`asset:${id}`);
    if (!asset || Object.keys(asset).length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    if (asset.tenantId !== req.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await redisClient.del(`asset:${id}`);
    await redisClient.sRem(`tenant:${req.tenantId}:assets`, id);

    res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

app.listen(PORT, () => {
  console.log(`Asset Service running on port ${PORT}`);
});
