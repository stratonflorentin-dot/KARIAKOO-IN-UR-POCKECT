/// A job offered to a rider (mirrors the delivery_offers table).
class DeliveryOffer {
  const DeliveryOffer({
    required this.id,
    required this.orderId,
    required this.riderId,
    required this.payoutTzs,
    required this.status,
    required this.offeredAt,
    required this.expiresAt,
  });

  final String id;
  final String orderId;
  final String riderId;
  final int payoutTzs;
  final String status; // pending | accepted | declined | expired | cancelled
  final DateTime offeredAt;
  final DateTime expiresAt;

  bool get isLive => status == 'pending' && expiresAt.isAfter(DateTime.now());
  Duration get timeLeft => expiresAt.difference(DateTime.now());

  factory DeliveryOffer.fromJson(Map<String, dynamic> json) => DeliveryOffer(
        id: json['id'] as String,
        orderId: json['order_id'] as String,
        riderId: json['rider_id'] as String,
        payoutTzs: (json['payout_tzs'] as num).toInt(),
        status: json['status'] as String,
        offeredAt: DateTime.parse(json['offered_at'] as String),
        expiresAt: DateTime.parse(json['expires_at'] as String),
      );
}
