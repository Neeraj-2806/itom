import React, { useState } from "react";

const INCIDENT_API = "/api";

export default function IncidentForm({ tenantId, incident, assets = [], onSuccess }) {
  const [title, setTitle] = useState(incident?.title || "");
  const [severity, setSeverity] = useState(incident?.severity || "Low");
  const [assetId, setAssetId] = useState(
    incident?.assetId || (assets.length > 0 ? assets[0].id : "")
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const FINAL_TENANT = tenantId || "tcs";

    if (!title.trim()) {
      alert("Incident title is required");
      return;
    }

    if (!assetId) {
      alert("Please select an asset");
      return;
    }

    try {
      setLoading(true);

      const isEdit = !!incident?.id;

      const url = isEdit
        ? `${INCIDENT_API}/incidents/${incident.id}`
        : `${INCIDENT_API}/incidents`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": FINAL_TENANT,
        },
        body: JSON.stringify({
          title,
          assetId,
          severity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save incident");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save incident");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <h2 className="form-title">
        {incident ? "Edit Incident" : "Create Incident"}
      </h2>

      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          className="form-input"
          type="text"
          placeholder="Enter incident title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Severity</label>
        <select
          className="form-input"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Asset</label>
        <select
          className="form-input"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        >
          {assets.length === 0 ? (
            <option value="">No assets available</option>
          ) : (
            assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.type})
              </option>
            ))
          )}
        </select>
      </div>

      <button
        className="btn btn-primary form-submit"
        type="submit"
        disabled={loading}
      >
        {loading ? "Saving..." : incident ? "Update Incident" : "Create Incident"}
      </button>
    </form>
  );
}
