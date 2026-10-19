import 'package:geolocator/geolocator.dart';

/// A single GPS fix, or an error message explaining why we couldn't get one.
/// Real device GPS only — never a fake coordinate.
typedef LocationFix = ({double? lat, double? lng, String? error});

Future<LocationFix> getCurrentFix() async {
  final enabled = await Geolocator.isLocationServiceEnabled();
  if (!enabled) {
    return (lat: null, lng: null, error: 'Turn on location services to go online.');
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
    return (lat: null, lng: null, error: 'Location permission is needed to receive jobs near you.');
  }

  try {
    final pos = await Geolocator.getCurrentPosition();
    return (lat: pos.latitude, lng: pos.longitude, error: null);
  } catch (e) {
    return (lat: null, lng: null, error: 'Could not get your location. Please try again.');
  }
}
