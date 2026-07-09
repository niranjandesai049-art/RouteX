import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;

class LocationService {
  io.Socket? _socket;
  Timer? _timer;
  bool _isTracking = false;

  double _currentLatitude = 28.6139; // Start in Delhi
  double _currentLongitude = 77.2090;

  void initializeSocket(String baseUrl, String token) {
    _socket = io.io(baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'extraHeaders': {'Authorization': 'Bearer $token'}
    });
    _socket?.connect();
  }

  void startTracking(String tripId) {
    if (_isTracking) return;
    _isTracking = true;

    // Simulate real-time truck movement
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      // Small simulated coordinate step towards Mumbai (approx. -0.005 lat, +0.002 lon)
      _currentLatitude -= 0.005;
      _currentLongitude += 0.002;

      final data = {
        'tripId': tripId,
        'latitude': _currentLatitude,
        'longitude': _currentLongitude,
        'timestamp': DateTime.now().toIso8601String(),
        'speed': 45.5, // km/h
        'heading': 210.0, // bearing
      };

      if (_socket != null && _socket!.connected) {
        _socket!.emit('locationUpdate', data);
      } else {
        print('Mock Live GPS Coordinates: Lat: $_currentLatitude, Lng: $_currentLongitude');
      }
    });
  }

  void stopTracking() {
    _timer?.cancel();
    _isTracking = false;
    _socket?.disconnect();
  }
}
