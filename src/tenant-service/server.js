const express = require("express");
const cors = require("cors");
const { createClient } = require("redis");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 5003;

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("connect", () => {
  console.log("Tenant Service connected to Redis at localhost:6379");
});

redisClient.on("error", (err) => {
  console.error("Tenant Service Redis Error:", err);
});

(async () => {
  await redisClient.connect();
})();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "UP", service: "tenant-service" });
});

app.post("/api/tenants", async (req, res) => {
  try {
    const { name, adminEmail } = req.body;

    if (!name || !adminEmail) {
      return res
        .status(400)
        .json({ error: "Tenant name and adminEmail are required" });
    }

    const tenantId = uuidv4();
    const tenant = {
      tenantId,
      name,
      adminEmail,
      createdAt: new Date().toISOString(),
    };

    await redisClient.hSet(`tenant:${tenantId}`, tenant);
    await redisClient.sAdd("tenants", tenantId);

    res.status(201).json(tenant);
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

app.get("/api/tenants", async (req, res) => {
  try {
    const tenantIds = await redisClient.sMembers("tenants");
    const tenants = [];

    for (const id of tenantIds) {
      const tenant = await redisClient.hGetAll(`tenant:${id}`);
      if (Object.keys(tenant).length > 0) {
        tenants.push(tenant);
      }
    }

    res.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

app.get("/api/tenants/:id", async (req, res) => {
  try {
    const tenant = await redisClient.hGetAll(`tenant:${req.params.id}`);

    if (!tenant || Object.keys(tenant).length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

app.put("/api/tenants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, adminEmail } = req.body;

    const existingTenant = await redisClient.hGetAll(`tenant:${id}`);
    if (!existingTenant || Object.keys(existingTenant).length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const updatedTenant = {
      ...existingTenant,
      name: name || existingTenant.name,
      adminEmail: adminEmail || existingTenant.adminEmail,
    };

    await redisClient.hSet(`tenant:${id}`, updatedTenant);

    res.json(updatedTenant);
  } catch (error) {
    console.error("Error updating tenant:", error);
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

app.delete("/api/tenants/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingTenant = await redisClient.hGetAll(`tenant:${id}`);
    if (!existingTenant || Object.keys(existingTenant).length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const assetIds = await redisClient.sMembers(`tenant:${id}:assets`);
    for (const assetId of assetIds) {
      await redisClient.del(`asset:${assetId}`);
    }

    const incidentIds = await redisClient.sMembers(`tenant:${id}:incidents`);
    for (const incidentId of incidentIds) {
      await redisClient.del(`incident:${incidentId}`);
    }

    await redisClient.del(`tenant:${id}`);
    await redisClient.del(`tenant:${id}:assets`);
    await redisClient.del(`tenant:${id}:incidents`);
    await redisClient.sRem("tenants", id);

    res.json({ message: "Tenant deleted successfully" });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

app.listen(PORT, () => {
  console.log(`Tenant Service running on port ${PORT}`);
});
