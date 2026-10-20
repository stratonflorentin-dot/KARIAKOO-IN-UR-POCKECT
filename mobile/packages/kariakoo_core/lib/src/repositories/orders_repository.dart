import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/order.dart';
import '../supabase/supabase_init.dart';

/// Customer order reads and the place_order write. The server computes all
/// prices; the client only sends product ids + quantities.
class OrdersRepository {
  const OrdersRepository();

  /// Create an order. [items] is a list of { 'product_id': id, 'quantity': n }.
  /// Returns the server's result: order_id, reference, total_tzs, pin.
  Future<Map<String, dynamic>> placeOrder({
    required List<Map<String, dynamic>> items,
    required String zone,
    required String address,
    required String paymentMethod,
    required String idempotencyKey,
    String instructions = '',
  }) async {
    final res = await supabase.rpc('place_order', params: {
      'p_items': items,
      'p_zone': zone,
      'p_address': address,
      'p_payment_method': paymentMethod,
      'p_idempotency_key': idempotencyKey,
      'p_instructions': instructions,
    });
    return Map<String, dynamic>.from(res as Map);
  }

  Future<List<OrderSummary>> myOrders() async {
    final rows = await supabase
        .from('orders')
        .select('id,reference,status,payment_status,delivery_fee_tzs,created_at')
        .order('created_at', ascending: false);
    return (rows as List).map((e) => OrderSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<OrderDetail?> orderDetail(String orderId) async {
    final orderRows = await supabase
        .from('orders')
        .select('id,reference,status,payment_status,delivery_fee_tzs,created_at')
        .eq('id', orderId)
        .limit(1);
    final orderList = orderRows as List;
    if (orderList.isEmpty) return null;

    final results = await Future.wait([
      supabase.from('order_items').select('product_name,shop_id,unit_price_tzs,quantity').eq('order_id', orderId),
      supabase.from('deliveries').select('status').eq('order_id', orderId).limit(1),
      supabase.from('delivery_pins').select('pin').eq('order_id', orderId).limit(1),
    ]);
    final itemRows = results[0] as List;
    final deliveryRows = results[1] as List;
    final pinRows = results[2] as List;

    return OrderDetail(
      order: OrderSummary.fromJson(orderList.first as Map<String, dynamic>),
      items: itemRows.map((e) => OrderItemLine.fromJson(e as Map<String, dynamic>)).toList(),
      deliveryStatus: deliveryRows.isNotEmpty ? (deliveryRows.first['status'] as String? ?? 'PENDING_ASSIGNMENT') : 'PENDING_ASSIGNMENT',
      pin: pinRows.isNotEmpty ? pinRows.first['pin'] as String? : null,
    );
  }
}

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) => const OrdersRepository());

final myOrdersProvider = FutureProvider.autoDispose<List<OrderSummary>>((ref) {
  return ref.read(ordersRepositoryProvider).myOrders();
});

final orderDetailProvider =
    FutureProvider.autoDispose.family<OrderDetail?, String>((ref, id) {
  return ref.read(ordersRepositoryProvider).orderDetail(id);
});
