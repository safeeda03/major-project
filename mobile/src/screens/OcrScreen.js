import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { API } from '../services/api';

const OcrScreen = () => {
  const [asset, setAsset] = useState(null);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const resultPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Allow camera access',
        message: 'PoshanAI uses the camera to scan a document for text extraction.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    );

    return resultPermission === PermissionsAndroid.RESULTS.GRANTED;
  };

  const selectImage = async (source) => {
    if (source === 'camera' && !(await requestCameraPermission())) {
      Alert.alert('Camera permission required', 'Allow camera access in Android settings to scan a document.');
      return;
    }

    const options = {
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
      maxWidth: 2200,
      maxHeight: 2200,
      cameraType: 'back',
    };
    const response = source === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);

    if (response.didCancel) {
      return;
    }
    if (response.errorCode || !response.assets?.[0]?.uri) {
      Alert.alert('Could not select image', response.errorMessage || 'Choose a JPG, PNG, or WebP image and try again.');
      return;
    }

    setAsset(response.assets[0]);
    setResult(null);
  };

  const processImage = async () => {
    if (!asset?.uri) {
      Alert.alert('Choose an image first', 'Take a clear photo of the document or select one from your gallery.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await API.ocr.processDocument({
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `document-${Date.now()}.jpg`,
      });
      setResult(response.data);
    } catch (error) {
      Alert.alert('OCR failed', error.response?.data?.message || 'Could not extract text from this image. Please try a clearer photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const details = result && [
    ['Child name', result.childName],
    ['Date of birth', result.dateOfBirth],
    ['Parent or guardian', result.parentName],
  ].filter(([, value]) => value);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Icon name="document-scanner" size={38} color="#165C55" />
        <Text style={styles.title}>Document OCR</Text>
        <Text style={styles.subtitle}>Scan a clear image to extract text. Always verify extracted details before saving.</Text>
      </View>

      <View style={styles.card}>
        {asset?.uri ? (
          <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="image-search" size={44} color="#7f8c8d" />
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => selectImage('camera')} disabled={isProcessing}>
            <Icon name="photo-camera" size={20} color="#165C55" />
            <Text style={styles.secondaryButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => selectImage('library')} disabled={isProcessing}>
            <Icon name="photo-library" size={20} color="#165C55" />
            <Text style={styles.secondaryButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.processButton, (!asset || isProcessing) && styles.processButtonDisabled]}
          onPress={processImage}
          disabled={!asset || isProcessing}
        >
          {isProcessing ? <ActivityIndicator color="#fff" /> : <Icon name="text-snippet" size={20} color="#fff" />}
          <Text style={styles.processButtonText}>{isProcessing ? 'Reading document…' : 'Extract text'}</Text>
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.card}>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionTitle}>Extracted information</Text>
            <Text style={styles.confidence}>{result.confidence}% confidence</Text>
          </View>
          <Text style={styles.notice}>Review this information against the original document before using it.</Text>

          {details?.length ? details.map(([label, value]) => (
            <View style={styles.detailRow} key={label}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          )) : <Text style={styles.emptyResult}>No structured fields were recognized.</Text>}

          {result.vaccinationRecords?.length > 0 && (
            <View style={styles.recordsContainer}>
              <Text style={styles.recordsTitle}>Vaccines mentioned</Text>
              {result.vaccinationRecords.map((record, index) => (
                <Text key={`${record.vaccine}-${index}`} style={styles.recordText}>
                  • {record.vaccine}{record.date ? ` — ${record.date}` : ''}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.rawTextLabel}>Recognized text</Text>
          <Text selectable style={styles.rawText}>{result.rawText || 'No readable text found.'}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 28 },
  hero: { alignItems: 'center', paddingVertical: 16 },
  title: { marginTop: 8, color: '#172B2A', fontSize: 24, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#5f6f6e', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  preview: { width: '100%', height: 260, backgroundColor: '#f2f5f4', borderRadius: 10 },
  placeholder: { width: '100%', height: 190, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#b8c5c2', backgroundColor: '#f9fbfa' },
  placeholderText: { marginTop: 10, color: '#7f8c8d', fontSize: 15 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 9, borderWidth: 1, borderColor: '#b8d7cf', backgroundColor: '#edf6f3', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 7 },
  secondaryButtonText: { color: '#165C55', fontSize: 15, fontWeight: '600' },
  processButton: { minHeight: 48, borderRadius: 9, backgroundColor: '#165C55', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 12 },
  processButtonDisabled: { opacity: 0.45 },
  processButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  sectionTitle: { color: '#172B2A', fontSize: 18, fontWeight: '700', flex: 1 },
  confidence: { color: '#165C55', backgroundColor: '#e2f1ec', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, fontSize: 12, fontWeight: '700' },
  notice: { marginTop: 10, color: '#875b00', backgroundColor: '#fff4d6', padding: 10, borderRadius: 8, fontSize: 13, lineHeight: 18 },
  detailRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#edf0ef' },
  detailLabel: { color: '#5f6f6e', fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  detailValue: { color: '#172B2A', fontSize: 16, marginTop: 3 },
  emptyResult: { color: '#5f6f6e', paddingVertical: 14 },
  recordsContainer: { marginTop: 16, backgroundColor: '#f6f8f7', padding: 12, borderRadius: 8 },
  recordsTitle: { color: '#172B2A', fontSize: 14, fontWeight: '700', marginBottom: 5 },
  recordText: { color: '#34495e', fontSize: 14, lineHeight: 21 },
  rawTextLabel: { marginTop: 18, color: '#5f6f6e', fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  rawText: { marginTop: 7, color: '#22302f', backgroundColor: '#f6f8f7', padding: 12, borderRadius: 8, fontSize: 14, lineHeight: 20 },
});

export default OcrScreen;
