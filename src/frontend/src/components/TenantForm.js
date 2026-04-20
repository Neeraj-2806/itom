import React, { useState } from "react";

const TENANT_API = "/api";

export default function TenantForm({ tenant, onSuccess }) {
  const [name, setName] = useState(tenant?.name || "");
  const [adminEmail, setAdminEmail] = useState(tenant?.adminEmail || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !adminEmail.trim()) {
      alert("Tenant name and admin email are required");
      return;
    }

    try {
      setLoading(true);

      const tenantId = tenant?.tenantId || tenant?.id;
      const isEdit = !!tenantId;

      const url = isEdit
        ? `${TENANT_API}/tenants/${tenantId}`
        : `${TENANT_API}/tenants`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          adminEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save tenant");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <h2 className="form-title">{tenant ? "Edit Tenant" : "Create Tenant"}</h2>
      <p className="form-subtitle">Add or update a tenant in the platform.</p>

      <div className="form-group">
        <label className="form-label">Tenant Name</label>
        <input
          className="form-input"
          type="text"
          placeholder="Enter tenant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Admin Email</label>
        <input
          className="form-input"
          type="email"
          placeholder="Enter admin email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
        />
      </div>

      <button className="btn btn-primary form-submit" type="submit" disabled={loading}>
        {loading ? "Saving..." : tenant ? "Update Tenant" : "Create Tenant"}
      </button>
    </form>
  );
}
