import React, { useState } from "react";

const ASSET_API = "/api";

export default function AssetForm({ tenantId, asset, onSuccess }) {
  const [name, setName] = useState(asset?.name || "");
  const [type, setType] = useState(asset?.type || "VM");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Use fallback tenant (since dropdown removed)
    const FINAL_TENANT = tenantId || "tcs";

    if (!name.trim()) {
      alert("Asset name is required");
      return;
    }

    try {
      setLoading(true);

      const isEdit = !!asset?.id;
      const url = isEdit
        ? `${ASSET_API}/assets/${asset.id}`
        : `${ASSET_API}/assets`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": FINAL_TENANT,
        },
        body: JSON.stringify({
          name,
          type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save asset");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save asset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <h2 className="form-title">
        {asset ? "Edit Asset" : "Create Asset"}
      </h2>
      <p className="form-subtitle">
        Add or update an infrastructure asset.
      </p>

      <div className="form-group">
        <label className="form-label">Asset Name</label>
        <input
          className="form-input"
          type="text"
          placeholder="Enter asset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Asset Type</label>
        <select
          className="form-input"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="VM">VM</option>
          <option value="DB">DB</option>
          <option value="SWITCH">SWITCH</option>
        </select>
      </div>

      <button
        className="btn btn-primary form-submit"
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Saving..."
          : asset
          ? "Update Asset"
          : "Create Asset"}
      </button>
    </form>
  );
}
