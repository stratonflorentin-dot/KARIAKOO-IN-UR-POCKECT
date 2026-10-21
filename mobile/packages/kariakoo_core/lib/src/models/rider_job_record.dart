class RiderJobRecord {
  const RiderJobRecord({
    required this.orderId,
    required this.reference,
    required this.status,
    required this.payoutTzs,
    required this.updatedAt,
  });

  final String orderId;
  final String reference;
  final String status;
  final int payoutTzs;
  final DateTime updatedAt;

  bool get paid => status == 'DELIVERED';

  factory RiderJobRecord.fromJson(Map<String, dynamic> json) => RiderJobRecord(
        orderId: json['order_id'] as String,
        reference: json['reference'] as String? ??
            '#${(json['order_id'] as String).substring(0, 6)}',
        status: json['status'] as String,
        payoutTzs: (json['rider_payout_tzs'] as num?)?.toInt() ?? 0,
        updatedAt: DateTime.parse(json['updated_at'] as String).toLocal(),
      );
}
