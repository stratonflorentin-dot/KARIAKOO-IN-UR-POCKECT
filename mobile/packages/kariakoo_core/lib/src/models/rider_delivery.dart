/// A rider's delivery (the readable columns of the deliveries table — the PIN
/// hash is never exposed to clients).
class RiderDelivery {
  const RiderDelivery({
    required this.orderId,
    required this.status,
    required this.riderPayoutTzs,
    this.riderId,
    this.dropoffLat,
    this.dropoffLng,
    this.dropoffAddress = '',
    this.pickups = const [],
  });

  final String orderId;
  final String
      status; // PENDING_ASSIGNMENT | ASSIGNED | ACCEPTED | PICKED_UP | IN_TRANSIT | DELIVERED | FAILED | CANCELLED
  final int riderPayoutTzs;
  final String? riderId;
  final double? dropoffLat;
  final double? dropoffLng;
  final String dropoffAddress;
  final List<PickupStop> pickups;

  String get statusLabel => switch (status) {
        'ACCEPTED' => 'Accepted',
        'PICKED_UP' => 'Picked up',
        'IN_TRANSIT' => 'On the way',
        'DELIVERED' => 'Delivered',
        'FAILED' => 'Failed',
        'CANCELLED' => 'Cancelled',
        _ => 'Assigned',
      };

  /// The next transition a rider can make with rider_advance_delivery, or null.
  String? get nextStep => switch (status) {
        'ACCEPTED' => 'PICKED_UP',
        'PICKED_UP' => 'IN_TRANSIT',
        _ => null,
      };

  String? get nextStepLabel => switch (status) {
        'ACCEPTED' => 'Confirm pickup',
        'PICKED_UP' => 'Start trip to customer',
        _ => null,
      };

  factory RiderDelivery.fromJson(Map<String, dynamic> json) => RiderDelivery(
        orderId: json['order_id'] as String,
        status: json['status'] as String,
        riderPayoutTzs: (json['rider_payout_tzs'] as num?)?.toInt() ?? 0,
        riderId: json['rider_id'] as String?,
        dropoffLat: (json['dropoff_lat'] as num?)?.toDouble(),
        dropoffLng: (json['dropoff_lng'] as num?)?.toDouble(),
        dropoffAddress: json['dropoff_address'] as String? ?? '',
        pickups: (json['pickups'] as List<dynamic>? ?? const [])
            .map((e) => PickupStop.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class PickupStop {
  const PickupStop({
    required this.shopId,
    required this.name,
    required this.address,
    this.lat,
    this.lng,
  });

  final String shopId;
  final String name;
  final String address;
  final double? lat;
  final double? lng;

  factory PickupStop.fromJson(Map<String, dynamic> json) => PickupStop(
        shopId: json['id'] as String,
        name: json['name'] as String? ?? 'Shop pickup',
        address: json['address'] as String? ?? '',
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}

class RiderTrackingLocation {
  const RiderTrackingLocation({
    required this.riderLat,
    required this.riderLng,
    required this.updatedAt,
    this.dropoffLat,
    this.dropoffLng,
  });

  final double riderLat;
  final double riderLng;
  final DateTime updatedAt;
  final double? dropoffLat;
  final double? dropoffLng;
}
