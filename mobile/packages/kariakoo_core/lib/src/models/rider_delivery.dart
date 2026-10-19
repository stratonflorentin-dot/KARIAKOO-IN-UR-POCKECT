/// A rider's delivery (the readable columns of the deliveries table — the PIN
/// hash is never exposed to clients).
class RiderDelivery {
  const RiderDelivery({
    required this.orderId,
    required this.status,
    required this.riderPayoutTzs,
    this.riderId,
  });

  final String orderId;
  final String status; // PENDING_ASSIGNMENT | ASSIGNED | ACCEPTED | PICKED_UP | IN_TRANSIT | DELIVERED | FAILED | CANCELLED
  final int riderPayoutTzs;
  final String? riderId;

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
      );
}
