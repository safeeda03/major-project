import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { API } from '../services/api';

const MapScreen = () => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showRiskAreas, setShowRiskAreas] = useState(true);
  const [centres, setCentres] = useState([
    {
      id: 1,
      name: 'Centre A',
      latitude: 28.6139,
      longitude: 77.2090,
      riskLevel: 'low',
      beneficiaries: 150,
    },
    {
      id: 2,
      name: 'Centre B',
      latitude: 28.6150,
      longitude: 77.2100,
      riskLevel: 'medium',
      beneficiaries: 120,
    },
    {
      id: 3,
      name: 'Centre C',
      latitude: 28.6170,
      longitude: 77.2080,
      riskLevel: 'high',
      beneficiaries: 180,
    },
    {
      id: 4,
      name: 'Centre D',
      latitude: 28.6120,
      longitude: 77.2070,
      riskLevel: 'low',
      beneficiaries: 95,
    },
    {
      id: 5,
      name: 'Centre E',
      latitude: 28.6190,
      longitude: 77.2110,
      riskLevel: 'medium',
      beneficiaries: 110,
    },
  ]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const loadCentres = async () => {
    try {
      const data = await API.gis.getCentres();
      setCentres(data);
    } catch (error) {
      console.error('Error loading centres:', error);
    }
  };

  useEffect(() => {
    loadCentres();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GIS Map</Text>
        <Text style={styles.headerSubtitle}>Centre Clustering & Risk Analysis</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 28.6139,
            longitude: 77.2090,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {centres.map((centre) => (
            <React.Fragment key={centre._id || centre.id}>
              <Marker
                coordinate={{
                  latitude: centre.latitude,
                  longitude: centre.longitude,
                }}
                title={centre.name}
                description={`Risk: ${centre.riskLevel}, Beneficiaries: ${centre.beneficiaries}`}
              >
                <View style={[styles.marker, { backgroundColor: getRiskColor(centre.riskLevel) }]}>
                  <Text style={styles.markerText}>{centre.name.charAt(0)}</Text>
                </View>
              </Marker>
              {showRiskAreas && (
                <Circle
                  center={{
                    latitude: centre.latitude,
                    longitude: centre.longitude,
                  }}
                  radius={200}
                  fillColor={getRiskColor(centre.riskLevel) + '33'}
                  strokeColor={getRiskColor(centre.riskLevel)}
                  strokeWidth={2}
                />
              )}
            </React.Fragment>
          ))}
        </MapView>

        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowRiskAreas(!showRiskAreas)}
          >
            <Text style={styles.controlButtonText}>
              {showRiskAreas ? 'Hide Risk Areas' : 'Show Risk Areas'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Risk Level Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>High Risk</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Medium Risk</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Low Risk</Text>
        </View>
      </View>

      <ScrollView style={styles.centresList}>
        <Text style={styles.listTitle}>Anganwadi Centres</Text>
        {centres.map((centre) => (
          <TouchableOpacity
            key={centre._id || centre.id}
            style={styles.centreCard}
            onPress={() => Alert.alert(centre.name, `Beneficiaries: ${centre.beneficiaries}\nRisk Level: ${centre.riskLevel}`)}
          >
            <View style={styles.centreInfo}>
              <Text style={styles.centreName}>{centre.name}</Text>
              <Text style={styles.centreDetail}>Beneficiaries: {centre.beneficiaries}</Text>
            </View>
            <View
              style={[
                styles.riskBadge,
                { backgroundColor: getRiskColor(centre.riskLevel) },
              ]}
            >
              <Text style={styles.riskText}>{centre.riskLevel}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2c3e50',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 5,
  },
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlButtonText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  legendTitle: {
    position: 'absolute',
    top: -10,
    left: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#34495e',
  },
  centresList: {
    flex: 1,
    padding: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  centreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centreInfo: {
    flex: 1,
  },
  centreName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  centreDetail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 3,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  riskText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MapScreen;
