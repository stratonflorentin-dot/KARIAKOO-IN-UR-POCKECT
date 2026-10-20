class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.reference,
    required this.status,
    required this.paymentStatus,
    required this.deliveryFeeTzs,
    required this.createdAt,
  });

  final String id;
  final String reference;
  final String status; // placed | confirmed | preparing | out_for_delivery | delivered | cancelled
  final String paymentStatus; // pending | successful | failed | refunded
  final int deliveryFeeTzs;
  final DateTime createdAt;

  factory OrderSummary.fromJson(Map<String, dynamic> j) => OrderSummary(
        id: j['id'] as String,
        reference: j['reference'] as String,
        status: j['status'] as String? ?? 'placed',
        paymentStatus: j['payment_status'] as String? ?? 'pending',
        deliveryFeeTzs: (j['delivery_fee_tzs'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
      );
}

class OrderItemLine {
  const OrderItemLine({
    required this.productName,
    required this.shopId,
    required this.unitPriceTzs,
    required this.quantity,
  });

  final String productName;
  final String shopId;
  final int unitPriceTzs;
  final int quantity;

  int get lineTotalTzs => unitPriceTzs * quantity;

  factory OrderItemLine.fromJson(Map<String, dynamic> j) => OrderItemLine(
        productName: j['product_name'] as String,
        shopId: j['shop_id'] as String,
        unitPriceTzs: (j['unit_price_tzs'] as num).toInt(),
        quantity: (j['quantity'] as num).toInt(),
      );
}

class OrderDetail {
  const OrderDetail({
    required this.order,
    required this.items,
    required this.deliveryStatus,
    this.pin,
  });

  final OrderSummary order;
  final List<OrderItemLine> items;
  final String deliveryStatus;
  final String? pin;

  int get merchandiseTzs => items.fold(0, (s, i) => s + i.lineTotalTzs);
  int get totalTzs => merchandiseTzs + order.deliveryFeeTzs;
}
