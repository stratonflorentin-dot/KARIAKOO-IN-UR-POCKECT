import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/order.dart';
import '../models/rider_delivery.dart';
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

  /// Attach a customer's explicitly shared GPS pin to an order. The database
  /// RPC validates ownership and keeps the coordinate private to that customer
  /// and the rider assigned to the order.
  Future<void> setOrderDropoffLocation({
    required String orderId,
    required double lat,
    required double lng,
  }) async {
    await supabase.rpc('customer_set_order_dropoff_location', params: {
      'p_order_id': orderId,
      'p_lat': lat,
      'p_lng': lng,
    });
  }

  /// Fresh location for the rider assigned to a customer's active order.
  Future<RiderTrackingLocation?> riderLocationForOrder(String orderId) async {
    final rows = await supabase.rpc('customer_get_order_rider_location',
        params: {'p_order_id': orderId});
    final list = rows as List;
    if (list.isEmpty) return null;
    final rider = Map<String, dynamic>.from(list.first as Map);

    double? dropoffLat;
    double? dropoffLng;
    try {
      final dropoff = await supabase
          .from('order_dropoff_locations')
          .select('lat,lng')
          .eq('order_id', orderId)
          .maybeSingle();
      dropoffLat = (dropoff?['lat'] as num?)?.toDouble();
      dropoffLng = (dropoff?['lng'] as num?)?.toDouble();
    } catch (_) {
      // The live rider marker still works when the order has no GPS pin.
    }

    return RiderTrackingLocation(
      riderLat: (rider['lat'] as num).toDouble(),
      riderLng: (rider['lng'] as num).toDouble(),
      updatedAt: DateTime.parse(rider['updated_at'] as String).toLocal(),
      dropoffLat: dropoffLat,
      dropoffLng: dropoffLng,
    );
  }

  Future<List<OrderSummary>> myOrders() async {
    final rows = await supabase
        .from('orders')
        .select(
            'id,reference,status,payment_status,delivery_fee_tzs,created_at')
        .order('created_at', ascending: false);
    return (rows as List)
        .map((e) => OrderSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<OrderDetail?> orderDetail(String orderId) async {
    final orderRows = await supabase
        .from('orders')
        .select(
            'id,reference,status,payment_status,delivery_fee_tzs,created_at')
        .eq('id', orderId)
        .limit(1);
    final orderList = orderRows as List;
    if (orderList.isEmpty) return null;

    final results = await Future.wait([
      supabase
          .from('order_items')
          .select('product_name,shop_id,unit_price_tzs,quantity')
          .eq('order_id', orderId),
      supabase
          .from('deliveries')
          .select('status')
          .eq('order_id', orderId)
          .limit(1),
      supabase
          .from('delivery_pins')
          .select('pin')
          .eq('order_id', orderId)
          .limit(1),
    ]);
    final itemRows = results[0] as List;
    final deliveryRows = results[1] as List;
    final pinRows = results[2] as List;

    return OrderDetail(
      order: OrderSummary.fromJson(orderList.first as Map<String, dynamic>),
      items: itemRows
          .map((e) => OrderItemLine.fromJson(e as Map<String, dynamic>))
          .toList(),
      deliveryStatus: deliveryRows.isNotEmpty
          ? (deliveryRows.first['status'] as String? ?? 'PENDING_ASSIGNMENT')
          : 'PENDING_ASSIGNMENT',
      pin: pinRows.isNotEmpty ? pinRows.first['pin'] as String? : null,
    );
  }
}

final ordersRepositoryProvider =
    Provider<OrdersRepository>((ref) => const OrdersRepository());

final myOrdersProvider = FutureProvider.autoDispose<List<OrderSummary>>((ref) {
  return ref.read(ordersRepositoryProvider).myOrders();
});

final orderDetailProvider =
    FutureProvider.autoDispose.family<OrderDetail?, String>((ref, id) {
  return ref.read(ordersRepositoryProvider).orderDetail(id);
});

final riderLocationForOrderProvider = FutureProvider.autoDispose
    .family<RiderTrackingLocation?, String>((ref, orderId) {
  return ref.read(ordersRepositoryProvider).riderLocationForOrder(orderId);
});
