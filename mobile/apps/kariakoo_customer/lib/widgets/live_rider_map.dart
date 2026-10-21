import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// Shows the assigned rider's recent GPS position on the customer's order.
/// The server RPC only returns coordinates to the owning customer while the
/// delivery is active, and suppresses stale/offline rider positions.
class LiveRiderMap extends ConsumerStatefulWidget {
  const LiveRiderMap({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<LiveRiderMap> createState() => _LiveRiderMapState();
}

class _LiveRiderMapState extends ConsumerState<LiveRiderMap> {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) {
        ref.invalidate(riderLocationForOrderProvider(widget.orderId));
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final location = ref.watch(riderLocationForOrderProvider(widget.orderId));
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Live rider location',
              style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          location.when(
            loading: () => const SizedBox(
              height: 170,
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (_, __) =>
                const _MapMessage('Rider location is temporarily unavailable.'),
            data: (point) => point == null
                ? const _MapMessage(
                    'Waiting for your rider to share a live location. This map updates automatically.')
                : _map(point),
          ),
        ],
      ),
    );
  }

  Widget _map(RiderTrackingLocation point) {
    final rider = LatLng(point.riderLat, point.riderLng);
    final destination = point.dropoffLat != null && point.dropoffLng != null
        ? LatLng(point.dropoffLat!, point.dropoffLng!)
        : null;
    final center = destination == null
        ? rider
        : LatLng((rider.latitude + destination.latitude) / 2,
            (rider.longitude + destination.longitude) / 2);
    final pins = <KariakooMapPin>[
      KariakooMapPin(
        point: rider,
        label: 'Your rider',
        icon: Icons.delivery_dining,
        color: Colors.green,
      ),
      if (destination != null)
        KariakooMapPin(
          point: destination,
          label: 'Delivery destination',
          icon: Icons.location_on,
          color: Colors.red,
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        KariakooMap(
          key: ValueKey(
              '${point.riderLat.toStringAsFixed(4)}:${point.riderLng.toStringAsFixed(4)}'),
          initialCenter: center,
          zoom: 13,
          showGuideLine: pins.length > 1,
          pins: pins,
        ),
        const SizedBox(height: 4),
        Text('Rider location updated ${_age(point.updatedAt)}',
            style: const TextStyle(fontSize: 11, color: AppColors.muted)),
      ],
    );
  }

  String _age(DateTime time) {
    final seconds = DateTime.now().difference(time).inSeconds;
    if (seconds < 5) return 'just now';
    if (seconds < 60) return '$seconds sec ago';
    return '${seconds ~/ 60} min ago';
  }
}

class _MapMessage extends StatelessWidget {
  const _MapMessage(this.message);
  final String message;

  @override
  Widget build(BuildContext context) => Container(
        height: 145,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.brand50,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(message, textAlign: TextAlign.center),
      );
}
