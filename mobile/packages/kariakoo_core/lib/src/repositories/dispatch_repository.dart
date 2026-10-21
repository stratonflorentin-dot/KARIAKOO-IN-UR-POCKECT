import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/delivery_offer.dart';
import '../models/rider_delivery.dart';
import '../models/rider_job_record.dart';
import '../supabase/supabase_init.dart';

/// Wraps the Phase 6 rider-dispatch RPCs and reads. Riders only ever change
/// state through these SECURITY DEFINER functions — the tables have no write
/// policies — so the server enforces the state machine.
class DispatchRepository {
  const DispatchRepository();

  /// Go online/offline and (optionally) report the rider's real GPS fix.
  Future<void> setPresence(
      {required bool online, double? lng, double? lat}) async {
    await supabase.rpc('rider_set_presence', params: {
      'p_online': online,
      'p_lng': lng,
      'p_lat': lat,
    });
  }

  /// Update GPS for an already-online rider without running job dispatch.
  Future<void> updateLocation(
      {required double lat, required double lng}) async {
    await supabase.rpc('rider_update_location', params: {
      'p_lat': lat,
      'p_lng': lng,
    });
  }

  /// The caller's live offers (RLS already scopes to this rider).
  Future<List<DeliveryOffer>> myOffers() async {
    // This also recovers orders that were placed while this rider was offline
    // and requeues offers that expired without being accepted.
    await supabase.rpc('rider_refresh_offers');
    final rows = await supabase
        .from('delivery_offers')
        .select('id,order_id,rider_id,payout_tzs,status,offered_at,expires_at')
        .eq('status', 'pending')
        .gt('expires_at', DateTime.now().toUtc().toIso8601String())
        .order('offered_at', ascending: false);
    return (rows as List)
        .map((e) => DeliveryOffer.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<String> acceptOffer(String orderId) async {
    final res =
        await supabase.rpc('rider_accept_offer', params: {'p_order': orderId});
    return res is String ? res : 'ACCEPTED';
  }

  Future<void> declineOffer(String orderId) async {
    await supabase.rpc('rider_decline_offer', params: {'p_order': orderId});
  }

  /// Move an accepted job forward: PICKED_UP or IN_TRANSIT.
  Future<String> advance(String orderId, String to) async {
    final res = await supabase.rpc('rider_advance_delivery',
        params: {'p_order': orderId, 'p_to': to});
    return res is String ? res : to;
  }

  /// Finish an in-transit delivery by entering the customer's PIN.
  Future<String> completeDelivery(String orderId, String pin) async {
    final res = await supabase.rpc('rider_complete_delivery',
        params: {'p_order': orderId, 'p_pin': pin});
    return res is String ? res : 'DELIVERED';
  }

  /// The rider's current in-progress delivery, if any.
  Future<RiderDelivery?> activeDelivery(String riderId) async {
    final rows = await supabase
        .from('deliveries')
        .select('order_id,rider_id,status,rider_payout_tzs')
        .eq('rider_id', riderId)
        .inFilter('status', ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']).limit(1);
    final list = rows as List;
    if (list.isEmpty) return null;

    final delivery = Map<String, dynamic>.from(list.first as Map);
    final orderId = delivery['order_id'] as String;

    try {
      final order = await supabase
          .from('orders')
          .select('address')
          .eq('id', orderId)
          .maybeSingle();
      delivery['dropoff_address'] = order?['address'] as String? ?? '';
    } catch (_) {
      delivery['dropoff_address'] = '';
    }

    try {
      final itemRows = await supabase
          .from('order_items')
          .select('shop_id')
          .eq('order_id', orderId);
      final shopIds = (itemRows as List)
          .map((row) => (row as Map<String, dynamic>)['shop_id'] as String)
          .toSet()
          .toList();
      if (shopIds.isNotEmpty) {
        final shopRows = await supabase
            .from('shops')
            .select('id,name,address,lat,lng')
            .inFilter('id', shopIds);
        delivery['pickups'] = shopRows;
      }
    } catch (_) {
      delivery['pickups'] = const [];
    }

    // Drop-off coordinates are visible to the assigned rider under RLS. Keep
    // the delivery usable if the optional location migration isn't deployed.
    try {
      final location = await supabase
          .from('order_dropoff_locations')
          .select('lat,lng')
          .eq('order_id', orderId)
          .maybeSingle();
      if (location != null) {
        delivery['dropoff_lat'] = location['lat'];
        delivery['dropoff_lng'] = location['lng'];
      }
    } catch (_) {
      // Orders without a shared GPS pin still use their written address.
    }
    return RiderDelivery.fromJson(delivery);
  }

  /// The rider's own delivery history. RLS scopes this to [riderId], and the
  /// explicit select avoids exposing the delivery PIN hash.
  Future<List<RiderJobRecord>> jobHistory(String riderId) async {
    final rows = await supabase
        .from('deliveries')
        .select('order_id,status,rider_payout_tzs,updated_at')
        .eq('rider_id', riderId)
        .order('updated_at', ascending: false);
    final deliveries = (rows as List)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    if (deliveries.isEmpty) return const [];

    final orderIds =
        deliveries.map((row) => row['order_id'] as String).toList();
    final orders = await supabase
        .from('orders')
        .select('id,reference')
        .inFilter('id', orderIds);
    final references = {
      for (final row in orders as List)
        (row as Map<String, dynamic>)['id'] as String:
            row['reference'] as String,
    };
    return deliveries
        .map((row) => RiderJobRecord.fromJson({
              ...row,
              'reference': references[row['order_id']],
            }))
        .toList();
  }
}

final dispatchRepositoryProvider =
    Provider<DispatchRepository>((ref) => const DispatchRepository());

final myOffersProvider = FutureProvider.autoDispose<List<DeliveryOffer>>((ref) {
  return ref.read(dispatchRepositoryProvider).myOffers();
});

final activeDeliveryProvider =
    FutureProvider.autoDispose.family<RiderDelivery?, String>((ref, riderId) {
  return ref.read(dispatchRepositoryProvider).activeDelivery(riderId);
});

final riderJobHistoryProvider = FutureProvider.autoDispose
    .family<List<RiderJobRecord>, String>((ref, riderId) {
  return ref.read(dispatchRepositoryProvider).jobHistory(riderId);
});
