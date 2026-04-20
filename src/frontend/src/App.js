import React, { useEffect, useState } from "react";
import AssetForm from "./components/AssetForm";
import IncidentForm from "./components/IncidentForm";
import Modal from "./components/Modal";
import "./styles.css";

const API = "/api";
const TENANT_ID = "tcs";

export default function App() {
  const [assets, setAssets] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  const [editingAsset, setEditingAsset] = useState(null);
  const [editingIncident, setEditingIncident] = useState(null);

  // 🔹 Fetch
  const fetchAssets = async () => {
    const res = await fetch(`${API}/assets`, {
      headers: { "x-tenant-id": TENANT_ID },
    });
    const data = await res.json();
    setAssets(data);
  };

  const fetchIncidents = async () => {
    const res = await fetch(`${API}/incidents`, {
      headers: { "x-tenant-id": TENANT_ID },
    });
    const data = await res.json();
    setIncidents(data);
  };

  useEffect(() => {
    fetchAssets();
    fetchIncidents();
  }, []);

  // 🔹 Delete
  const deleteAsset = async (id) => {
    await fetch(`${API}/assets/${id}`, {
      method: "DELETE",
      headers: { "x-tenant-id": TENANT_ID },
    });
    fetchAssets();
  };

  const deleteIncident = async (id) => {
    await fetch(`${API}/incidents/${id}`, {
      method: "DELETE",
      headers: { "x-tenant-id": TENANT_ID },
    });
    fetchIncidents();
  };

  // 🔹 Stats
  const totalAssets = assets.length;
  const totalIncidents = incidents.length;
  const high = incidents.filter(i => i.severity === "High").length;
  const medium = incidents.filter(i => i.severity === "Medium").length;

  return (
    <div className="app-shell">
      <div className="dashboard-container">

        {/* 🔹 Topbar */}
        <div className="topbar">
          <div>
            <span className="eyebrow">IT OPERATIONS</span>
            <h1 className="app-title">ITOM Dashboard</h1>
            <p className="app-subtitle">
              Monitor and manage infrastructure assets and incidents.
            </p>
          </div>

          <div className="topbar-right">
            <span className="tenant-selector-label">ACTIVE TENANT</span>
            <div className="active-tenant-chip">
              <span className="status-dot"></span>
              {TENANT_ID}
            </div>
          </div>
        </div>

        {/* 🔹 Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value">{totalAssets}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Incidents</div>
            <div className="stat-value">{totalIncidents}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">High Severity</div>
            <div className="stat-value">{high}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Medium Severity</div>
            <div className="stat-value">{medium}</div>
          </div>
        </div>

        {/* 🔹 Action Bar */}
        <div className="action-bar">
          <div className="action-bar-left">
            <button className="btn btn-primary" onClick={() => setShowAssetModal(true)}>
              + New Asset
            </button>

            <button className="btn btn-secondary" onClick={() => setShowIncidentModal(true)}>
              + New Incident
            </button>
          </div>

          <div className="action-bar-right">
            <div className="active-tenant-chip">
              <span className="status-dot"></span>
              Tenant: {TENANT_ID}
            </div>
          </div>
        </div>

        {/* 🔹 Assets */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Assets</h2>
              <p className="panel-subtitle">Infrastructure resources.</p>
            </div>
          </div>

          <div className="assets-grid">
            {assets.map(a => (
              <div key={a.id} className="asset-card">
                <div className="asset-card-top">
                  <div>
                    <div className="asset-name">{a.name}</div>
                    <div className="asset-id">{a.id}</div>
                  </div>

                  <div className={`type-pill type-${a.type.toLowerCase()}`}>
                    {a.type}
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn btn-ghost" onClick={() => {
                    setEditingAsset(a);
                    setShowAssetModal(true);
                  }}>
                    Edit
                  </button>

                  <button className="btn btn-danger" onClick={() => deleteAsset(a.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🔹 Incidents */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Incidents</h2>
          </div>

          <div className="incident-table">
            <div className="incident-table-head">
              <div>Incident</div>
              <div>Severity</div>
              <div>Asset</div>
              <div>Actions</div>
            </div>

            {incidents.map(i => {
              const asset = assets.find(a => a.id === i.assetId);

              return (
                <div key={i.id} className="incident-row">
                  <div>
                    <div className="incident-title">{i.title}</div>
                    <div className="incident-id">{i.id}</div>
                  </div>

                  <div>
                    <span className={`severity-badge severity-${i.severity.toLowerCase()}`}>
                      {i.severity}
                    </span>
                  </div>

                  <div className="incident-asset-name">
                    {asset?.name || "Unknown"}
                  </div>

                  <div className="incident-actions">
                    <button className="btn btn-ghost" onClick={() => {
                      setEditingIncident(i);
                      setShowIncidentModal(true);
                    }}>
                      Edit
                    </button>

                    <button className="btn btn-danger" onClick={() => deleteIncident(i.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🔹 Modals */}
        {showAssetModal && (
          <Modal onClose={() => {
            setShowAssetModal(false);
            setEditingAsset(null);
          }}>
            <AssetForm
              tenantId={TENANT_ID}
              asset={editingAsset}
              onSuccess={() => {
                setShowAssetModal(false);
                setEditingAsset(null);
                fetchAssets();
              }}
            />
          </Modal>
        )}

        {showIncidentModal && (
          <Modal onClose={() => {
            setShowIncidentModal(false);
            setEditingIncident(null);
          }}>
            <IncidentForm
              tenantId={TENANT_ID}
              incident={editingIncident}
              assets={assets}
              onSuccess={() => {
                setShowIncidentModal(false);
                setEditingIncident(null);
                fetchIncidents();
              }}
            />
          </Modal>
        )}

      </div>
    </div>
  );
}
