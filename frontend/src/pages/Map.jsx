import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const Map = () => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showRiskAreas, setShowRiskAreas] = useState(true);
  const [centres, setCentres] = useState([]);

  // Mock data for Anganwadi centres
  useEffect(() => {
    setCentres([
      { id: 1, name: 'Centre A', lat: 28.6139, lng: 77.2090, riskLevel: 'low', beneficiaries: 150 },
      { id: 2, name: 'Centre B', lat: 28.6150, lng: 77.2100, riskLevel: 'medium', beneficiaries: 120 },
      { id: 3, name: 'Centre C', lat: 28.6170, lng: 77.2080, riskLevel: 'high', beneficiaries: 180 },
      { id: 4, name: 'Centre D', lat: 28.6120, lng: 77.2070, riskLevel: 'low', beneficiaries: 95 },
      { id: 5, name: 'Centre E', lat: 28.6190, lng: 77.2110, riskLevel: 'medium', beneficiaries: 110 }
    ]);
  }, []);

  const getRiskColor = (level) => {
    switch(level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const filteredCentres = selectedRegion 
    ? centres.filter(centre => centre.region === selectedRegion)
    : centres;

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="supervisor" />
        <main className="main-content">
          <h2>GIS Map - Clustering View</h2>
          <div className="map-container">
            <div className="map-controls">
              <label>
                <input
                  type="checkbox"
                  checked={showRiskAreas}
                  onChange={(e) => setShowRiskAreas(e.target.checked)}
                />
                Show Risk Areas
              </label>
              <select value={selectedRegion || ''} onChange={(e) => setSelectedRegion(e.target.value || null)}>
                <option value="">All Regions</option>
                <option value="north">North Zone</option>
                <option value="south">South Zone</option>
                <option value="east">East Zone</option>
                <option value="west">West Zone</option>
              </select>
            </div>
            
            <div className="map-wrapper">
              <MapContainer center={[28.6139, 77.2090]} zoom={13} style={{ height: '400px', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {filteredCentres.map(centre => (
                  showRiskAreas && (
                    <CircleMarker
                      key={centre.id}
                      center={[centre.lat, centre.lng]}
                      radius={15}
                      pathOptions={{
                        color: getRiskColor(centre.riskLevel),
                        fillColor: getRiskColor(centre.riskLevel),
                        fillOpacity: 0.6
                      }}
                    >
                      <Popup>
                        <div>
                          <strong>{centre.name}</strong><br />
                          Beneficiaries: {centre.beneficiaries}<br />
                          Risk Level: {centre.riskLevel}
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                ))}
              </MapContainer>
              <div className="legend">
                <h4>Risk Level Legend</h4>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                  <span>High Risk</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span>Medium Risk</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                  <span>Low Risk</span>
                </div>
              </div>
            </div>

            <div className="centre-list">
              <h3>Anganwadi Centres</h3>
              <table className="centre-table">
                <thead>
                  <tr>
                    <th>Centre Name</th>
                    <th>Beneficiaries</th>
                    <th>Risk Level</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {centres.map(centre => (
                    <tr key={centre.id}>
                      <td>{centre.name}</td>
                      <td>{centre.beneficiaries}</td>
                      <td>
                        <span className="risk-badge" style={{ backgroundColor: getRiskColor(centre.riskLevel) }}>
                          {centre.riskLevel}
                        </span>
                      </td>
                      <td>
                        <button className="view-btn">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Map;