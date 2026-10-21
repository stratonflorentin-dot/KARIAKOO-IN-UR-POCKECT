import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

/// A map marker shared by the customer, seller, and rider apps.
class KariakooMapPin {
  const KariakooMapPin({
    required this.point,
    required this.label,
    required this.icon,
    required this.color,
    this.onTap,
  });

  final LatLng point;
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
}

/// Shared KARIAKOO map: satellite imagery by default, with street map toggle.
/// Uses the same keyless Esri imagery and labels tiles as the web MapLibre map.
class KariakooMap extends StatefulWidget {
  const KariakooMap({
    super.key,
    required this.initialCenter,
    required this.pins,
    this.onTap,
    this.height = 230,
    this.zoom = 14,
    this.showGuideLine = false,
    this.userAgentPackageName = 'com.kariakoo.customer',
  });

  final LatLng initialCenter;
  final List<KariakooMapPin> pins;
  final ValueChanged<LatLng>? onTap;
  final double height;
  final double zoom;
  final bool showGuideLine;
  final String userAgentPackageName;

  @override
  State<KariakooMap> createState() => _KariakooMapState();
}

class _KariakooMapState extends State<KariakooMap> {
  bool _satellite = true;

  @override
  Widget build(BuildContext context) {
    final bounds = widget.pins.length > 1
        ? LatLngBounds.fromPoints(widget.pins.map((pin) => pin.point).toList())
        : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: widget.height,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: FlutterMap(
              key: ValueKey(
                  '${widget.initialCenter.latitude}:${widget.initialCenter.longitude}'),
              options: MapOptions(
                initialCenter: widget.initialCenter,
                initialZoom: widget.zoom,
                initialCameraFit: bounds == null
                    ? null
                    : CameraFit.bounds(
                        bounds: bounds,
                        padding: const EdgeInsets.all(44),
                      ),
                onTap: widget.onTap == null
                    ? null
                    : (_, point) => widget.onTap!(point),
              ),
              children: [
                if (_satellite) ...[
                  TileLayer(
                    urlTemplate:
                        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    maxZoom: 18,
                    userAgentPackageName: widget.userAgentPackageName,
                  ),
                  TileLayer(
                    urlTemplate:
                        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
                    maxZoom: 18,
                    userAgentPackageName: widget.userAgentPackageName,
                  ),
                ] else
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: widget.userAgentPackageName,
                  ),
                if (widget.showGuideLine && widget.pins.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: widget.pins.map((pin) => pin.point).toList(),
                        color: Colors.greenAccent.shade400,
                        strokeWidth: 3,
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: [
                    for (final pin in widget.pins)
                      Marker(
                        point: pin.point,
                        width: 48,
                        height: 48,
                        alignment: Alignment.bottomCenter,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: pin.onTap,
                          child: Tooltip(
                            message: pin.label,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: pin.color,
                                shape: BoxShape.circle,
                                border:
                                    Border.all(color: Colors.white, width: 2),
                                boxShadow: const [
                                  BoxShadow(
                                      color: Colors.black26, blurRadius: 5),
                                ],
                              ),
                              child: SizedBox(
                                width: 40,
                                height: 40,
                                child: Icon(pin.icon,
                                    color: Colors.white, size: 24),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _satellite
                      ? 'Imagery © Esri, Maxar, Earthstar Geographics'
                      : '© OpenStreetMap contributors',
                  style: const TextStyle(fontSize: 10, color: Colors.black54),
                ),
              ),
              TextButton.icon(
                onPressed: () => setState(() => _satellite = !_satellite),
                icon: Icon(
                    _satellite ? Icons.map_outlined : Icons.satellite_alt,
                    size: 18),
                label: Text(_satellite ? 'Street map' : 'Satellite'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
