/// A seller-scoped order row returned by `seller_order_feed`.
class SellerOrder {
  const SellerOrder({
    required this.orderId,
    required this.reference,
    required this.placedAt,
    required this.paymentStatus,
    required this.zone,
    required this.deliveryStatus,
    required this.fulfillmentStatus,
    required this.settlementStatus,
    required this.items,
    required this.merchandiseTzs,
    required this.commissionTzs,
  });

  final String orderId;
  final String reference;
  final DateTime placedAt;
  final String paymentStatus;
  final String zone;
  final String? deliveryStatus;
  final String fulfillmentStatus;
  final String settlementStatus;
  final List<SellerOrderItem> items;
  final int merchandiseTzs;
  final int commissionTzs;

  int get expectedPayoutTzs => merchandiseTzs - commissionTzs;

  factory SellerOrder.fromJson(Map<String, dynamic> json) => SellerOrder(
        orderId: json['order_id'] as String,
        reference: json['reference'] as String,
        placedAt: DateTime.parse(json['placed_at'] as String).toLocal(),
        paymentStatus: json['payment_status'] as String,
        zone: json['zone'] as String,
        deliveryStatus: json['delivery_status'] as String?,
        fulfillmentStatus: json['fulfillment_status'] as String,
        settlementStatus: json['settlement_status'] as String,
        items: ((json['items'] as List?) ?? const [])
            .map((item) => SellerOrderItem.fromJson(
                Map<String, dynamic>.from(item as Map)))
            .toList(),
        merchandiseTzs: (json['merchandise_tzs'] as num?)?.toInt() ?? 0,
        commissionTzs: (json['commission_tzs'] as num?)?.toInt() ?? 0,
      );
}

class SellerOrderItem {
  const SellerOrderItem({
    required this.productName,
    required this.unitPriceTzs,
    required this.quantity,
  });

  final String productName;
  final int unitPriceTzs;
  final int quantity;

  int get totalTzs => unitPriceTzs * quantity;

  factory SellerOrderItem.fromJson(Map<String, dynamic> json) =>
      SellerOrderItem(
        productName: json['productName'] as String? ?? 'Product',
        unitPriceTzs: (json['unitPriceTzs'] as num?)?.toInt() ?? 0,
        quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      );
}
